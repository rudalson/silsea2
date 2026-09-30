# Character select hero art

The seven transparent PNGs in this folder are the full-resolution source illustrations for the character selection screen. They were generated individually from each character's existing anchor and animation sprite sheet, with Silsea's finished illustration used as the shared style reference. The prompts called for a cute storybook pony, a clear side-facing full-body pose, each character's established coat/mane colors, and **no horn or wings** in the base form.

Run `npm run selection:heroes` to crop and center the art in transparent 512 × 512 runtime images under `assets/ui/character_select_hero_*.png`. The command also updates `references/character-select-heroes.png` for visual review. The small animated sprites remain separate and unchanged.
