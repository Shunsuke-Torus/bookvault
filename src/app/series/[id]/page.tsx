"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface OwnershipInfo {
    id: number;
    platformDisplayName: string;
    customUrl: string | null;
    platformBookId: string | null;
    bookUrlTemplate: string | null;
    libraryUrl: string | null;
    format: string;
}

interface BookItem {
    id: number;
    title: string;
    volumeNumber: number | null;
    coverImageUrl: string | null;
    readingStatus: string;
    isbn: string | null;
    createdAt: string;
    ownerships: OwnershipInfo[];
}

interface SeriesData {
    id: number;
    title: string;
    author: string;
    publisher: string | null;
    coverImageUrl: string | null;
    totalVolumes: number | null;
    status: string;
    description: string | null;
}

interface SeriesResponse {
    series: SeriesData;
    books: BookItem[];
}

export default function SeriesDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const [data, setData] = useState<SeriesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [batchMode, setBatchMode] = useState(false);

    useEffect(() => {
        fetch(`/api/series?id=${id}`)
            .then((res) => res.json())
            .then((d) => setData(d))
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
        if (!data) return;
        const allIds = data.books.map((b) => b.id);
        const allSelected = allIds.every((id) => selectedIds.has(id));
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(allIds));
    }

    async function batchUpdateStatus(status: "read" | "unread") {
        if (!data) return;
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
        const d = await res.json();
        setData(d);
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
            if (data) {
                setData({
                    ...data,
                    books: data.books.map((b) =>
                        b.id === bookId ? { ...b, readingStatus: newStatus } : b
                    ),
                });
            }
        } catch (err) {
            console.error("更新エラー:", err);
        }
    }

    /**
     * 書籍のURLを取得する（customUrl > bookUrlTemplate > libraryUrl）
     */
    function getBookUrl(book: BookItem): string | null {
        if (!book.ownerships || book.ownerships.length === 0) return null;
        const own = book.ownerships[0];
        if (own.customUrl) return own.customUrl;
        if (own.bookUrlTemplate && own.platformBookId) {
            return own.bookUrlTemplate.replace("{id}", own.platformBookId);
        }
        if (own.libraryUrl) return own.libraryUrl;
        return null;
    }

    if (loading) {
        return <div className="text-center py-16 text-text-muted">読み込み中...</div>;
    }

    if (!data) {
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

    const { series, books } = data;
    const sortedBooks = [...books].sort((a, b) => (a.volumeNumber ?? 999) - (b.volumeNumber ?? 999));
    const readCount = books.filter((b) => b.readingStatus === "read").length;

    // 表紙画像: シリーズのcoverImageUrl → 最新巻の表紙 → 1巻の表紙
    const latestBook = sortedBooks[sortedBooks.length - 1];
    const coverImage =
        series.coverImageUrl ||
        latestBook?.coverImageUrl ||
        sortedBooks[0]?.coverImageUrl ||
        null;

    return (
        <>
            {/* 戻るリンク */}
            <Link href="/bookshelf" className="inline-flex items-center gap-1 text-sm text-text-muted py-3 hover:text-text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                本棚
            </Link>

            {/* シリーズヘッダー */}
            <div className="flex gap-5 py-4 max-sm:flex-col max-sm:items-center max-sm:text-center">
                {coverImage ? (
                    <img
                        src={coverImage}
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

                    {/* 読書進捗 */}
                    <div className="mt-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <span className={`material-symbols-outlined text-[18px] ${readCount === books.length ? "text-accent-green" : "text-text-muted"}`}>
                                {readCount === books.length ? "check_circle" : "menu_book"}
                            </span>
                            <span className={readCount === books.length ? "text-accent-green" : "text-text-primary"}>
                                {readCount}/{books.length}冊 読了
                            </span>
                        </div>
                        {/* プログレスバー */}
                        <div className="mt-1.5 w-full max-w-[200px] h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent-green rounded-full transition-all duration-300"
                                style={{ width: `${books.length > 0 ? (readCount / books.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* 巻数情報 */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span>{books.length}巻 所有</span>
                        {series.totalVolumes && <span>（全{series.totalVolumes}巻）</span>}
                        {series.status === "ongoing" && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px] font-medium">連載中</span>}
                        {series.status === "completed" && <span className="px-1.5 py-0.5 bg-accent-green/10 text-accent-green rounded text-[10px] font-medium">完結</span>}
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
                    単行本（{books.length}）
                </div>
            </div>

            {/* 巻リスト */}
            <div className="border border-border rounded-xl overflow-hidden">
                {sortedBooks.map((book) => {
                    const bookUrl = getBookUrl(book);
                    return (
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
                                {/* 所有プラットフォーム・URL */}
                                {book.ownerships && book.ownerships.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {book.ownerships.map((own) => (
                                            <span key={own.id} className="text-[10px] px-1.5 py-0.5 bg-bg-secondary rounded text-text-muted">
                                                {own.platformDisplayName}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* URL リンク */}
                            {bookUrl && (
                                <a
                                    href={bookUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-text-muted transition-colors hover:text-accent hover:bg-bg-secondary"
                                    title="書籍ページを開く"
                                >
                                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                </a>
                            )}
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
                    );
                })}
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
