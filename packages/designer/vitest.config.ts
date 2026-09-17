import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['json-summary', 'json', 'html'],
        include: ['src/**/*.ts'],
        exclude: ['src/types/**'],
      },
  },
});
