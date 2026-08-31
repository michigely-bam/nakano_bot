import js from "@eslint/js";
import globals from "globals";

export default [
  // Flat config ignores
  {
    ignores: [
      "node_modules/**",
      "Baileys-master/**",
      "build/**", // if you don't want to lint the built output
      "tmp/**",
      "temp/**"
    ]
  },
  
  // Base configuration
  js.configs.recommended,
  
  // Custom configuration override
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // built-in Node.js globals (process, __dirname, etc.)
      },
    },
    rules: {
      // 🔥 Safety async rules
      "require-await": "error", // Catch stray async functions returning promises
      "no-async-promise-executor": "warn",

      // 🔥 Bug prevention
      "no-undef": "error", // Keep this to catch REAL bugs
      
      // Disabled aggressive formatting/code style rules
      "no-irregular-whitespace": "off", 
      "no-unused-vars": "off", 
      "no-empty": "off",
      "no-useless-catch": "off",
      "no-unreachable": "off",
      "no-case-declarations": "off",
      "no-self-assign": "off",
      "no-useless-escape": "off",
      "no-implicit-globals": "off", 
    },
  }
];