import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "BookVault - 書籍管理",
    description:
        "電子書籍・紙書籍の一元管理、読書進捗追跡、セール通知を提供するセルフホスト型書籍管理アプリケーション",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <header className="header">
                    <div className="container header-inner">
                        <div className="header-logo">📚 BookVault</div>
                    </div>
                </header>
                <main className="container">{children}</main>
            </body>
        </html>
    );
}
