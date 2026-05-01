import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['**/*.{ts,tsx,mts,cts,js,mjs,cjs}'];
const testFiles = [
  '**/*.spec.{ts,tsx,js,mjs,cjs}',
  '**/*.test.{ts,tsx,js,mjs,cjs}',
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/test-output/**',
      '**/node_modules/**',
      '.nx/**',
      'tmp/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.node,
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        test: 'readonly',
        vi: 'readonly',
      },
    },
  },
);
