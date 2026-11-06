# Alisha and the Lost Star — story map for review

**Audience:** age 4. **Draft language:** English. Each screen reads its situation, then its choices. Every reachable screen, including an ending, has two or three choices. There are no Continue screens or mini-games. The `description` is the story-library read-aloud preview. Hints are contextual and separate from automatic narration.

## Route map

1. **Begin:** `castle_gate` introduces Alisha and the dragon. The player enters the bridge or moon garden.
2. **First investigation:** Bridge routes meet the frog or field mice, then see the ribbon or stream bend (`bridge_crossroads`, `bridge_waterway`). Garden routes meet the moth or snail, then see the flower circle or warm silver mark (`garden_crossroads`, `garden_waterway`). These are distinct middle scenes; choices then lead toward the hill or pond.
3. **Test the clues:** `hill_approach` and `pond_approach` introduce the star's warm glow, kind-voice response, and wind chime. The player chooses where to search and can change direction based on a clue. On the hill, the windmill keeper or fox offers information. At the pond, the turtle or ducks help distinguish a real light from a reflection.
4. **Approach the woods:** `woods_threshold` and `cloud_threshold` present the silver line, moving cloud, squirrel, and distant chime. The player searches under the trees or from a grassy lookout.
5. **Find the shy star:** `whispering_woods` and `cloud_edge` reveal a hidden light. `star_listen` and `bird_call` let the player respond to its fear or hear what happened. A cloud choice opens an exclusive route through `cloud_path`, `cloud_pillows`, and either `cloud_chime` or `cloud_trail`, leading to two cloud endings unavailable from the ground route.
6. **Help it rise:** `kind_voice` and `night_bird` lead to `bell_walk` or `flower_walk`. The player can respond to which sounds and lights the star likes. `bell_tower` offers two soft-music endings or a loud-bell setback. `flower_path` offers a dragon ride, a flower trail, or `star_choice`, where the star chooses small steps or a rest until dawn. Following a sharp click at `bell_walk` is another gentle setback.

## Endings

| Type | IDs | Result |
| --- | --- | --- |
| Good | `ending_bell`, `ending_song` | A soft bell or the dragon's song helps the star rise. |
| Good | `ending_dragon`, `ending_flowers` | A dragon ride or flower trail guides it home. |
| Good | `ending_steps`, `ending_dawn` | The star chooses small jumps now or rest before dawn. |
| Good, cloud route only | `ending_cloud`, `ending_cloud_guide` | A cloud shimmer rejoins the star or shows it the way. |
| Gentle setback | `ending_loud_bell`, `ending_click` | A loud or sharp sound startles the star; the player can retry nearby. |

All ten endings carry `ending: "good"` or `ending: "setback"`. Good endings offer `$restart` and `$home`; setbacks offer a local retry and `$home`. The cloud endings depend on choosing the cloud path. **Earlier bridge/garden and hill/pond choices still reconverge later**, so those choices change the journey and clues but do not lock a particular ending. That is a remaining story-design limitation if every early decision must affect the ending.

## Route length and narration budget

An exhaustive walk to the **first ending** found **19,712 valid choice sequences**, 46 reachable scenes, and no missing targets. Cycles through setback retries are excluded from route timing. The cloud endings take **13 screens and 7,767–8,047 characters**. The sharp-click setback takes **13–14 screens and 7,644–8,559 characters**. Other direct endings take **14–16 screens and 8,178–9,702 characters**. Route character counts include each visited situation and **all** choices read on that screen, but exclude hints, replays, and the library preview.

The target is **10–15 minutes per route**. These routes now meet the 12–16 screen target, and typical routes are plausibly in the 10–15 minute range with choices and pauses. The shortest routes may still run **under 10 minutes** at a quick narration pace. No timed read-aloud or child playtest has been done, so duration is **not verified**. A timed read-through should settle pacing before voice generation.

There are **27,557 unique English narration characters** across the graph, including the library description, situations, and choice labels once. The count excludes hints and spoken UI instructions. At a hypothetical **1 credit per character**, English alone would require about **27,557 credits** before retakes. Three equally long languages would be **82,671 credits** before retakes, but Spanish and Gujarati lengths and actual ElevenLabs model rates are unknown; this is a planning scenario, not a quote. No translations were invented and no credits were spent. Script approval, translation, voice choice, and a model-specific price check should precede generation.
