// @ts-check
/** @type {import('rollup').RollupOptions} */
import dts from 'rollup-plugin-dts';
//import esbuild from 'rollup-plugin-esbuild';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';

const bundle = (config) => ({
  ...config,
  input: './src/index.ts',
  external: (id) => !/^[./]/.test(id),
});

export default [
  bundle({
    plugins: [
      typescript({
        rollupCommonJSResolveHack: true,
        clean: true,
      }),
      commonjs(),
    ],
  input: './src/index.ts',
    output: [
      {
        //        file: `dist/index.js`,
        file: pkg.main,
        exports: 'named',
        format: 'cjs',
        sourcemap: true,
      },
      {
        //        file: `dist/index.mjs`,
        file: pkg.module,
        exports: 'named',
        format: 'esm',
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: `dist/index.d.ts`,
      format: 'es',
    },
  }),
];
