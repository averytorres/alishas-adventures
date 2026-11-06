# Alisha's Adventures

A portrait Android choose-your-own-adventure game. The active app is in `v2/`; the older root `index.html` is retained as a prototype. The first story, *Alisha and the Lost Star*, has English, Spanish, and Gujarati text and prerecorded narration.

## Set up on another Windows computer

1. Install Git LFS and run `git lfs install` before cloning. After cloning, run `git lfs pull` so the artwork, models, and recordings are present.
2. Install Node.js for the desktop preview and automated checks. The runtime uses bundled JavaScript and needs no package install to play. Run `npm ci` when you need to rebuild the 3D renderer from source.
3. From the project root, run `node v2/dev-server.mjs` and open <http://127.0.0.1:4173/v2/>.
4. To build Android, install a JDK and Android SDK platform 35 with build-tools 36.0.0. Set `JAVA_HOME` and `ANDROID_SDK_ROOT`, then run `./build-android.ps1` in PowerShell. You may pass `-Jdk` and `-Sdk` instead of setting environment variables.

See [v2/README.md](v2/README.md) for detailed preview and build checks. Blender is optional and only needed for model preparation; see [tools/model-assets/README.md](tools/model-assets/README.md).

## Before the first commit

Run `node tools/check-repository.mjs` and the automated tests. After `npm ci`, run `npm run verify:3d` to confirm that the checked-in 3D bundles match their source. The root `.gitignore` excludes build output, generated packages, local credentials, and the debug signing key. Do not force-add those files. The `.gitattributes` file stores large media through Git LFS.

The local `android/debug.keystore` is intentionally outside Git. A new computer can create a new debug key, but an APK signed with it cannot update an installed APK signed by the old key. Transfer the existing debug key securely outside the repository if in-place development updates are needed. Use a separate protected release key for any published app.

The runtime 3D modules are checked in alongside their editable source files. `package-lock.json` pins their build dependencies; use `npm run build:3d` after changing a stage source file.
