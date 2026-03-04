"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface BookItem {
    id: number;
    title: string;
    volumeNumber: number | null;
    coverImageUrl: string | null;
    readingStatus: string;
    isbn: string | null;
    createdAt: string;
}

interface SeriesDetail {
    id: number;
    title: string;
    author: string;
    publisher: string | null;
    coverImageUrl: string | null;
    totalVolumes: number | null;
    status: string;
    bookCount: number;
    ownedCount: number;
    readCount: number;
    books: BookItem[];
}

export default function SeriesDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const [series, setSeries] = useState<SeriesDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [batchMode, setBatchMode] = useState(false);

    useEffect(() => {
        fetch(`/api/series?id=${id}`)
            .then((res) => res.json())
            .then((data) => setSeries(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    function toggleSelect(bookId: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(bookId)) next.delete(bookId);
            else next.add(bookId);
            return next;
        });
    }

    function toggleSelectAll() {
        if (!series) return;
        const allIds = series.books.map((b) => b.id);
        const allSelected = allIds.every((id) => selectedIds.has(id));
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(allIds));
    }

    async function batchUpdateStatus(status: "read" | "unread") {
        if (!series) return;
        for (const bookId of selectedIds) {
            try {
                await fetch("/api/books", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: bookId, readingStatus: status }),
                });
            } catch (err) {
                console.error("更新エラー:", err);
            }
        }
        const res = await fetch(`/api/series?id=${id}`);
        const data = await res.json();
        setSeries(data);
        setSelectedIds(new Set());
        setBatchMode(false);
    }

    async function toggleReadStatus(bookId: number, currentStatus: string) {
        const newStatus = currentStatus === "read" ? "unread" : "read";
        try {
            await fetch("/api/books", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: bookId, readingStatus: newStatus }),
            });
            if (series) {
                setSeries({
                    ...series,
                    readCount: newStatus === "read" ? series.readCount + 1 : series.readCount - 1,
                    books: series.books.map((b) =>
                        b.id === bookId ? { ...b, readingStatus: newStatus } : b
                    ),
                });
            }
        } catch (err) {
            console.error("更新エラー:", err);
        }
    }

    if (loading) {
        return <div className="text-center py-16 text-text-muted">読み込み中...</div>;
    }

    if (!series) {
        return (
            <div className="text-center py-16">
                <span className="material-symbols-outlined text-5xl text-text-muted">error</span>
                <div className="text-base text-text-muted mt-3">シリーズが見つかりません</div>
                <Link href="/bookshelf" className="inline-flex items-center gap-1 text-sm text-text-muted mt-4 hover:text-text-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    本棚に戻る
                </Link>
            </div>
        );
    }

    const sortedBooks = [...series.books].sort((a, b) => (a.volumeNumber ?? 999) - (b.volumeNumber ?? 999));

    return (
        <>
            {/* 戻るリンク */}
            <Link href="/bookshelf" className="inline-flex items-center gap-1 text-sm text-text-muted py-3 hover:text-text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                本棚
            </Link>

            {/* シリーズヘッダー */}
            <div className="flex gap-5 py-4 max-sm:flex-col max-sm:items-center max-sm:text-center">
                {series.coverImageUrl ? (
                    <img
                        src={series.coverImageUrl}
                        alt={series.title}
                        className="w-[120px] h-[170px] rounded-md object-cover bg-bg-secondary shrink-0 shadow-md"
                    />
                ) : (
                    <div className="w-[120px] h-[170px] rounded-md bg-bg-secondary shrink-0 flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-4xl text-text-muted">book</span>
                    </div>
                )}
                <div className="flex-1">
                    <div className="text-xl font-bold">{series.title}</div>
                    <div className="text-sm text-text-secondary mt-0.5">{series.author}</div>
                    {series.publisher && <div className="text-xs text-text-muted mt-0.5">{series.publisher}</div>}
                    <div className="flex items-center gap-1.5 text-sm text-accent-green mt-2.5 font-medium">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        {series.readCount}/{series.bookCount}冊
                    </div>
                </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${batchMode
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-bg-primary text-text-secondary hover:border-border-hover hover:bg-bg-secondary"
                        }`}
                >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    一括編集
                </button>
                {batchMode && (
                    <button
                        onClick={toggleSelectAll}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm border border-border bg-bg-primary text-text-secondary transition-all cursor-pointer hover:border-border-hover hover:bg-bg-secondary"
                    >
                        <span className="material-symbols-outlined text-[16px]">select_all</span>
                        すべて選択
                    </button>
                )}
            </div>

            {/* タブ */}
            <div className="flex border-b border-border mt-4 mb-4">
                <div className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-text-primary border-b-2 border-text-primary">
                    <span className="material-symbols-outlined text-[18px]">book</span>
                    単行本（{series.bookCount}）
                </div>
            </div>

            {/* 巻リスト */}
            <div className="border border-border rounded-xl overflow-hidden">
                {sortedBooks.map((book) => (
                    <div
                        key={book.id}
                        className="flex items-center gap-3 px-3.5 py-3 border-b border-border last:border-b-0 bg-bg-primary transition-colors hover:bg-bg-hover"
                    >
                        {batchMode && (
                            <button
                                type="button"
                                onClick={() => toggleSelect(book.id)}
                                className={`w-[22px] h-[22px] rounded flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer ${selectedIds.has(book.id)
                                        ? "bg-accent-green border-accent-green text-white"
                                        : "border-border-hover bg-bg-primary hover:border-accent"
                                    }`}
                            >
                                {selectedIds.has(book.id) && <span className="material-symbols-outlined text-[16px]">check</span>}
                            </button>
                        )}
                        {book.coverImageUrl ? (
                            <img src={book.coverImageUrl} alt="" className="w-11 h-[62px] rounded object-cover bg-bg-secondary shrink-0" />
                        ) : (
                            <div className="w-11 h-[62px] rounded bg-bg-secondary shrink-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg text-text-muted">book</span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">{book.volumeNumber ? `${book.volumeNumber}巻` : book.title}</div>
                            <div className="text-xs text-text-muted">
                                {book.createdAt ? `追加日: ${book.createdAt.split("T")[0]}` : ""}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => toggleReadStatus(book.id, book.readingStatus)}
                            title={book.readingStatus === "read" ? "既読" : "未読 → クリックで既読にする"}
                            className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${book.readingStatus === "read"
                                    ? "bg-accent-green border-accent-green text-white"
                                    : "border-border hover:border-accent-green hover:bg-accent-green-bg"
                                }`}
                        >
                            {book.readingStatus === "read" && (
                                <span className="material-symbols-outlined text-[14px]">check</span>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* 一括操作バー */}
            {batchMode && selectedIds.size > 0 && (
                <div className="sticky bottom-0 bg-bg-primary border-t border-border py-3 px-5 flex gap-3 justify-center shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={() => batchUpdateStatus("unread")}
                        className="px-5 py-2.5 border border-border rounded-xl text-sm text-text-secondary bg-transparent cursor-pointer transition-colors hover:bg-bg-secondary"
                    >
                        未読に戻す
                    </button>
                    <button
                        onClick={() => batchUpdateStatus("read")}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium cursor-pointer transition-colors hover:bg-accent-hover"
                    >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        既読にする（{selectedIds.size}冊）
                    </button>
                </div>
            )}

            <div className="h-16" />
        </>
    );
}
