"use client";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "카테고리" },
  { href: "/search", label: "검색" },
  { href: "/favorites", label: "⭐ 관심상품" },
  { href: "/alerts", label: "🔔 알림내역" },
  { href: "/settings", label: "설정" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/category") : path.startsWith(l.href);
        return (
          <a key={l.href} href={l.href} className={active ? "active" : ""}>
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
