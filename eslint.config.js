import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import css from '@eslint/css';

export default [
  // Never lint or format build output.
  { ignores: ['dist/'] },

  // TypeScript sources.
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/indent': ['error', 2],
      // Allow intentionally-unused params named with a leading underscore.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // CSS.
  {
    files: ['**/*.css'],
    language: 'css/css',
    ...css.configs.recommended,
    rules: {
      ...css.configs.recommended.rules,
      // SillyTavern injects --ST-* custom properties at runtime; not declared here.
      'css/no-invalid-properties': 'off',
      'css/use-baseline': 'off',
    },
  },
];
