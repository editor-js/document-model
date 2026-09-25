import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import postcssPreset from 'postcss-preset-env';
// @ts-ignore -- seems to work fine
import postcssNested from 'postcss-nested';
import postcssApply from 'postcss-apply';

export default defineConfig({
  plugins: [
    dts(),
    // vite-plugin-css-injected-by-js caches injected CSS across rebuilds in a
    // persistent `vite build --watch` process, so edits always show up one
    // rebuild late. That's why `dev` uses chokidar to re-run a fresh `vite build`
    // per change instead of `vite build --watch` (see package.json).
    cssInjectedByJsPlugin()
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EditorUI',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        '@editorjs/dom',
        '@editorjs/helpers',
        '@editorjs/sdk'
      ],
    },
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    modules: {
      generateScopedName: (name) => `ejs-${name}`,
      localsConvention: 'dashes'
    },
    postcss: {
      plugins: [
        postcssNested(),
        postcssPreset(),
        postcssApply(),
      ],
    },
  },
  esbuild: {
    target: 'esnext'
  }
});
