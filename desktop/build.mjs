// Two esbuild calls, and no more build system than that.
//
// CJS FOR BOTH. Electron's main process will run ESM, but a preload script's
// ESM support comes with conditions (`sandbox: false`, or a `.mjs` extension and
// no `sendSync` before the module graph settles) and buys this slice nothing.
// One format for both files is the boring answer and the boring answer is right.
//
// BUNDLED, so `preload.ts` can import the app's real `src/platform/web.ts` and
// have it end up inside `out/preload.cjs` — no runtime resolution, no node_modules
// beside the built file, nothing for a sandboxed preload to fail to require.
// `electron` stays external because it is supplied by the runtime, not by us.

import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

const common = {
  bundle: true,
  format: 'cjs',
  platform: 'node',
  // node20 rather than this machine's node22: `.github/workflows/code-verify.yml`
  // pins setup-node@20, and a desktop build that only compiles on the newer local
  // runtime is a trap waiting for whoever builds it in CI.
  target: 'node20',
  external: ['electron'],
  sourcemap: true,
  logLevel: 'info',
}

await build({
  ...common,
  entryPoints: [join(HERE, 'main.ts')],
  outfile: join(HERE, 'out', 'main.cjs'),
})

await build({
  ...common,
  entryPoints: [join(HERE, 'preload.ts')],
  outfile: join(HERE, 'out', 'preload.cjs'),
})
