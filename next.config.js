const nextBuildId = require("next-build-id");
const fs = require("fs/promises");
const path = require("path");

const withBundleAnalyzer = process.env.ANALYZE
  ? require("@next/bundle-analyzer")({
      enabled: process.env.ANALYZE === "true",
    })
  : (x) => x;

const isProd = process.env.NODE_ENV === "production";

// Adjust this if you wish to debug the service worker locally.
const debugServiceWorker = false;
const withPWA =
  isProd || debugServiceWorker
    ? require("next-pwa")({
        dest: "public",
        register: false,
        swSrc: "./src/client/service_worker.ts",
      })
    : (x) => x;

module.exports = withBundleAnalyzer(
  withPWA({
    ...(isProd && { assetPrefix: "https://static.biomes.gg" }),

    reactStrictMode: false,
    poweredByHeader: false,
    compress: !isProd,

    async redirects() {
      return [
        {
          source: "/api/environment_group/:id/external_metadata",
          destination: "/api/md/eg/:id",
          permanent: true,
        },
      ];
    },

    generateBuildId: async () => {
      const attemptBuildFromFile = async (...relativePath) => {
        try {
          const buildId = (
            await fs.readFile(path.join(__dirname, ...relativePath))
          ).toString();
          if (buildId !== "local") {
            return buildId;
          }
        } catch (error) {
          // Pass through
        }
      };

      return (
        (await attemptBuildFromFile(".next", "BUILD_ID")) ??
        (await attemptBuildFromFile("BUILD_ID")) ??
        (await (async () => {
          try {
            return await nextBuildId({ dir: __dirname });
          } catch (error) {
            return "unknown";
          }
        })())
      );
    },

    webpack(config, { isServer, webpack, buildId, dev }) {
      const experiments = config.experiments || {};
      config.experiments = { ...experiments, asyncWebAssembly: true };
      config.output.assetModuleFilename = `static/[hash][ext]`;
      if (isServer && !dev) {
        // See comments around WasmChunksFixPlugin below, this works around
        // an issue in nextjs when building for prod.
        config.output.webassemblyModuleFilename = "chunks/[modulehash].wasm";
        config.plugins.push(new WasmChunksFixPlugin());
      }

      config.optimization.moduleIds = "named";
      //config.output.publicPath = `/_next/`;
      config.module.rules.push({
        test: /src\/gen\/shared\/cpp_ext\/.*\.wasm/,
        type: "asset/resource",
      });
      config.module.rules.push({
        test: /\.(mp4|webm|ogg|swf|ogv)$/,
        type: "asset/resource",
      });
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.env.IS_SERVER": JSON.stringify(isServer),
          "process.env.BUILD_ID": JSON.stringify(buildId),
          "process.env.BUILD_TIMESTAMP": JSON.stringify(Date.now()),
          "process.env.SYNC_PORT": process.env.SYNC_PORT,
          "process.env.OOB_PORT": process.env.OOB_PORT,
          "process.env.BIKKIE_STATIC_PREFIX": JSON.stringify(
            process.env.BIKKIE_STATIC_PREFIX || ""
          ),
          "process.env.GALOIS_STATIC_PREFIX": JSON.stringify(
            process.env.GALOIS_STATIC_PREFIX || ""
          ),
          "process.env.OPEN_ADMIN_ACCESS": JSON.stringify(
            process.env.OPEN_ADMIN_ACCESS || "0"
          ),
          "process.env.GCS_LOCAL_DISK": JSON.stringify(
            process.env.GCS_LOCAL_DISK || "0"
          ),
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        assert: require.resolve("assert"),
        async_hooks: false,
        child_process: false,
        cluster: false,
        constants: false,
        crypto: require.resolve("crypto-browserify"),
        dgram: false,
        dns: false,
        events: require.resolve("events-browserify"),
        fs: false,
        http: false,
        https: false,
        net: false,
        os: false,
        path: false,
        perf_hooks: false,
        querystring: require.resolve("querystring-browser"),
        repl: false,
        stream: require.resolve("stream-browserify"),
        tls: false,
        v8: false,
        zlib: false,
      };
      return config;
    },

    eslint: {
      dirs: [
        "src/client",
        "src/pages",
        "src/server",
        "src/shared",
        "src/galois/js",
      ],
      ignoreDuringBuilds: true,
    },

    typescript: {
      ignoreBuildErrors: true,
      tsconfigPath: "tsconfig.next.json",
    },

    // AFAIK, this is the only way to have nextjs generate source maps in
    // production. In our deploy step, we remove these from the public directory
    // and upload them to a non-public bucket instead so that we can
    // de-obfuscate source maps later.
    productionBrowserSourceMaps: isProd,
  })
);

// Applies workaround from https://github.com/vercel/next.js/issues/29362#issuecomment-971377869,
// as otherwise there is an issue internal to nextjs around webpacking imported
// wasm files. Amusingly, even NextJS's own wasm example has a
// (different, though suggested previously by the same person https://github.com/vercel/next.js/issues/29362#issuecomment-932767530)
// workaround for this: https://github.com/vercel/next.js/blob/a7a9777ddc78dbe2c7772b010f53aa7a93322b4a/examples/with-webassembly/next.config.js#L6-L9
class WasmChunksFixPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("WasmChunksFixPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: "WasmChunksFixPlugin" },
        (assets) =>
          Object.entries(assets).forEach(([pathname, source]) => {
            if (!pathname.match(/chunks\/.*\.wasm$/)) return;
            compilation.deleteAsset(pathname);

            const name = pathname.split("/").slice(1);
            const info = compilation.assetsInfo.get(pathname);
            compilation.emitAsset(name, source, info);
          })
      );
    });
  }
}
