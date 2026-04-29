import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',') ?? [
    '192.168.0.115',
    '192.168.4.57',
  ],
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

// MDX is wired up so editorial content under `content/` can be
// imported as React components from any TSX route. We don't add
// `.mdx` to `pageExtensions` because pages stay in `app/` as TSX
// route handlers; the MDX is the body, not the route.
const withMDX = createMDX({
  // Default remark/rehype plugins are fine for now. Add MDX-specific
  // plugins (e.g. remark-gfm for tables) here if a content page
  // needs them.
});

export default withMDX(nextConfig);
