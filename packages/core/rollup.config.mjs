import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import pkg from "./package.json" assert { type: "json" };
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';

/**
 * @type {import('rollup').RollupOptions}
 */
export default {
  input: 'src/index.ts',


  output: [{
    file: pkg.main,
    format: "cjs",
    exports: 'auto'
  }, {
    file: pkg.module,
    format: "esm",
  }],

  // output: {
  //   dir: 'dist',
  //   format: "commonjs",
  //   name: "index",
  //   globals: {},
  // },

  plugins: [
    json(),
    typescript(),
    /** some deps still are importing commonjs bundles */
    commonjs(),
    /** some deps have unbundled imports that need to be resolved */
    nodeResolve({
      browser: false,
      // exclude node_modules, except @ok/im-core
      exclude: ['**/node_modules/**'],
    }),
    /** we are using the _src in the code */

    /** fast Rust based bundler! */
    // swc({
    //   jsc: {
    //     baseUrl: __dirname,
    //   },
    //   minify: false,
    //   sourceMaps: true,
    // }),
    // visualizer(),
  ],
};
