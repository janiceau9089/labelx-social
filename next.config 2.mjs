/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow remote image hosts you fetch thumbnails from (extend as needed).
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
