/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    // Enable WebAssembly support for Puppeteer, which is used for PDF generation.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // Workaround for "node:process" UnhandledSchemeError.
    // This error occurs when a server-side dependency (like firebase-admin or genkit)
    // uses Node.js-specific imports that Webpack tries to resolve in the client bundle.
    // By aliasing "node:process" to `false` for the client-side build, we instruct
    // Webpack to ignore it, as it's not needed in the browser.
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:process': false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
