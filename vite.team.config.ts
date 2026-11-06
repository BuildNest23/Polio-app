import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

// Builds the team app into ONE self-contained html file (dist-team/index.html).
export default defineConfig({
  root: path.resolve(__dirname, 'team'),
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: path.resolve(__dirname, 'dist-team'),
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
