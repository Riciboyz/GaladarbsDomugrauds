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
    // Reduce ChunkLoadError timeouts on slower disks / Windows Defender scans
    config.output = { ...config.output, chunkLoadTimeout: 120000 }
    return config
  },
  // Proxy API requests to backend
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
