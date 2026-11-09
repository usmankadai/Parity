import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Rsbuild needs a default export from its config file.
// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: './src/index.html',
    title: 'Parity: compare statutory benefits across countries',
  },
});
