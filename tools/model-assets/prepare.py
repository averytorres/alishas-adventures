"""Run with Blender: blender -b --python prepare.py -- INPUT.glb OUTPUT.glb [quality]"""
import bpy
import sys
from pathlib import Path

argv = sys.argv[sys.argv.index('--') + 1:]
if len(argv) < 2:
    raise SystemExit('usage: prepare.py INPUT.glb OUTPUT.glb [webp-quality 1..100]')
source, target = map(Path, argv[:2])
quality = int(argv[2]) if len(argv) > 2 else 92
if not source.is_file() or source.resolve() == target.resolve() or not 1 <= quality <= 100:
    raise SystemExit('invalid input, output, or quality')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
actions = sorted(a.name for a in bpy.data.actions)
if not actions:
    raise SystemExit('input has no animations; use a rigged animated source')
target.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(target), export_format='GLB', export_animations=True,
    export_animation_mode='ACTIONS', export_skins=True,
    export_image_format='WEBP', export_image_quality=quality,
    export_apply=False,
)
print('PREPARED', target, target.stat().st_size, 'bytes', len(actions), 'source clips', flush=True)
