import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
  },
});
