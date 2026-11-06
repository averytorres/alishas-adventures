"""Temporary, original 3D storybook princess animation test for Alisha's Adventures."""
import bpy
import math
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, roughness=0.8, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    return m

skin = mat('warm skin', (.81,.46,.30))
skin_shadow = mat('warm skin shadow', (.78,.43,.34))
blush = mat('cheek blush', (.94,.40,.39))
hair = mat('auburn hair', (.36,.065,.022), .54)
hair_light = mat('copper hair highlights', (.60,.14,.037), .55)
hair_dark = mat('auburn hair depth', (.18,.026,.012), .65)
blue = mat('starry royal blue dress', (.025,.10,.42), .58)
blue_light = mat('blue dress panels', (.085,.24,.67), .65)
blue_dark = mat('bodice blue', (.018,.055,.25), .55)
gold = mat('warm gold embroidery', (.95,.70,.24), .34, .28)
gold_light = mat('starlight', (1,.88,.50), .26, .15)
eye_white = mat('eye whites', (.98,.95,.88))
iris = mat('blue irises', (.08,.50,.77), .36)
pupil = mat('pupils', (.025,.045,.10), .3)
lip = mat('rose lips', (.68,.20,.25), .6)
mouth_dark = mat('open mouth', (.17,.035,.065), .85)
shoe = mat('blue shoes', (.17,.32,.73), .36)

def sphere(name, loc, scale, material, parent=None, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o = bpy.context.object; o.name = name
    o.scale = scale
    o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth = True
    if parent: parent_keep(o, parent)
    return o

def parent_keep(obj, parent):
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world

def pivot(name, loc, parent=None):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.location = loc
    if parent: parent_keep(o, parent)
    return o

def tube(name, pts, radius, material, parent=None, bevel=3):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts)-1)
    for bp, pt in zip(sp.bezier_points, pts):
        bp.co = pt; bp.handle_left_type = 'AUTO'; bp.handle_right_type = 'AUTO'
    cu.bevel_depth = radius; cu.bevel_resolution = bevel
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    if parent: parent_keep(o, parent)
    return o

def line_between(name, a, b, radius, material, parent=None):
    mid = (Vector(a)+Vector(b))*0.5
    vec = Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=radius*.88, radius2=radius,
                                    depth=vec.length, location=mid)
    o=bpy.context.object; o.name=name
    o.rotation_euler=vec.to_track_quat('Z','Y').to_euler()
    o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth=True
    if parent: parent_keep(o,parent)
    return o

