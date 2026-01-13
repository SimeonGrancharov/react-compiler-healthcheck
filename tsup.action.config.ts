import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/action.ts'],
  format: ['cjs'],
  outDir: 'dist/action',
  dts: false,
  minify: true,
  noExternal: [/.*/], // Bundle ALL dependencies
});
