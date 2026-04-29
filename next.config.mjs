/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.115','192.168.4.57'],
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      // Netlify deploy badge in the Footer.
      {
        protocol: 'https',
        hostname: 'api.netlify.com',
        pathname: '/api/v1/badges/**',
      },
    ],
  },
  reactStrictMode: true,
  trailingSlash: true,
};

export default nextConfig;
