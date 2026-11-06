# Alisha's Adventures

![An animated storybook banner with Princess Alisha, a green dragon, twinkling stars, and a shooting star](docs/readme/hero.gif)

**A choose-your-own-adventure storybook for young children.** Children guide Princess Alisha through illustrated stories while recorded narration reads each situation and choice aloud. The Android app is designed for portrait play and works offline.

![Choose, listen, explore, replay](docs/readme/journey.gif)

## The first adventure

**Alisha and the Lost Star** follows Alisha and a little green dragon through moonlit paths in search of a missing star. Choices change the journey and lead to multiple endings. The story currently has **46 scenes and 10 endings**.

- **Three languages:** English, Spanish, and Gujarati, each with one recorded narrator.
- **Read along:** situation paragraphs highlight words as they are spoken.
- **Child-friendly controls:** tap a choice to follow it; hold it or use its speaker button to hear it again. Replay and contextual help are available on each story screen.
- **Parent choices:** select the language and either of the two princesses in the parent section.

The game is in active development. Artwork, animation, and translations still need final review; this repository is not a store release.

## Run it on another Windows computer

1. Install Git LFS, then run `git lfs install` and `git lfs pull` after cloning. The artwork, models, and recordings are stored with Git LFS.
2. Install Node.js. From the project root, run `node v2/dev-server.mjs`, then open <http://127.0.0.1:4173/v2/> for the desktop preview.
3. To rebuild the 3D renderer, run `npm ci` followed by `npm run build:3d`. The checked-in runtime bundles let you preview the game without that rebuild.
4. To build Android, install a JDK and Android SDK platform 35 with build-tools 36.0.0. Set `JAVA_HOME` and `ANDROID_SDK_ROOT`, then run `./build-android.ps1` in PowerShell. The script also accepts `-Jdk` and `-Sdk` paths.

See [the app notes](v2/README.md) for more checks and [the model asset notes](tools/model-assets/README.md) for optional Blender preparation.

## Repository checks

Run `node tools/check-repository.mjs` before committing, and run the automated tests after changes. After `npm ci`, `npm run verify:3d` checks that the committed 3D bundles match their source. The root `.gitignore` excludes build output, local credentials, APKs, and the debug signing key; `.gitattributes` places large source media in Git LFS.

The local `android/debug.keystore` stays outside Git. A new computer can create its own debug key, but that key cannot update an APK signed with a different key. Transfer the existing key securely outside the repository when in-place development updates are needed. Use a separate protected release key for any published app.
