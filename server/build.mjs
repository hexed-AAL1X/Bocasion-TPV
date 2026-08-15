import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const requireFromRoot = createRequire(join(here, "../package.json"));
const esbuild = requireFromRoot("esbuild");

mkdirSync(join(here, "dist"), { recursive: true });

await esbuild.build({
  absWorkingDir: here,
  entryPoints: [join(here, "index.ts")],
  outfile: join(here, "dist/index.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  logLevel: "info",
});

console.log("✓ API listo en server/dist/index.cjs");
