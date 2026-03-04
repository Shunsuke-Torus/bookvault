"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SeriesItem {
    id: number;
    title: string;
    author: string;
    publisher: string | null;
    coverImageUrl: string | null;
    status: string;
    totalVolumes: number | null;
    bookCount: number;
    ownedCount: number;
    readCount: number;
}

export default function HomePage() {
    const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/series")
            .then((res) => res.json())
            .then((data) => setSeriesList(data.series || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const totalSeries = seriesList.length;
    const totalBooks = seriesList.reduce((a, s) => a + s.bookCount, 0);
    const totalRead = seriesList.reduce((a, s) => a + s.readCount, 0);

    const unreadSeries = seriesList.filter((s) => s.readCount < s.bookCount);
    const readingSeries = seriesList.filter((s) => s.readCount > 0 && s.readCount < s.bookCount);
    const recentSeries = [...seriesList].slice(0, 10);

    if (loading) {
        return (
            <div className="text-center py-16 text-text-muted">
                読み込み中...
            </div>
        );
    }

    return (
        <>
            {/* 統計カード */}
            <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="bg-bg-secondary rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-text-primary">{totalSeries}</div>
                    <div className="text-xs text-text-muted font-medium mt-0.5">シリーズ</div>
                </div>
                <div className="bg-bg-secondary rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-text-primary">{totalBooks}</div>
                    <div className="text-xs text-text-muted font-medium mt-0.5">全書籍</div>
                </div>
                <div className="bg-bg-secondary rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-text-primary">{totalRead}</div>
                    <div className="text-xs text-text-muted font-medium mt-0.5">既読</div>
                </div>
            </div>

            {/* 空状態 */}
            {seriesList.length === 0 ? (
                <div className="text-center py-16">
                    <span className="material-symbols-outlined text-5xl text-text-muted">library_books</span>
                    <div className="text-base text-text-muted mt-3">ライブラリに書籍がありません</div>
                    <p className="text-sm text-text-muted mt-2">
                        <Link href="/search" className="text-accent-blue hover:underline">
                            検索ページ
                        </Link>
                        から書籍を検索して登録しましょう
                    </p>
                </div>
            ) : (
                <>
                    {/* 未読の単行本 */}
                    {unreadSeries.length > 0 && (
                        <ScrollSection
                            icon="menu_book"
                            title="未読の単行本"
                            moreHref="/bookshelf"
                            items={unreadSeries}
                            renderMeta={(s) => `${s.readCount}/${s.bookCount}巻`}
                        />
                    )}

                    {/* 読書中 */}
                    {readingSeries.length > 0 && (
                        <ScrollSection
                            icon="auto_stories"
                            title="読書中"
                            items={readingSeries}
                            renderMeta={(s) => `${s.readCount}/${s.bookCount}巻`}
                        />
                    )}

                    {/* 最近追加 */}
                    {recentSeries.length > 0 && (
                        <ScrollSection
                            icon="new_releases"
                            title="最近追加"
                            items={recentSeries}
                            renderMeta={(s) => s.author}
                        />
                    )}
                </>
            )}

            <div className="h-10" />
        </>
    );
}

function ScrollSection({
    icon,
    title,
    moreHref,
    items,
    renderMeta,
}: {
    icon: string;
    title: string;
    moreHref?: string;
    items: SeriesItem[];
    renderMeta: (s: SeriesItem) => string;
}) {
    return (
        <div className="mt-7">
            <div className="flex items-center justify-between mb-3">
                <h2 className="flex items-center gap-1.5 text-base font-semibold text-text-primary">
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    {title}
                </h2>
                {moreHref && (
                    <Link href={moreHref} className="text-xs text-text-muted font-medium hover:text-text-secondary transition-colors">
                        もっと見る
                    </Link>
                )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 -mx-1 scrollbar-hide snap-x snap-mandatory">
                {items.map((s) => (
                    <Link
                        key={s.id}
                        href={`/series/${s.id}`}
                        className="flex-none w-[126px] snap-start group p-2 rounded-lg transition-colors duration-150 hover:bg-bg-hover"
                    >
                        {s.coverImageUrl ? (
                            <img
                                src={s.coverImageUrl}
                                alt={s.title}
                                className="w-[110px] h-[156px] rounded-md object-cover bg-bg-secondary block transition-all duration-150 group-hover:shadow-lg group-hover:scale-[1.03] group-hover:brightness-95"
                            />
                        ) : (
                            <div className="w-[110px] h-[156px] rounded-md bg-bg-secondary flex items-center justify-center transition-all duration-150 group-hover:shadow-lg group-hover:bg-bg-hover">
                                <span className="material-symbols-outlined text-3xl text-text-muted">book</span>
                            </div>
                        )}
                        <div className="text-xs font-medium mt-1.5 truncate text-text-primary">{s.title}</div>
                        <div className="text-[11px] text-text-muted">{renderMeta(s)}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

