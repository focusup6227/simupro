// ESLint flat config (ESLint 9 + eslint-config-next 16). Replaces the legacy
// .eslintrc.json now that `next lint` is removed in Next 16 — lint via `eslint .`.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'public/**', // PWA/workbox-generated assets (sw.js, workbox-*.js, fallback-*.js)
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      'react/jsx-no-comment-textnodes': 'off',
      // The Next 16 upgrade pulled in eslint-plugin-react-hooks v6, whose new
      // React-Compiler ruleset flags ~60 pre-existing hook patterns that were
      // never part of this project's lint contract. They surface real tech-debt
      // (tracked separately), but blocking the build on them is out of scope for
      // a security upgrade. Downgraded to `warn` to keep them visible without
      // failing `eslint .`. Revisit when adopting the React Compiler.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
];
