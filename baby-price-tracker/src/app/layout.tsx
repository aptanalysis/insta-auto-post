import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import SWRegister from "@/components/SWRegister";
import { isMockMode } from "@/lib/naver";

export const metadata: Metadata = {
  title: "육아템 최저가 알리미",
  description: "관심 육아용품의 최저가를 여러 쇼핑몰에서 추적하고, 평소보다 싸지면 알려드려요.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "최저가 알리미", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#f08a24", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mock = isMockMode();
  return (
    <html lang="ko">
      <body>
        <header className="header">
          <div className="container header-inner">
            <a href="/" className="logo">🍼 육아템 최저가 알리미</a>
            <Nav />
          </div>
        </header>
        {mock && (
          <div className="banner">
            <div className="container">
              ⚠️ 데모(MOCK) 모드: 네이버 API 키가 없어 가짜 데이터로 동작 중이에요. <code>.env</code>에 <code>NAVER_CLIENT_ID</code>/<code>NAVER_CLIENT_SECRET</code>을 넣어주세요.
            </div>
          </div>
        )}
        <main className="container">{children}</main>
        <SWRegister />
      </body>
    </html>
  );
}
