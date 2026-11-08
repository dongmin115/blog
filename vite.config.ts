import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import content from './plugins/content/index.ts';

export default defineConfig({
  base: './', // GitHub Pages(/blog/)에서도 상대 경로로 동작해요
  plugins: [react(), content()],
  build: { chunkSizeWarningLimit: 700 }, // three.js는 우주 테마를 열 때만 내려받아요
  server: { port: 4173, host: true },
  preview: { port: 4173 },
  test: { include: ['plugins/**/*.test.ts', 'src/**/*.test.{ts,tsx}'] },
});
