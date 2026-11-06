# Alisha's Adventures — development build report

**Date:** November 4, 2026  
**Build:** `Alishas-Adventures-DRAFT.apk`  
**SHA-256:** `6D6F53023F06862C988476A033A9E6484A82C45DBCB2A7599DB1E14E0B4CDF5B`  
**Phone tested:** Android test phone, Android 12

## Completed in this build

- The Android launcher name is **Alisha's Adventures**, with the storybook icon.
- The story library has a purple, star-speckled background inspired by the user's reference. It appears only on the library page; the story cards retain their own backgrounds.
- The Lost Star card has a custom illustrated cover for each selectable princess. Future stories can add cover paths in `story/library-covers.draft.json`.
- Each of the 13 recorded situation paragraphs has word-by-word highlighting in English, Spanish, and Gujarati. The existing recordings were aligned to their scripts; no voices were rerecorded. Tapping the paragraph and the full-screen replay button use the same word cues.
- The first recorded route reaches the **cloud-guide** ending across 13 scenes. Every situation, choice, and contextual hint on that route has a matched recording in English (Clara), Spanish (Daniela), and Gujarati (Mitali Ben): 159 route recordings, plus six library recordings, 165 MP3 files total.
- Three temporary storybook backgrounds and temporary character frame studies appear on the route. Both princess options have talking-frame swaps and an ending wave frame. The idle blink swap was paused after the user reported visual flicker; the whole character image had been changing between slightly different drawings. The portraits are not final layered rigs or timed lip sync.
- Parent settings switch the story language and princess. A tap on the situation replays only that line, with a short cooldown; the replay button reads the situation and choices.
- The APK is signed with Android APK signature schemes v2 and v3. The package includes all 165 MP3s and all three new scene illustrations.

## Verified

- The route asset check passed for 13 scenes and 159 text-matched recordings. Seven focused graph, localization, narration, and player tests passed.
- The installed app opened in portrait on the Android phone. The user confirmed that Clara, Daniela, and Mitali Ben were audible on their respective language screens. The temporary scene illustration, character frames, and Gujarati text rendered on the phone.
- The updated build installed and reopened on the Android phone. The idle-animation change itself has not yet been judged by the user during story play.
- The new library background and readable cards were inspected in a phone screenshot.
- Both princess-specific story covers were inspected on the phone after the phone was unlocked.
- All 39 situation timing entries match the displayed localized text and contain one timed cue per visible word. Seven focused tests passed. English, Spanish, and Gujarati highlighted words were visible during playback on the phone. The user confirmed that English highlighting follows Clara's voice.
- Android reported both `PINNED` and `NONE` during the screen-pinning test. The parent button now refreshes to match the actual state. The app was left unpinned on the English story library.
- The ElevenLabs balance was checked after this recording batch. Recheck the live balance before further paid generation.

## Still temporary or unverified

- The other 33 scenes and their 411 story recordings are not in this build. Some child-facing interface labels also lack recordings. A route can leave the recorded path; the player reports missing narration on those screens.
- Spanish and Gujarati translations and pronunciation have not been reviewed by fluent human speakers. All recorded lines and art remain `DRAFT / TEMP` pending review.
- The machine-generated word cues need listening review in Spanish and Gujarati. Other story branches have no recorded narration or word cues yet.
- Three backgrounds are reused across the 13-scene route. The Star princess sheet has visible edge artifacts. Final art, character rigs, timed speech animation, music, and effects remain open.
- A complete route was not played start to finish on the phone. Airplane-mode play, every branch, and the normal unpin gesture and credential experience still need testing.
