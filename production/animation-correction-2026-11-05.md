# Animation correction — November 5, 2026

The experimental face overlays were removed after the user reported a distorted mouth and one eye blinking independently. The app again uses its earlier temporary full-pose talking swap and ending wave. Idle blinking remains off because the existing drawings do not align closely enough between poses.

The replacement requires an editable layered drawing for **each** selectable princess. Eyes and mouth must stay registered to the same face across every pose. Prepare closed, narrow, open, round, and smiling mouth shapes; test blink and speech while the princess is idle and moving; then add arm gestures and other body motion. These are **pending**, not present in this build.

The corrected APK was built, signed, and installed on the Android test phone. A story scene displayed the restored princess pose alongside active narration and word highlighting. Seven focused tests passed. The user has not yet confirmed the corrected animation by watching it on the phone.

Corrected APK SHA-256: `0372EDDA89864F68EAA36B6A9EEF62B47FDE3F0C93DC538F87E4E75A791BCB38`.
