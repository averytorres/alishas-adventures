# Alisha's Adventures V2 development build

Run these commands from the CYOA project folder. The desktop preview needs Node.js and uses only built-in Node modules:

```powershell
node v2/dev-server.mjs
```

Open <http://127.0.0.1:4173/v2/>. The preview server reads assets from this project folder; opening `v2/index.html` directly with `file://` cannot load its JSON and audio. The layout is designed for portrait screens, so use a narrow browser window to inspect it on desktop.

Check the story route and run the desktop tests:

```powershell
node production/check-route.mjs
node --test v2/*.test.mjs v2/shared-stage/*.test.mjs
```

The route checker follows the cloud-guide ending and verifies its mapped art, text hashes, and recordings. It does not certify every branch, localization, visual detail, or Android behavior. All 46 scenes have recorded English, Spanish, and Gujarati situation, choice, and hint lines. Two Gujarati situations use paragraph highlighting because their word timings need correction. Art, scripts, translations, and timing cues remain drafts requiring review.

## Android build

`build-android.ps1` builds V2 by default and produces `Alishas-Adventures-DRAFT.apk`. This script is for Windows PowerShell and requires a JDK, Android SDK platform 35, and Android SDK build-tools 36.0.0. Set `JAVA_HOME` and `ANDROID_SDK_ROOT` (or `ANDROID_HOME`), or pass their directories with `-Jdk` and `-Sdk`:

```powershell
.\build-android.ps1
# Or: .\build-android.ps1 -Sdk 'C:\path\to\Android\Sdk' -Jdk 'C:\path\to\jdk'
```

The APK is a debug-signed development build. Keep `android/debug.keystore` if an APK must update an earlier installation, or pass `-Keystore` to use an existing compatible debug key. A fresh key has a different signing identity. The old root-page prototype is available only with `-LegacyMvp`. A successful build and desktop preview do not establish behavior on a phone.

The build removes its temporary `android/build/<id>` directory after completion or failure. Use `-KeepBuildFiles` when you need those intermediate files for debugging. Existing old build directories are not removed automatically.

## Assets and source

The V2 app reads story, locale, art, motion, and audio manifests from `story/` and `audio/`, with artwork in `assets/`. Runtime 3D modules are bundled in `v2/shared-stage/` and the character folders; their source files are alongside them. The bundle is self-contained for offline use and does not require `npm install` to run. To rebuild the 3D bundles, run `npm ci` followed by `npm run build:3d`; `npm run verify:3d` compares the checked-in bundles with their source. For Blender model preparation, see `tools/model-assets/README.md`. Model conversion outputs are separate from the current runtime model bundle.
