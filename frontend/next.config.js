/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'via.placeholder.com'],
  },
  // Optimize file watching to prevent EMFILE errors
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },
  // Reduce the number of files being watched
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/.git', '**/.next'],
    }
    return config
  },
  // Proxy API requests to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
