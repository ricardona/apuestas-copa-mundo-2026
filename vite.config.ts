import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'data',
          dest: ''
        },
        {
          src: 'test_data',
          dest: ''
        },
        {
          src: 'img',
          dest: ''
        }
      ]
    })
  ],
  // So that it works well on Github pages roots or subfolders
  base: './',
});
