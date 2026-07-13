import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // PDF önizleme API'lerinin iframe içinde yüklenebilmesi için X-Frame-Options ve CSP'yi SAMEORIGIN olarak eziyoruz.
        source: "/api/pdf/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; frame-ancestors 'self'; object-src 'none'",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
      {
        // Evrak kontrol PDF önizleme API'lerinin de iframe içinde yüklenebilmesi için güvenlik başlıklarını eziyoruz.
        source: "/api/evrak-kontrol/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; frame-ancestors 'self'; object-src 'none'",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
      {
        // Mobil veya diğer evrak kontrol PDF uç noktaları için de iframe/önizleme desteğini aynı kaynaktan izinli olacak şekilde açıyoruz.
        source: "/api/mobile/v1/:path*/pdf",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; frame-ancestors 'self'; object-src 'none'",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
