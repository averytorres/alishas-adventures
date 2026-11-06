import bpy
import sys
source = sys.argv[sys.argv.index('--')+1]
bpy.ops.import_scene.gltf(filepath=source)
print('ACTIONS', [a.name for a in bpy.data.actions], flush=True)
print('ARMATURES', [(o.name, o.animation_data.action.name if o.animation_data and o.animation_data.action else None, len(o.animation_data.nla_tracks) if o.animation_data else 0) for o in bpy.data.objects if o.type == 'ARMATURE'], flush=True)
rna = bpy.ops.export_scene.gltf.get_rna_type()
for p in rna.properties:
    if 'image' in p.identifier or 'animation_mode' in p.identifier:
        print('EXPORT_PROP', p.identifier, getattr(p, 'enum_items', None) and [(x.identifier, x.name) for x in p.enum_items], flush=True)
