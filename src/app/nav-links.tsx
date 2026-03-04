"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
    const pathname = usePathname();

    const links = [
        { href: "/", label: "ホーム", icon: "home" },
        { href: "/bookshelf", label: "本棚", icon: "shelves" },
        { href: "/search", label: "検索", icon: "search" },
    ];

    return (
        <nav className="flex items-center gap-1">
            {links.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${pathname === link.href
                        ? "bg-bg-secondary text-text-primary font-semibold"
                        : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                        }`}
                >
                    <span
                        className="material-symbols-outlined text-[18px]"
                        style={{
                            fontVariationSettings:
                                pathname === link.href
                                    ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                        }}
                    >
                        {link.icon}
                    </span>
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
