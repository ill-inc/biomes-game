import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as path from "path";
import type * as webpack from "webpack";

const rootDir = path.resolve(__dirname, "../../../..");
const distDir = path.resolve(rootDir, "dist/galois/editor/webpack");
const srcDir = path.resolve(rootDir, "src");

const pathAliases = {
  "@/wasm/cayley": path.resolve(rootDir, "src/gen/cayley/impl/wasm_bundler"),
  "@/galois": path.resolve(srcDir, "galois/js"),
  "@": srcDir,
};

const config: webpack.Configuration[] = [
  // Compile TypeScript for the main process.
  {
    mode: "development",
    entry: path.resolve(__dirname, "main/app.ts"),
    target: "electron-main",
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: rootDir,
          use: {
            loader: "ts-loader",
            options: {
              projectReferences: true,
            },
          },
        },
      ],
    },
    resolve: {
      extensions: [".ts", "..."],
      alias: pathAliases,
    },
    output: {
      path: distDir,
      filename: "main.js",
    },
  },

  // Compile typescript for the preload script.
  {
    mode: "development",
    entry: path.resolve(__dirname, "main/preload.ts"),
    target: "electron-main",
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.ts?$/,
          include: rootDir,
          use: {
            loader: "ts-loader",
            options: {
              projectReferences: true,
            },
          },
        },
      ],
    },
    resolve: {
      extensions: [".ts", "..."],
      alias: pathAliases,
    },
    output: {
      path: distDir,
      filename: "preload.js",
    },
  },

  // Package the view process (CSS, TypeScript, and HTML).
  {
    mode: "development",
    entry: path.resolve(__dirname, "view/index.tsx"),
    target: "electron-renderer",
    devtool: "source-map",
    context: __dirname,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: rootDir,
          use: {
            loader: "ts-loader",
            options: {
              projectReferences: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", "..."],
      alias: pathAliases,
    },
    output: {
      path: distDir,
      filename: "view.js",
    },
    plugins: [
      new MiniCssExtractPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "view/index.html"),
      }),
    ],
  },
];

export default config;
