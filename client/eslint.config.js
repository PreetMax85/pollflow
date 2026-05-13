import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from "eslint-config-prettier";


export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui auto-generated files export cva constants alongside components
    // router/index.tsx exports both the router and inline route guard components
    // main.tsx has an inline AppErrorFallback component — fine for a bootstrap file
    files: [
      'src/components/ui/**',
      'src/router/index.tsx',
      'src/main.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  eslintConfigPrettier,
])
