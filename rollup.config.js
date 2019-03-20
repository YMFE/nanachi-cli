import rollupPluginAlias from 'rollup-plugin-alias';
import path from 'path';

export default {
  input: 'es/cli/index.js',
  output: {
    file: 'lib/index.js',
    format: 'cjs'
  },
  plugins: [
    rollupPluginAlias({
      '@shared': path.join(__dirname, 'es/shared'),
      '@commands': path.join(__dirname, 'es/cli/commands'),
      '@resources': path.join(__dirname, 'es/transpile/resources'),
      '@languages': path.join(__dirname, 'es/transpile/languages'),
      '@transpiler': path.join(__dirname, 'es/transpile/transpiler'),
      '@platforms': path.join(__dirname, 'es/transpile/platforms'),
    })
  ]
};
