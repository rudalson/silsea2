import { defineConfig } from "vite";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

const copyRuntimeAssets = () => ({
  name: "copy-runtime-assets",
  apply: "build",
  async writeBundle() {
    const manifest = JSON.parse(await readFile(resolve(root, "assets/manifest.json"), "utf8"));
    const urls = new Set(
      manifest.assets.flatMap((entry) => [entry.url, entry.atlasUrl].filter(Boolean))
    );

    for (const url of urls) {
      if (!url.startsWith("/assets/")) throw new Error(`로컬 에셋 경로가 아닙니다: ${url}`);
      const relativePath = url.slice("/assets/".length);
      const source = resolve(root, "assets", relativePath);
      const target = resolve(root, "dist/assets", relativePath);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(source, target);
    }
  }
});

export default defineConfig({
  base: "./",
  plugins: [copyRuntimeAssets()],
  build: {
    assetsInlineLimit: 0,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: (id) => id.includes("node_modules/phaser") ? "phaser" : undefined
      }
    }
  }
});
