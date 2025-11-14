module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true, // For Chrome extension APIs like chrome.storage
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    "no-undef": "error", // Detects undefined variables
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }], // Warns about unused variables, allows _ prefixed for ignored args
    "no-console": "off", // Allow console.log for debugging in extensions
  },
};
