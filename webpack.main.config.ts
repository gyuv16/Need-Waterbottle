import type { Configuration } from 'webpack';
import { nativeRules, rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  entry: './src/main.ts',
  module: { rules: [...nativeRules, ...rules] },
  plugins,
  resolve: { extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'] },
};
