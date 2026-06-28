const js = require('@eslint/js');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Custom rules suitable for Node.js backend (bots and APIs)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Often useful in CLI bots/APIs
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '.env*', 'drizzle/', 'fs.md', 'GEMINI.md'],
  },
];
