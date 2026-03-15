/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
  // Extend proxy timeout to 10 minutes — Ollama can be slow on first cold load
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    proxyTimeout: 600_000,  // 10 minutes in ms
  },
}

export default nextConfig
