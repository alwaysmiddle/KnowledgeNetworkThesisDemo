import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // the evoc spike carries a Python venv; eslint was walking into its vendored
  // matplotlib JS and reporting on it. Noise in every `npm run verify`.
  globalIgnores(['dist', '**/.venv/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },

  // DS ports mirror the Design System's own module shape, and several DS
  // components ship a colocated style helper beside the component — caretStyle in
  // TreeRow, bulletStyle in InstrumentRow, FamilyColumn in InstrumentGroup — that
  // a sibling imports by name (InstrumentGroup pulls caretStyle from TreeRow so
  // the palette and the tree draw nesting one way). react-refresh/only-export-
  // components would force us to split those helpers into separate files and
  // diverge from the DS structure for a dev-only HMR nicety. Relax it for the DS
  // ports, the same way #61's raw-value bans are deliberately absent here.
  {
    files: ['src/ds/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // #61 — DS-adherence ratchet. The Design System is the source of truth for
  // style; app code consumes its tokens as var(--…), never raw values. These
  // bans are the machine enforcement of that rule, authored as native ESLint
  // (oxlint was declined — #65 — every rule here is stock esquery). The DS's
  // `_adherence` config is the reference SPEC; it is not vendored or run here.
  //
  // It is NOT repo-wide: ~84 raw hex + ~216 px still live in the un-migrated
  // alt-visualizations (#69) and the walkdesk, so a global `eslint .` ban can't
  // pass yet. Instead the ban is SCOPED to files already token-clean and grows
  // one entry at a time as each surface is migrated. `src/ds/**` primitives are
  // deliberately absent — design values legitimately live in the DS ports.
  {
    files: ['src/App.tsx', 'src/studio/StudioView.tsx', 'src/studio/AppToolbar.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'raw hex colour — consume a DS --color token via var(--…), not a literal (#61 adherence).',
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'raw hex colour in a template — consume a DS --color token via var(--…) (#61 adherence).',
        },
        {
          // catches a hard-coded `10px`, but NOT a computed `${n}px` (its static
          // chunk is just "px" — no digit — so a legitimate arithmetic width passes)
          selector: 'Literal[value=/\\b\\d+px\\b/]',
          message: 'raw px — use a DS spacing/size token or the Tailwind scale, not a px literal (#61 adherence).',
        },
        {
          selector: 'TemplateElement[value.raw=/\\b\\d+px\\b/]',
          message: 'raw px in a template — use a DS spacing/size token or the Tailwind scale (#61 adherence).',
        },
      ],
    },
  },
])
