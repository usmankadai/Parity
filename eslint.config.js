import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ESLint needs a default export from its config file.
// eslint-disable-next-line no-restricted-syntax
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'public/mockServiceWorker.js', '.api-check'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React rules only apply to the app. (Playwright fixtures also have a
  // function called `use`, which the hooks rule would mistake for React's.)
  { ...reactHooks.configs.flat.recommended, files: ['src/**/*.{ts,tsx}'] },
  { ...jsxA11y.flatConfigs.recommended, files: ['src/**/*.{ts,tsx}'] },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports. Only config files that need a default export may use one.',
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Never render raw HTML. Render text, or use a small safe formatter.',
        },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
