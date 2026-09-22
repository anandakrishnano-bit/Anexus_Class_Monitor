import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'd3-array': path.resolve(__dirname, './node_modules/d3-array/dist/d3-array.js'),
    },
  },
  server: {
    port: 3000,
    host: true
  }
});
