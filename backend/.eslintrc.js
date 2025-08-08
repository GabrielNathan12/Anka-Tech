module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    semi: ['error', 'never'],
    quotes: ['error', 'single'],
  }
}
