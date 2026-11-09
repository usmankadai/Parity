import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { SECURITY_HEADERS } from './config/securityHeaders';

// Rsbuild needs a default export from its config file.
// eslint-disable-next-line no-restricted-syntax
export default defineConfig(({ command }) => ({
  plugins: [pluginReact()],
  html: {
    template: './src/index.html',
    title: 'Parity: compare statutory benefits across countries',
  },
  server: {
    // Serve the production headers when previewing the build, so end-to-end
    // tests run under the real Content Security Policy. Not in dev, where hot
    // reloading needs looser rules.
    ...(command === 'preview'
      ? { headers: Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value])) }
      : {}),
  },
}));
