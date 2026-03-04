import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { NavLinks } from "./nav-links";

export const metadata: Metadata = {
    title: "BookVault - 書籍管理",
    description:
        "電子書籍・紙書籍の一元管理、読書進捗追跡を提供するセルフホスト型書籍管理アプリケーション",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja" suppressHydrationWarning>
            <head>
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                />
            </head>
            <body className="bg-bg-primary text-text-primary leading-relaxed" suppressHydrationWarning>
                <header className="sticky top-0 z-50 bg-bg-primary border-b border-border">
                    <div className="max-w-[960px] mx-auto px-5 flex items-center justify-between h-14">
                        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-text-primary no-underline">
                            <span className="material-symbols-outlined text-2xl">library_books</span>
                            BookVault
                        </Link>
                        <NavLinks />
                    </div>
                </header>
                <main className="max-w-[960px] mx-auto px-5">{children}</main>
            </body>
        </html>
    );
}
