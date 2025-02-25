import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;


// Create separate configs for each entry point
export default ['sidebar'].map(name => ({
  input: `webviews/pages/${name}.ts`,
  output: {
    file: `out/compiled/${name}.js`,
    format: 'iife',
    name: 'app',
    sourcemap: true
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
      dev: !production,
      emitCss: true
    }),
    css({
      output: `${name}.css`
    }),
    resolve({
      browser: true,
      dedupe: ['svelte'],
      extensions: ['.ts', '.js', '.svelte']
    }),
    commonjs(),
    typescript({
      tsconfig: "webviews/tsconfig.json",
      sourceMap: !production,
      inlineSources: !production,
      include: ['webviews/**/*.ts', 'webviews/**/*.svelte']
    }),
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
}));