import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '.nx'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  // MVC: views e models não conhecem as camadas de I/O
  {
    files: ['apps/web/src/views/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/repositories/*', '**/services/*', '**/lib/*', '@supabase/*'], message: 'Views só recebem dados por props (use um controller).' },
      ] }],
    },
  },
  {
    files: ['libs/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['react', 'react-dom', '@supabase/*'], message: 'O domínio é TS puro: sem React nem I/O.' },
      ] }],
    },
  },
);
