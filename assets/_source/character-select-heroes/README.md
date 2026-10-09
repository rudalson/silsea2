# Character select hero art

The seven transparent PNGs in this folder are the full-resolution source illustrations for the character selection screen. They were generated individually from each character's existing anchor and animation sprite sheet, with Silsea's finished illustration used as the shared style reference. The prompts called for a cute storybook pony, a clear side-facing full-body pose, each character's established coat/mane colors, and **no horn or wings** in the base form.

Run `npm run selection:heroes` to crop and center the art in transparent 512 × 512 runtime images under `assets/ui/character_select_hero_*.png`. The command also updates `references/character-select-heroes.png` for visual review. The small animated sprites use separate animation sources.

On 2026-10-09, Sunlight's hero and all four animation forms were refreshed together to look slightly more mature, like Sylvia. The cream coat and orange/gold curls remain; the head and eyes are less oversized, the neck and legs are longer, and the hero has a calm closed-mouth smile. Generation prompts and rebuild commands are recorded in [Sunlight refresh](../celestial-animation/SUNLIGHT-REFRESH.md).

Ocean Dream's hero and all four animation forms were also refreshed on 2026-10-09 to match the mature Sunlight proportions. The pearl coat, ocean blue/turquoise/seafoam curls, turquoise hooves and seashell flank mark remain. Prompts and rebuild commands are recorded in [Ocean Dream refresh](../celestial-animation/OCEANDREAM-REFRESH.md).
