/** @type {import('next').NextConfig} */
const nextConfig = {
    // API rewrites to proxy backend requests
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:4242/:path*',
            },
        ];
    },
    // Image optimization config - allow local images
    images: {
        remotePatterns: [],
    },
};

export default nextConfig;
