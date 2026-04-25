import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: "books.google.com",
                pathname: "/books/content/**",
            },
            {
                protocol: "https",
                hostname: "books.google.com",
                pathname: "/books/content/**",
            },
        ],
    },
};

export default nextConfig;
