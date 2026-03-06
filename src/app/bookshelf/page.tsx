"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SeriesItem {
    id: number;
    title: string;
    author: string;
    coverImageUrl: string | null;
    bookCount: number;
    ownedCount: number;
    readCount: number;
}

export default function BookshelfPage() {
    const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
    const [filter, setFilter] = useState<"all" | "unread" | "reading">("all");
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetch("/api/series")
            .then((res) => res.json())
            .then((data) => setSeriesList(data.series || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = seriesList.filter((s) => {
        if (filter === "unread") return s.readCount < s.bookCount;
        if (filter === "reading") return s.readCount > 0 && s.readCount < s.bookCount;
        return true;
    });

    function toggleSelectForDelete(id: number) {
        setSelectedForDelete(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleBulkDelete() {
        if (selectedForDelete.size === 0) return;
        if (!confirm(`選択した ${selectedForDelete.size} 件のシリーズをライブラリから削除しますか？\n（関連するすべての巻・所有情報が消去されます）`)) return;

        setIsDeleting(true);
        try {
            const deletePromises = Array.from(selectedForDelete).map(id =>
                fetch(`/api/series?id=${id}`, { method: "DELETE" })
            );
            await Promise.all(deletePromises);

            setSeriesList(prev => prev.filter(s => !selectedForDelete.has(s.id)));
            setSelectedForDelete(new Set());
            setIsDeleteMode(false);
        } catch (error) {
            console.error(error);
            alert("シリーズの削除に失敗しました");
        } finally {
            setIsDeleting(false);
        }
    }

    const totalBooks = seriesList.reduce((a, s) => a + s.bookCount, 0);
    const totalRead = seriesList.reduce((a, s) => a + s.readCount, 0);

    const filters = [
        { key: "all" as const, label: "すべて", icon: "apps" },
        { key: "unread" as const, label: "未読あり", icon: "visibility_off" },
        { key: "reading" as const, label: "読書中", icon: "auto_stories" },
    ];

    if (loading) {
        return <div className="text-center py-16 text-text-muted">読み込み中...</div>;
    }

    return (
        <>
            <h1 className="text-xl font-bold pt-5">本棚</h1>

            {/* フィルターバー */}
            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm border transition-all duration-150 whitespace-nowrap cursor-pointer ${filter === f.key
                                ? "border-accent bg-accent text-white"
                                : "border-border bg-bg-primary text-text-secondary hover:border-border-hover hover:bg-bg-secondary"
                                }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {isDeleteMode ? (
                        <>
                            <button
                                onClick={() => {
                                    setIsDeleteMode(false);
                                    setSelectedForDelete(new Set());
                                }}
                                className="px-3 py-1.5 text-sm rounded-full border border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedForDelete.size === 0 || isDeleting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                {selectedForDelete.size}件を削除
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsDeleteMode(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-border bg-bg-primary text-text-secondary hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                            title="複数選択して削除"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            削除
                        </button>
                    )}
                </div>
            </div>

            {/* サマリー */}
            <div className="text-sm text-text-muted mt-3 flex items-center gap-2">
                <span>{filtered.length}作品</span>
                <span className="text-accent-green flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    {totalRead}/{totalBooks}冊
                </span>
            </div>

            {/* 2列グリッド */}
            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <span className="material-symbols-outlined text-5xl text-text-muted">shelves</span>
                    <div className="text-base text-text-muted mt-3">該当する作品がありません</div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                    {filtered.map((s) => {
                        const isSelected = selectedForDelete.has(s.id);

                        const CardContent = (
                            <>
                                {isDeleteMode && (
                                    <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors data-[selected=true]:bg-red-500 data-[selected=true]:border-red-500 data-[selected=true]:text-white data-[selected=false]:bg-bg-primary data-[selected=false]:border-border" data-selected={isSelected}>
                                        {isSelected && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                                    </div>
                                )}
                                {s.coverImageUrl ? (
                                    <img
                                        src={s.coverImageUrl}
                                        alt={s.title}
                                        className="w-14 h-20 rounded object-cover bg-bg-secondary shrink-0 transition-transform duration-150 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-14 h-20 rounded bg-bg-secondary shrink-0 flex items-center justify-center transition-colors duration-150 group-hover:bg-bg-hover">
                                        <span className="material-symbols-outlined text-2xl text-text-muted">book</span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="text-sm font-semibold truncate">{s.title}</div>
                                    <div className="text-xs text-text-secondary mt-0.5">{s.author}</div>
                                    <div className="text-xs text-accent-green flex items-center gap-1 mt-1">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        {s.readCount}/{s.bookCount}冊
                                    </div>
                                </div>
                            </>
                        );

                        const cardClassName = `relative flex gap-3 p-3.5 bg-bg-primary border rounded-xl transition-all duration-150 group ${isDeleteMode
                                ? (isSelected ? 'border-red-400 bg-red-50/50 cursor-pointer' : 'border-border hover:border-red-300 cursor-pointer')
                                : 'border-border hover:bg-bg-hover active:bg-bg-active'
                            }`;

                        if (isDeleteMode) {
                            return (
                                <div key={s.id} className={cardClassName} onClick={() => toggleSelectForDelete(s.id)}>
                                    {CardContent}
                                </div>
                            );
                        }

                        return (
                            <Link key={s.id} href={`/series/${s.id}`} className={cardClassName}>
                                {CardContent}
                            </Link>
                        );
                    })}
                </div>
            )}

            <div className="h-10" />
        </>
    );
}
