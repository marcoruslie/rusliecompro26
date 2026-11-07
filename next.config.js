/** @type {import('next').NextConfig} */
const nextConfig = {
  // Send the bare root to the default locale. Done here rather than only in
  // app/page.tsx: permanentRedirect() on a statically prerendered page yields
  // a 308 with no Location header (Next 14.2), which crawlers can't follow.
  // Keep the destination in sync with DEFAULT_LOCALE in lib/seo.ts.
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: true }];
  },
};
module.exports = nextConfig;
