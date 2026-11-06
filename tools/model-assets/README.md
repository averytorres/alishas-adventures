# CYOA model asset preparation pilot

This folder is independent of the CYOA project. `prepare.py` imports an animated Meshy GLB with Blender 5, exports a direct GLB, keeps all animation actions and the original geometry, and converts embedded textures to WebP at quality 92 by default. It does not decimate, remove materials, or alter the original file. `validate.mjs` compares clips, skin, triangle count, embedded image types, and file size.

PowerShell example from the CYOA project folder, with Blender available on `PATH`:

```powershell
New-Item -ItemType Directory -Force work | Out-Null
$source = 'model-source\Meshy_AI_Turquoise_Wanderer_20261105_animated_mixamo_All_animation.glb'
$prepared = 'work\adventurer-webp.glb'
blender -b -t 4 --python 'tools\model-assets\prepare.py' -- $source $prepared 92
node 'tools\model-assets\validate.mjs' $source $prepared 'work\adventurer-report.json'
```

For another character, replace the input and output paths. Use only animated, rigged source files; an unanimated character is not a valid input. A file with a different rig may need a separate animation mapping in the game.

The output requires a viewer with `EXT_texture_webp` support. The current CYOA app uses a bundled Three.js GLTFLoader, but direct file loading, WebP extension behavior, visual appearance, and Android performance still require integration and phone tests. WebP reduces *download/package size*; it is not GPU native KTX2 compression and does not guarantee lower decoded texture memory. WebP quality 92 is lossy, so compare important face and costume details against the original before adoption. Keep the original Meshy GLB as the source of record.

The current V2 app loads direct GLBs from its character folders. This preparation tool writes a separate candidate GLB; it does not replace a runtime model or update the story stage automatically. Validate the candidate, review its appearance and animation, then integrate it separately.
