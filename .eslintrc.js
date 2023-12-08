module.exports = {
  "root": true,
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/vue3-recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:prettier/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 12,
    "ecmaFeatures": {
      "jsx": true
    },
    "parser": "@typescript-eslint/parser",
    "sourceType": "module",
    "project": "./tsconfig.json",
    "extraFileExtensions": [".vue"],
    "jsxPragma": "h",
    "jsxFragmentName": "Fragment"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/indent": "off",
    "@typescript-eslint/explicit-member-accessibility": "off",
    "@typescript-eslint/no-parameter-properties": "warn",
    "@typescript-eslint/no-inferrable-types": "warn",
    "@typescript-eslint/no-empty-function": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/no-static-element-interactions": "warn"
  }
};
