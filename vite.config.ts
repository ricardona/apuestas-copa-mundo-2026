import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'data',
          dest: ''
        }
      ]
    })
  ],
  // So that it works well on Github pages roots or subfolders
  base: './',
});
