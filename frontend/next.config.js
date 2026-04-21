/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'via.placeholder.com'],
  },
  // Optimize file watching to prevent EMFILE errors
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },
  // Reduce file watchers (EMFILE on macOS) and optionally use polling in dev.
  webpack: (config, { dev }) => {
    const usePoll =
      process.env.NEXT_DEV_POLL === '1' ||
      (process.env.NEXT_DEV_POLL !== '0' && dev && process.platform === 'darwin')
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      ...(usePoll ? { poll: 2000, aggregateTimeout: 400 } : {}),
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
