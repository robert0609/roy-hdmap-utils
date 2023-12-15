import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import pkg from './package.json';
var dependencies = pkg.dependencies;
var externalDependencies = dependencies ? Object.keys(dependencies).filter(name => name !== 'jsts') : [];

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData(source: string, filename: string): Promise<string> {
          const absoluteThemeFileName = path.resolve(__dirname, './src/assets/css/_theme.scss');
          const relativeThemeFileName = path.relative(path.dirname(filename), absoluteThemeFileName).split('\\').join('/');
          const result = `
            @import '${relativeThemeFileName}';
            ${source}
          `;
          return Promise.resolve(result);
        }
      }
    }
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  },
  plugins: [
    vue(),
    vueJsx()
  ],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, 'src') }
    ],
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'hdu',
      fileName: 'index'
    },
    minify: true,
    sourcemap: true,
    rollupOptions: {
      external: function (moduleName) {
        return externalDependencies.some(item => moduleName.startsWith(item));
      },
      plugins: [
        visualizer(
          {
            filename: path.resolve(__dirname, 'stats.html'),
            template: 'treemap',
            sourcemap: true
          }
        )
      ]
    }
  },
  server: {
    proxy: { }
  }
})
