/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable WASM
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
        };
        return config;
    }
};

export default nextConfig;
