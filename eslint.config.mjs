import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "object-curly-spacing": ["error", "always"],
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "@typescript-eslint/no-explicit-any": ["warn"],
      "indent": ["error", 2],
      "comma-dangle": ["error", {
        "arrays": "never",
        "objects": "never",
        "imports": "never",
        "exports": "never",
        "functions": "never" 
      }],
      "max-len": ["error", { "code": 80, "tabWidth": 2 }],
      "keyword-spacing": ["error", { "before": true }]
    }
  }
];