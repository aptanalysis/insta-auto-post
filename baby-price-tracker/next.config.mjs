/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql", "web-push"],
  images: { unoptimized: true },
};
export default nextConfig;