def star(name, center, radius, material, parent=None):
    x,y,z=center
    verts=[]
    for i in range(10):
        a=math.pi/2+i*math.pi/5
        r=radius if i%2==0 else radius*.38
        verts.append((x+math.cos(a)*r,y,z+math.sin(a)*r))
    verts.append((x,y-.025,z))
    faces=[(10,i,(i+1)%10) for i in range(10)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    if parent: parent_keep(o,parent)
    return o

root = pivot('whole character / idle control', (0,0,0))
# Layered gown: actual 3D geometry rather than a flat image.
def skirt_layer(name, top, bottom, rtop, rbottom, material, phase=0, parent=root):
    verts=[]; n=64; levels=7
    for j in range(levels):
        t=j/(levels-1)
        z=top+(bottom-top)*t
        r=rtop+(rbottom-rtop)*(t**.78)
        for i in range(n):
            a=2*math.pi*i/n
            ripple=(.025+.06*t)*math.sin(8*a+phase)+(t*.023)*math.sin(16*a)
            verts.append(((r+ripple)*math.cos(a), (r+ripple)*math.sin(a),z+.018*math.sin(10*a+phase)*t))
    faces=[]
    for j in range(levels-1):
        for i in range(n):
            k=j*n+i; q=j*n+(i+1)%n
            faces.append((k,q,q+n,k+n))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    parent_keep(o,parent)
    return o

skirt_layer('full flowing outer skirt',2.52,.48,.30,1.37,blue)
skirt_layer('pale blue underskirt',1.85,.40,.42,1.40,blue_light,1.3)
skirt_layer('front embroidered panel',2.52,.55,.20,1.17,blue,2.1)
# Hem arcs across visible front of dress.
for z,r in ((.51,1.37),(.66,1.30)):
    pts=[(r*math.cos(a),-r*.70,z+.045*math.sin(8*a)) for a in [math.pi*.04+i*math.pi*.92/16 for i in range(17)]]
    tube('gold hem detail',pts,.014,gold,root)

sphere('waist sash', (0,-.02,2.60),(.39,.31,.11),gold,root)
sphere('bodice', (0,0,3.04),(.47,.33,.65),blue_dark,root)
sphere('bodice center', (0,-.28,3.04),(.35,.13,.56),blue,root)
for side in (-1,1):
    tube('gold bodice trim',[(side*.24,-.33,3.55),(side*.18,-.40,3.18),(side*.06,-.41,2.67)],.015,gold,root)
star('waist star',(0,-.42,2.62),.16,gold_light,root)
for x,z,r in [(-.38,1.65,.055),(.52,1.18,.07),(-.72,.75,.075),(.27,.69,.052),(.62,1.82,.045)]:
    star('dress star',(x,-.97,z),r,gold_light,root)

line_between('slender neck',(0,0,3.64),(0,0,4.30),.15,skin,root)
head=pivot('head turn and nod',(0,0,4.16),root)
sphere('face',(0,-.015,4.66),(.52,.40,.58),skin,head)
sphere('chin',(0,-.13,4.29),(.33,.28,.20),skin,head)
sphere('nose',(0,-.44,4.57),(.050,.055,.085),skin,head)
for s in (-1,1):
    sphere('soft cheek', (s*.33,-.345,4.39),(.085,.012,.038),blush,head)
    sphere('ear',(s*.50,0,4.57),(.07,.07,.12),skin,head)

# Both eyes are grouped so the blink affects every element of each eye.
eyes=[]
for s in (-1,1):
    ep=pivot(('left' if s<0 else 'right')+' eye blink',(s*.21,-.37,4.81),head); eyes.append(ep)
    sphere('eye white',(s*.21,-.383,4.81),(.132,.047,.092),eye_white,ep)
    sphere('iris',(s*.21,-.423,4.81),(.070,.018,.073),iris,ep)
    sphere('pupil',(s*.21,-.441,4.81),(.034,.010,.048),pupil,ep)
    sphere('eye glint',(s*.230,-.453,4.839),(.014,.006,.018),eye_white,ep)
    tube('upper lash',[(s*.09,-.425,4.885),(s*.21,-.445,4.91),(s*.34,-.405,4.885)],.011,hair_dark,head)
    tube('eyebrow',[(s*.09,-.385,4.98),(s*.21,-.405,5.02),(s*.32,-.37,4.99)],.017,hair,head)

# Mouth is curved 3D geometry. Its visible opening changes width and height.
mouth=pivot('mouth width and opening',(0,-.438,4.35),head)
sphere('dark mouth opening',(0,-.465,4.35),(.115,.016,.038),mouth_dark,mouth)
tube('upper lip',[(-.14,-.48,4.37),(0,-.50,4.385),(.14,-.48,4.37)],.017,lip,mouth)
tube('lower lip',[(-.12,-.48,4.335),(0,-.49,4.315),(.12,-.48,4.335)],.014,lip,mouth)

# Hair is real tubes around the head with two long wavy side sections.
sphere('back hair mass',(0,.19,4.76),(.58,.40,.62),hair_dark,head)
sphere('hair crown',(0,.08,5.10),(.57,.38,.29),hair,head)
for s in (-1,1):
    sphere('side hair volume',(s*.46,.09,4.70),(.22,.33,.47),hair,head)
    sphere('flowing side hair',(s*.62,.19,4.18),(.26,.25,.66),hair,head)
    for j in range(5):
        x=s*(.46+j*.095)
        y=.07+j*.045
        pts=[]
        for k in range(8):
            z=5.08-k*.25
            pts.append((x+s*.08*math.sin(k*1.35+j*.7),y+.07*math.cos(k*.9+j),z))
        tube('flowing copper curl',pts,.058-j*.004,hair_light if j%3==0 else hair,head)
    tube('front framing curl',[(s*.32,-.32,5.25),(s*.48,-.36,5.06),(s*.53,-.37,4.84),(s*.48,-.37,4.67)],.060,hair_light,head)
    sphere('puff sleeve',(s*.64,.02,3.51),(.32,.30,.30),blue_light,root)

# A small tiara and star keep the character tied to her illustrated design.
tube('tiara band',[(-.46,-.31,5.23),(-.25,-.43,5.40),(0,-.45,5.48),(.25,-.43,5.40),(.46,-.31,5.23)],.024,gold,head)
for x,z in [(-.27,5.46),(0,5.62),(.27,5.46)]:
    star('tiara star',(x,-.44,z),.09 if x==0 else .055,gold_light,head)

arms=[]
for s in (-1,1):
    sh=pivot(('left' if s<0 else 'right')+' shoulder gesture',(s*.72,0,3.51),root)
    arms.append(sh)
    a=(s*.72,-.02,3.47); elbow=(s*.98,-.015,2.99); wrist=(s*1.36,-.12,3.08)
    line_between('upper arm',a,elbow,.115,skin,sh)
    sphere('elbow',elbow,(.105,.10,.105),skin,sh)
    line_between('forearm',elbow,wrist,.09,skin,sh)
    palm=(s*1.48,-.14,3.10)
    sphere('hand',palm,(.17,.067,.085),skin,sh)
    for i in range(4):
        start=(s*(1.54+i*.027),-.17,3.13-i*.018)
        end=(s*(1.68+i*.027),-.18,3.15-i*.04)
        line_between('individual finger',start,end,.020,skin,sh)
    line_between('thumb',(s*1.41,-.20,3.10),(s*1.47,-.21,2.99),.025,skin,sh)

for s in (-1,1):
    sphere('ankle',(s*.23,-.06,.49),(.10,.12,.25),skin,root)
    sphere('storybook slipper',(s*.23,-.20,.31),(.21,.34,.12),shoe,root)
    star('shoe star',(s*.23,-.50,.34),.045,gold_light,root)

def keys(obj, prop, values):
    for frame, value in values:
        setattr(obj, prop, value)
        obj.keyframe_insert(data_path=prop,frame=frame)

# A 4-second sequence: idle, both-eye blink, several mouth shapes, then wave.
keys(root,'rotation_euler',[(1,(0,0,-.015)),(24,(0,0,.018)),(48,(0,0,-.015)),(72,(0,0,.018)),(96,(0,0,-.015))])
keys(head,'rotation_euler',[(1,(0,0,0)),(24,(0,0,.035)),(48,(0,0,-.025)),(72,(0,0,.025)),(96,(0,0,0))])
for eye in eyes:
    keys(eye,'scale',[(1,(1,1,1)),(34,(1,1,1)),(37,(1,1,.08)),(40,(1,1,.08)),(43,(1,1,1)),(84,(1,1,1)),(87,(1,1,.08)),(90,(1,1,1))])
keys(mouth,'scale',[(1,(1,1,1)),(47,(1,1,1)),(50,(.72,1,2.3)),(56,(1.25,1,1.6)),(62,(.68,1,2.6)),(68,(1.2,1,1.25)),(74,(.85,1,2.1)),(80,(1,1,1)),(96,(1,1,1))])
# Screen-right arm waves using a shoulder pivot; the screen-left arm rests.
keys(arms[1],'rotation_euler',[(1,(0,0,0)),(68,(0,0,0)),(77,(0,-.80,0)),(84,(0,-.68,0)),(90,(0,-.88,0)),(96,(0,-.72,0))])

world=bpy.data.worlds.new('lavender studio'); bpy.context.scene.world=world
world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.42,.38,.57,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.32
back=mat('plain plum background',(.18,.15,.30))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,2,2.5),rotation=(math.pi/2,0,0))
bpy.context.object.name='plain backdrop'; bpy.context.object.data.materials.append(back)
def area(name, loc, power, color, size):
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.color=color; data.shape='DISK'; data.size=size
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.location=loc
    obj.rotation_euler=(Vector((0,0,3))-obj.location).to_track_quat('-Z','Y').to_euler()
