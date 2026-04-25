"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ isMobile = false }: { isMobile?: boolean }) {
    const pathname = usePathname();

    const links = [
        { href: "/", label: "ホーム", icon: "home" },
        { href: "/bookshelf", label: "本棚", icon: "shelves" },
        { href: "/search", label: "検索", icon: "search" },
        { href: "/settings", label: "設定", icon: "settings" },
    ];

    if (isMobile) {
        return (
            <nav className="flex items-center justify-around w-full h-[60px] pb-[env(safe-area-inset-bottom)] max-w-[960px] mx-auto px-2">
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 pt-1 text-[10px] sm:text-xs font-medium transition-colors ${isActive ? "text-accent" : "text-text-secondary hover:text-text-primary"
                                }`}
                        >
                            <span
                                className="material-symbols-outlined text-[24px]"
                                style={{
                                    fontVariationSettings: isActive
                                        ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                                        : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                                }}
                            >
                                {link.icon}
                            </span>
                            <span className="leading-none">{link.label}</span>
                        </Link>
                    )
                })}
            </nav>
        );
    }

    return (
        <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${isActive
                            ? "bg-bg-secondary text-text-primary font-semibold"
                            : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                            }`}
                    >
                        <span
                            className="material-symbols-outlined text-[18px]"
                            style={{
                                fontVariationSettings: isActive
                                    ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                            }}
                        >
                            {link.icon}
                        </span>
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
