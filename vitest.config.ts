import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'text', 'lcov'],
      include: ['src/**'],
      exclude: ['node_modules/', 'dist/', '__tests__/', '__fixtures__/']
    }
  }
})
