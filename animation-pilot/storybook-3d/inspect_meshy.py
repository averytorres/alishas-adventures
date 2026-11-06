"""Read-only inspection and contact renders for the user's Meshy GLB."""
import bpy
import json
from mathutils import Vector
from pathlib import Path
import sys

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if not 1 <= len(args) <= 2:
    raise SystemExit('usage: blender -b --python inspect_meshy.py -- INPUT.glb [OUTPUT_DIR]')
source = Path(args[0]).expanduser().resolve()
if not source.is_file():
    raise SystemExit(f'GLB not found: {source}')
out = Path(args[1]).expanduser().resolve() if len(args) == 2 else Path(__file__).resolve().parent / 'meshy-preview'
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
objects = list(bpy.context.scene.objects)
meshes = [o for o in objects if o.type == 'MESH']
rigs = [o for o in objects if o.type == 'ARMATURE']
materials = sorted({m.name for o in meshes for m in o.data.materials if m})
textures = sorted({i.name for i in bpy.data.images if i.source not in ('GENERATED','VIEWER')})
tris = sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
points = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
lo = Vector((min(v[i] for v in points) for i in range(3)))
hi = Vector((max(v[i] for v in points) for i in range(3)))
center = (lo+hi)*.5
size = hi-lo
report = {
    'source': source.name,
    'mesh_count': len(meshes), 'triangle_count': tris,
    'armatures': [{'name': o.name,'bones': len(o.data.bones)} for o in rigs],
    'actions': [a.name for a in bpy.data.actions],
    'material_count': len(materials), 'materials': materials[:30],
    'textures': [{'name': i.name, 'width':i.size[0], 'height':i.size[1]} for i in bpy.data.images if i.source not in ('GENERATED','VIEWER')],
    'bounds_min': list(lo), 'bounds_max': list(hi), 'dimensions': list(size),
}
(out/'inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('MESHY_INSPECTION',json.dumps(report))

# The original GLB contains no texture; use neutral clay only for inspection.
clay=bpy.data.materials.new('temporary clay preview')
clay.diffuse_color=(.31,.29,.34,1)
clay.use_nodes=True
clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.31,.29,.34,1)
clay.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.84
for o in meshes:
    o.data.materials.clear()
    o.data.materials.append(clay)

world=bpy.data.worlds.new('neutral studio'); bpy.context.scene.world=world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.42,.41,.48,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.32
def light(name, location, power, color):
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=max(size)*1.8; data.color=color
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    obj.location=location; obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
light('key',center+Vector((-max(size)*1.3,-max(size)*2,max(size)*1.5)),380,(1,.90,.82))
light('fill',center+Vector((max(size)*1.7,-max(size),max(size))),230,(.8,.88,1))
cam_data=bpy.data.cameras.new('inspection orthographic camera');cam=bpy.data.objects.new('inspection orthographic camera',cam_data)
bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam
cam_data.type='ORTHO';cam_data.ortho_scale=max(size.x*1.45,size.y*1.45,size.z*1.35)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.view_settings.view_transform='Standard';scene.view_settings.exposure=-.5
dist=max(size)*2.7
views={'front':(0,-dist,0),'back':(0,dist,0),'side':(dist,0,0)}
for label,offset in views.items():
    cam.location=center+Vector(offset)+Vector((0,0,size.z*.08))
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(out/(label+'.png'))
    bpy.ops.render.render(write_still=True)
print('Rendered Meshy views in',out)
