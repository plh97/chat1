export default {
  // "parser": "babel-eslint",
  parser: '@typescript-eslint/parser',
  env: {
    browser: false,
    node: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  root: true,
  plugins: [
    '@typescript-eslint'
  ],
  rules: {},
  ignores: [
    // "node_modules",
  ],
}
