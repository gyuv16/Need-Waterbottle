import type { ModuleOptions } from 'webpack';

type Rules = Required<ModuleOptions>['rules'];

// Native-module helpers rely on Node globals such as __dirname, so they must
// only be used for the main process, never for the sandboxed renderer.
export const nativeRules: Rules = [
  { test: /native_modules[/\\].+\.node$/, use: 'node-loader' },
  {
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: { loader: '@vercel/webpack-asset-relocator-loader', options: { outputAssetBase: 'native_modules' } },
  },
];

export const rules: Rules = [
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: { loader: 'ts-loader', options: { transpileOnly: true } },
  },
  // Sprite sheets & images are bundled as files.
  { test: /\.(png|jpe?g|gif|svg|webp)$/i, type: 'asset/resource' },
];
