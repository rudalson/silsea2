# Storybook cloud and magpie sources

The four PNG files in this directory are generated source illustrations with transparent alpha. `npm run storybook:enemies` crops them by alpha, builds the existing 128×128 animation frames and sprite sheets, refreshes both anchors, and writes `references/storybook-enemy-animation.png`.

The generated sources are preserved so the runtime sprites remain reproducible. The build keeps every manifest key and frame count unchanged.

- `dark-cloud-idle.png`: calm purple storm spirit
- `dark-cloud-attack.png`: charged storm spirit with golden lightning
- `magpie-fly.png`: teal and midnight-blue flight pose
- `magpie-stunned.png`: stunned upright pose with spiral eyes and stars

Generation prompts and the reference-image role are recorded in `storybook-enemy-prompts.json`.
