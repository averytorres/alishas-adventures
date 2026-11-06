# Spoken word visibility — November 5, 2026

The word highlight previously followed narration timing but did not keep the active word visible. The story page now scrolls when the highlighted word reaches the upper or lower edge of the comfortable reading area. Words already in that area do not trigger a scroll. The behavior applies to timed situation paragraphs in English, Spanish, and Gujarati, including paragraph replay.

The updated Android draft was installed on the Android test phone. An English word was visibly highlighted during narration, and the page moved down as the reading reached the lower part of a long paragraph. Eight focused tests passed. Spanish and Gujarati timing and scrolling were covered by shared code and automated tests but were not separately watched on the phone for this change.

APK SHA-256: `CBF6FED810122770A1CA856620FBC83AEB5C2A32290AFD3B84922CC2F994DF67`.
