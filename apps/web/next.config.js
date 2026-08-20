/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.28', '192.168.1.19', '*.loca.lt'],
  async rewrites() {
    return [
      {
        source: '/api-backend/:path*',
        destination: `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:5000'}/:path*`,
      },
    ];
  },
};
export default nextConfig;

