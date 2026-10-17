import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'supabase/**', 'scripts/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off'
    }
  },
  // Architecture guardrails for src/features/attendance
  // domain/      pure rules: no React, no state, no I/O, no clock, no randomness (error)
  // repository/  data access: must not know about state or UI                   (error)
  {
    files: ['src/features/attendance/domain/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [
            'react', 'react/*', 'react-dom', 'react-dom/*', 'zustand', 'zustand/*', '@supabase/*',
            'sonner', 'framer-motion', '**/core/**', '**/shared/**',
            '**/store/**', '**/repository/**', '**/components/**', '**/hooks/**',
          ],
          message: 'domain/ must stay pure: it may only import from other domain/ files.',
        }],
      }],
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: 'Domain code must be deterministic: take the time as a parameter.' },
        { object: 'Math', property: 'random', message: 'Domain code must be deterministic: inject an id/random source.' },
        { object: 'crypto', property: 'randomUUID', message: 'Domain code must be deterministic: inject an id generator.' },
      ],
      'no-restricted-globals': ['error',
        { name: 'window', message: 'No browser APIs in domain/.' },
        { name: 'document', message: 'No browser APIs in domain/.' },
        { name: 'localStorage', message: 'No I/O in domain/.' },
        { name: 'fetch', message: 'No I/O in domain/.' },
      ],
    },
  },
  {
    files: ['src/features/attendance/repository/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/store/**', '**/components/**', '**/hooks/**'],
          message: 'The data layer must not depend on state or UI. Import types from ../domain instead.',
        }],
      }],
    },
  }
])
