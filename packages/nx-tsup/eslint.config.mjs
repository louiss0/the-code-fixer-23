import eslint from '@eslint/js';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { 
      parserOptions: { 
        ecmaVersion: 'latest', 
        sourceType: 'module' 
      } 
    },
    rules: {
      'no-console': 'off'
    }
  }
];
