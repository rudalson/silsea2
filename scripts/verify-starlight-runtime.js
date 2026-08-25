const port = Number(process.argv[2] || 9227);
const targetUrl = `http://127.0.0.1:${port}/json`;

const targets = await fetch(targetUrl).then((response) => response.json());
const target = targets.find((candidate) => candidate.type === "page");

if (!target?.webSocketDebuggerUrl) {
  throw new Error(`Chrome page target not found at ${targetUrl}`);
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
const result = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("CDP evaluation timed out")), 5000);

  socket.addEventListener("open", () => {
    socket.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: {
          awaitPromise: true,
          returnByValue: true,
          expression: `(async () => {
            const { game } = await import("/src/main.js");
            const scene = game?.scene?.getScene("GameScene");
            const requiredTextures = [
              "starlight_tileset",
              "bg_starlight_far",
              "bg_starlight_mid",
              "bg_starlight_near",
              "decor_star_tree",
              "decor_moon_branch",
              "decor_firefly",
              "decor_star_flower"
            ];

            return {
              overlay: Boolean(document.querySelector("vite-error-overlay, .vite-error-overlay")),
              activeScenes: game?.scene?.getScenes(true).map((active) => active.scene.key) || [],
              level: scene?.level?.id || null,
              tileset: scene?.level?.assets?.tileset || null,
              bgm: scene?.level?.assets?.bgm?.field || null,
              decorationCount: scene?.level?.decorations?.length || 0,
              texturesLoaded: requiredTextures.every((key) => game?.textures?.exists(key))
            };
          })()`
        }
      })
    );
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== 1) return;
    clearTimeout(timeout);
    resolve(message.result?.result?.value);
  });

  socket.addEventListener("error", (event) => {
    clearTimeout(timeout);
    reject(event.error || new Error("CDP WebSocket error"));
  });
});

socket.close();
console.log(JSON.stringify(result));

const passed =
  result &&
  !result.overlay &&
  result.activeScenes.includes("GameScene") &&
  result.level === "level-02" &&
  result.tileset === "starlight_tileset" &&
  result.bgm === "bgm_starlight" &&
  result.decorationCount === 6 &&
  result.texturesLoaded;

if (!passed) process.exitCode = 1;
