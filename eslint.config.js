import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default tseslint.config({ignores:['.local-tools/**','dist/**','node_modules/**','qa-results/**','performance/**']},js.configs.recommended,...tseslint.configs.recommended,{files:['**/*.{ts,tsx}'],languageOptions:{globals:globals.browser},plugins:{'react-hooks':hooks},rules:{'react-hooks/rules-of-hooks':'error','react-hooks/exhaustive-deps':'warn'}},{files:['*.js','scripts/*.mjs','supabase/tests/*.mjs'],languageOptions:{globals:globals.node}},{files:['supabase/functions/**/index.ts'],languageOptions:{globals:{Deno:'readonly'}}});

