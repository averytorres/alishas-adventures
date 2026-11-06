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

You can instead pass `-Jdk` and `-Sdk` paths to the script. This produces a development APK. For a versioned GitHub release build, pass `-Release`. Test the exact build on an Android device before reporting phone behavior.

The local `android/debug.keystore` is excluded from Git. The v0.1.0 release uses that original certificate so it can update installed copies while retaining saved progress. Back up the signing key securely: losing it prevents future in-place updates under this package name. A new key cannot update an installation signed with a different certificate. Build output, local credentials, and APKs are also excluded from Git.

## Project content

The story, locale, art, motion, and audio manifests are in `story/` and `audio/`; artwork is in `assets/`. The app code is in `v2/`. For optional Blender preparation and model conversion, see the [model asset notes](tools/model-assets/README.md).

## Code map

The Android wrapper loads `v2/index.html` and serves the bundled files from the APK. The browser preview serves the same files through `v2/dev-server.mjs`.

| Area | Responsibility |
| --- | --- |
| `v2/content.mjs` | Lists each story's data files and combines their localized text, audio, art, covers, and motion. Add a new story here after creating its data files. |
| `v2/app.mjs` | Builds the library, reader, and parent settings; connects story choices, narration, and the stage. |
| `v2/state.mjs` | Saves progress and settings, resumes stories, and handles tap, hold, and speech cooldown behavior. |
| `v2/narration.mjs` and `v2/word-highlighting.mjs` | Play recorded lines and map spoken words to the visible paragraph. |
| `engine/` | Validates story graphs, follows choices, localizes text, and controls audio playback. |
| `v2/shared-stage/shared-stage.source.js` | Renders the princesses and dragon and applies scene motion. The character-specific stage sources are in `v2/star-3d/` and `v2/adventure-3d/`. |
| `production/` | Checks story coverage and prepares or generates narration. Paid audio commands require an explicit mode and a key supplied outside Git. |
| `tools/` | Checks repository hygiene, validates model assets, and builds the 3D runtime bundles. |
| `build-android.ps1` and `android/` | Package the offline app and provide the Android WebView and screen-pinning bridge. |

The large `*-stage.mjs` runtime files are generated from nearby `*.source.js` files. Edit the source, run `npm run build:3d`, and commit the updated bundle with it. The old root `index.html`, `app.js`, and `styles.css` form an optional legacy prototype selected only by `-LegacyMvp`.
