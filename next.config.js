/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    // Enable WebAssembly support for Puppeteer
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // Workaround for "node:process" UnhandledSchemeError.
    // This error can occur when a server-side dependency (like firebase-admin)
    // uses Node.js-specific imports that Webpack tries to resolve in the client bundle.
    // By aliasing "node:process" to `false` for the client bundle, we tell
    // Webpack to ignore it, as it's not needed on the client.
    if (!isServer) {
        config.resolve.alias = {
            ...config.resolve.alias,
            'node:process': false
        };
    }
    
    return config;
  },
};

module.exports = nextConfig;