area('soft key',(-3,-5,7),480,(1,.88,.74),5)
area('cool fill',(3,-4,5),300,(.72,.78,1),5)
area('hair rim',(1,3,6),520,(1,.72,.50),3)

cam_data=bpy.data.cameras.new('portrait camera')
cam=bpy.data.objects.new('portrait camera',cam_data); bpy.context.collection.objects.link(cam)
cam.location=(0,-12,3.0); cam.rotation_euler=(Vector((0,0,2.90))-cam.location).to_track_quat('-Z','Y').to_euler()
cam_data.type='ORTHO'; cam_data.ortho_scale=6.65
bpy.context.scene.camera=cam
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=540; scene.render.resolution_y=810; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.frame_start=1; scene.frame_end=96; scene.render.fps=24
scene.view_settings.view_transform='Standard'
scene.view_settings.exposure=-.35
scene.render.filepath=str(ROOT/'preview'/'frame_')
(ROOT/'preview').mkdir(exist_ok=True)

# Save a reusable, editable scene and four decisive frames.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'storybook_princess_TEMP.blend'))
for label,frame in [('idle',16),('blink',39),('talk',61),('wave',90)]:
    scene.frame_set(frame)
    scene.render.filepath=str(ROOT/'preview'/f'{label}.png')
    bpy.ops.render.render(write_still=True)
print('Created editable 3D model and four rendered previews in',ROOT)
