# Developer setup and project guide

Alisha's Adventures is an offline, portrait Android storybook built with HTML, CSS, JavaScript, and a Java Android wrapper. This guide is for contributors; the [main page](README.md) introduces the game to families.

## Get the project

Install Git LFS before cloning the repository. The models, recordings, and large source images are stored with Git LFS.

```powershell
git lfs install
git clone https://github.com/averytorres/alishas-adventures.git
cd alishas-adventures
git lfs pull
```

## Preview on Windows

Install Node.js, then run this from the project root:

```powershell
node v2/dev-server.mjs
```

Open <http://127.0.0.1:4173/v2/>. Use a narrow browser window to inspect the portrait layout. Opening `v2/index.html` directly does not load its story and audio files.

The committed 3D runtime bundles work without installing Node packages. If you change their source, run:

```powershell
npm ci
npm run build:3d
npm run verify:3d
```

## Check changes

Run the repository hygiene check and route checker:

```powershell
node tools/check-repository.mjs
node production/check-route.mjs
```

Run the automated tests after code or story changes. The route checker covers one route; it does not replace testing every branch or checking artwork and motion on a phone. See the [app notes](v2/README.md) for the test commands and further details.

## Build for Android

Install a JDK, Android SDK platform 35, and Android SDK build-tools 36.0.0. Set `JAVA_HOME` and `ANDROID_SDK_ROOT` (or `ANDROID_HOME`), then run:

```powershell
.\build-android.ps1
```

You can instead pass `-Jdk` and `-Sdk` paths to the script. This produces a debug-signed development APK, not a store release. Test the exact build on an Android device before reporting phone behavior.

The local `android/debug.keystore` is excluded from Git. A new debug key cannot update an existing installation signed with a different key. Transfer the existing key securely outside this repository when in-place development updates are needed; use a separate protected release key for publication. Build output, local credentials, and APKs are also excluded from Git.

## Project content

The story, locale, art, motion, and audio manifests are in `story/` and `audio/`; artwork is in `assets/`. The app code is in `v2/`. For optional Blender preparation and model conversion, see the [model asset notes](tools/model-assets/README.md).
