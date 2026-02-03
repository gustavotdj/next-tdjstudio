/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // reactCompiler: true, // Temporarily disabled to rule out compatibility issues with Netlify Runtime
  // Desabilitando Turbopack se estiver causando travamentos
  experimental: {
    // turbopack: false, 
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-bda4e0cde0744458a86505446fbabd2d.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },

  redirects() {
    return [
      {
        source: '/docs',
        destination: 'https://docs.netlify.com/frameworks/next-js/overview/',
        permanent: false,
      },
      {
        source: '/old-blog/:slug',
        destination: '/classics',
        permanent: true,
      },
      {
        source: '/github',
        destination: 'https://github.com/netlify-templates/next-platform-starter',
        permanent: false,
      },
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/quotes/random',
      },
      {
        source: '/blog',
        destination: '/classics',
      },
    ];
  },
};

export default nextConfig;
