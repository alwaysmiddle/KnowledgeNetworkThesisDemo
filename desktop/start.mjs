// `npm start` — a self-contained launch, no dev server required elsewhere.
//
// OB-100: the owner closed the terminal running `npm run dev` (the root Vite
// server on :3000), then ran the old `start` script and got
// `ERR_CONNECTION_REFUSED` — `main.ts`'s START defaults to localhost:3000
// whenever `DESKTOP_LOAD` isn't `dist`. This script takes the other branch:
// build the web app, build the desktop shell, then launch pointed at the
// built files — the exact `app://` path `smoke.mjs` already proves works,
// just without Playwright driving it.
//
// Iterating with live reload against a running dev server is still `npm run
// dev` in this package, unchanged.

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

function run(cmd, args, cwd, env) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, env: { ...process.env, ...env } })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('npm', ['run', 'build'], ROOT)
run('node', ['build.mjs'], HERE)
run('npx', ['electron', '.'], HERE, { DESKTOP_LOAD: 'dist' })
