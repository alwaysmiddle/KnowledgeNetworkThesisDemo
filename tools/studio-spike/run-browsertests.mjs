// run-browsertests.mjs — runs every browser test in this folder, one after another,
// and fails if any of them fails.
//
// WHY THIS EXISTS. These tests were written one at a time, each for the change it
// was checking, and then only ever run by the person making that change. A test
// nobody runs is not a regression guard; it is a note. One of them (#234) had
// rotted silently and was only discovered when someone ran it by hand months later.
//
// It runs them SEQUENTIALLY on purpose. Each test spawns its own vite on its own
// fixed port with --strictPort, so two at once is a port collision, not speed.
// Sequential costs about 11 seconds per test — the whole set is a few minutes,
// which is a "before you open a pull request" command, not a "on every save" one.
//
// It does NOT run the measurements (`probe-*`) or the screenshot scripts (`shot-*`).
// Those are instruments, not tests: the measurements print numbers for a person to
// read and one of them asserts a speed ratio, which is exactly the assertion that
// fails randomly on a loaded machine.
//
// Run:  npm run test:browser
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')

// `browsertest-` is the name a test in this folder should carry. `drive-` is the
// invented prefix the older ones still use; both are collected while that rename
// is outstanding, so a test cannot fall out of the run by being renamed.
const tests = readdirSync(HERE)
  .filter((f) => (f.startsWith('browsertest-') || f.startsWith('drive-')) && f.endsWith('.mjs'))
  .sort()

const only = process.argv[2]
const chosen = only ? tests.filter((f) => f.includes(only)) : tests
if (!chosen.length) {
  console.error(only ? `no browser test matches "${only}"` : 'no browser tests found')
  process.exit(1)
}

console.log(`running ${chosen.length} browser test${chosen.length === 1 ? '' : 's'}\n`)

const failed = []
const rows = []
for (const f of chosen) {
  const started = Date.now()
  const r = spawnSync(process.execPath, [join(HERE, f)], { cwd: REPO, encoding: 'utf8' })
  const secs = ((Date.now() - started) / 1000).toFixed(0)
  const pass = r.status === 0
  rows.push(`${pass ? 'PASS' : 'FAIL'}  ${f.padEnd(34)} ${secs.padStart(3)}s`)
  console.log(rows.at(-1))
  if (!pass) {
    // the last few lines are where every one of these prints its own summary
    const tail = (out) => (out || '').trimEnd().split('\n').slice(-6).join('\n')
    failed.push({ f, why: [tail(r.stdout), tail(r.stderr)].filter(Boolean).join('\n') })
  }
}

console.log(`\n${chosen.length - failed.length}/${chosen.length} passed`)
if (failed.length) {
  for (const { f, why } of failed) console.error(`\n──── ${f}\n${why}`)
  process.exit(1)
}
