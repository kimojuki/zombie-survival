import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'apps/client/dist/**',
      // Fragments concaténés par bundle:* — non parseables seuls
      '**/chunks/**',
      'build/**',
      'public/**',
      'database/**',
      'notes-local/**',
      'worlDesign/**',
      'coverage/**',
      '*.config.cjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.node,
        THREE: 'readonly',
        io: 'readonly',
        ZS: 'writable',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-redeclare': 'off',
      'no-useless-escape': 'warn',
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.mjs', 'apps/client/src/**/*.js', 'apps/server/src/decor-game-init.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];
