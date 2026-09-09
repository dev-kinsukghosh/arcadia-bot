const js = require('@eslint/js');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');
const pluginVue = require('eslint-plugin-vue');
const eslintConfigPrettier = require('eslint-config-prettier');
const tailwind = require('eslint-plugin-tailwindcss');

module.exports = [
  js.configs.recommended,
  eslintPluginPrettierRecommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    files: ['dashboard/**/*.js', 'dashboard/**/*.vue', 'dashboard/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ...tailwind.configs.recommended,
    files: ['dashboard/**/*.js', 'dashboard/**/*.vue'],
    settings: {
      tailwindcss: {
        cssConfigPath: 'dashboard/src/style.css',
      },
    },
    rules: {
      'tailwindcss/no-custom-classname': [
        'warn',
        {
          whitelist: [
            'custom-scrollbar',
            'no-scrollbar',
            'modal-box-anim',
            'animate-pulse-glow',
            'animate-shine',
            'group-hover:animate-shine',
            'image-rendering-pixelated',
            'scale-1.03',
            'hover:scale-1.03',
            'scale-1.02',
            'hover:scale-1.02',
            'hover:scale-105',
            'group-hover:scale-105',
            'hover:-translate-y-0.5',
            'card-pop',
            'card-switch',
            'event-list',
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
      },
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'dashboard/dist/',
      'dashboard/dist-ssr/',
      'logs/',
      'scratch/',
      '.env*',
      'drizzle/',
      'fs.md',
      'GEMINI.md',
    ],
  },
  eslintConfigPrettier,
];
