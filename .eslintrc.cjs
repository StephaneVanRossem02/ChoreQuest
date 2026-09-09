module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Co-locating a `useX()` hook with its provider is the idiomatic React
      // context pattern; the react-refresh rule only cares about HMR ergonomics.
      files: [
        'src/contexts/*.tsx',
        'src/components/TierBadge.tsx',
        'src/features/auth/OnboardingPage.tsx',
      ],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
};
