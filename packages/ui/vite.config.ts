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
        '@editorjs/core',
        '@editorjs/dom',
        '@editorjs/dom-adapters',
        '@editorjs/editorjs',
        '@editorjs/helpers',
        '@editorjs/model',
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
      generateScopedName: (name) => `editorjs-${name}`,
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
