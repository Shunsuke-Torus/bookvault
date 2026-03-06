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
    publishedAt: string | null;
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

interface Platform {
    id: number;
    name: string;
    displayName: string;
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

    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [addingOwnershipForBooks, setAddingOwnershipForBooks] = useState<number[]>([]);
    const [ownershipForm, setOwnershipForm] = useState({
        platformName: "",
        format: "digital",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetch(`/api/series?id=${id}`)
            .then((res) => res.json())
            .then((d) => setData(d))
            .catch(console.error)
            .finally(() => setLoading(false));

        fetch("/api/platforms")
            .then((res) => res.json())
            .then((d) => setPlatforms(d.platforms || []))
            .catch(console.error);
    }, [id]);

    const reloadData = async () => {
        const res = await fetch(`/api/series?id=${id}`);
        const d = await res.json();
        setData(d);
    };

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
        // 所有権がある本のみ既読/未読を更新できるようにする
        const ownedSelectedIds = Array.from(selectedIds).filter(bookId => {
            const b = data.books.find(x => x.id === bookId);
            return b && b.ownerships && b.ownerships.length > 0;
        });

        for (const bookId of ownedSelectedIds) {
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
        await reloadData();
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

    async function handleAddOwnership(e: React.FormEvent) {
        e.preventDefault();
        if (addingOwnershipForBooks.length === 0 || !ownershipForm.platformName) return;

        setIsSubmitting(true);
        try {
            // 選択された全ての本に対して所有権を登録
            for (const bookId of addingOwnershipForBooks) {
                const res = await fetch("/api/ownerships", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        bookId: bookId,
                        platformName: ownershipForm.platformName,
                        format: ownershipForm.format,
                    }),
                });
                if (!res.ok) {
                    const errData = await res.json();
                    console.error("所有追加エラー:", errData);
                }
            }

            setAddingOwnershipForBooks([]);
            setOwnershipForm({ platformName: "", format: "digital" });
            await reloadData();
            setSelectedIds(new Set());
            setBatchMode(false);
        } catch (error) {
            console.error(error);
            alert("所有情報の追加に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    }

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

    // 所有している本のみカウント
    const ownedBooks = books.filter(b => b.ownerships && b.ownerships.length > 0);
    const readCount = ownedBooks.filter((b) => b.readingStatus === "read").length;

    const latestBook = sortedBooks[sortedBooks.length - 1];
    const coverImage =
        series.coverImageUrl ||
        latestBook?.coverImageUrl ||
        sortedBooks[0]?.coverImageUrl ||
        null;

    const now = new Date();

    // 一括操作用データの準備
    const selectedBooks = data.books.filter(b => selectedIds.has(b.id));
    const unownedSelected = selectedBooks.filter(b => !b.ownerships || b.ownerships.length === 0);
    const ownedSelected = selectedBooks.filter(b => b.ownerships && b.ownerships.length > 0);

    return (
        <>
            <Link href="/bookshelf" className="inline-flex items-center gap-1 text-sm text-text-muted py-3 hover:text-text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                本棚
            </Link>

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

                    <div className="mt-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <span className={`material-symbols-outlined text-[18px] ${readCount > 0 && readCount === ownedBooks.length ? "text-accent-green" : "text-text-muted"}`}>
                                {readCount > 0 && readCount === ownedBooks.length ? "check_circle" : "menu_book"}
                            </span>
                            <span className={readCount > 0 && readCount === ownedBooks.length ? "text-accent-green" : "text-text-primary"}>
                                {readCount}/{ownedBooks.length}冊 読了 (所有冊数)
                            </span>
                        </div>
                        <div className="mt-1.5 w-full max-w-[200px] h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent-green rounded-full transition-all duration-300"
                                style={{ width: `${ownedBooks.length > 0 ? (readCount / ownedBooks.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span>{ownedBooks.length}巻 所有</span>
                        {series.totalVolumes && <span>（全{series.totalVolumes}巻）</span>}
                        {series.status === "ongoing" && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px] font-medium">連載中</span>}
                        {series.status === "completed" && <span className="px-1.5 py-0.5 bg-accent-green/10 text-accent-green rounded text-[10px] font-medium">完結</span>}
                    </div>
                </div>
            </div>

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

            <div className="flex border-b border-border mt-4 mb-4">
                <div className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-text-primary border-b-2 border-text-primary">
                    <span className="material-symbols-outlined text-[18px]">book</span>
                    単行本（{books.length}）
                </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
                {sortedBooks.map((book) => {
                    const bookUrl = getBookUrl(book);
                    const isOwned = book.ownerships && book.ownerships.length > 0;

                    let isUpcoming = false;
                    let pubDateStr = "";
                    if (book.publishedAt) {
                        const parsedDate = new Date(book.publishedAt);
                        if (!isNaN(parsedDate.getTime()) && parsedDate > now) {
                            isUpcoming = true;
                            pubDateStr = `${parsedDate.getFullYear()}/${parsedDate.getMonth() + 1}/${parsedDate.getDate()}`;
                        } else if (!isNaN(parsedDate.getTime())) {
                            pubDateStr = `${parsedDate.getFullYear()}/${parsedDate.getMonth() + 1}/${parsedDate.getDate()}`;
                        }
                    }

                    return (
                        <div
                            key={book.id}
                            className={`flex items-center gap-3 px-3.5 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-bg-hover
                                ${!isOwned ? (isUpcoming ? "bg-blue-500/5 opacity-80" : "bg-bg-secondary/50 opacity-90") : "bg-bg-primary"}
                            `}
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

                            {/* 表紙 */}
                            {book.coverImageUrl ? (
                                <img src={book.coverImageUrl} alt="" className={`w-11 h-[62px] rounded object-cover shrink-0 ${!isOwned ? 'grayscale-[0.4] opacity-80' : ''}`} />
                            ) : (
                                <div className="w-11 h-[62px] rounded bg-bg-secondary shrink-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-lg text-text-muted">book</span>
                                </div>
                            )}

                            {/* 詳細 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className={`text-sm font-semibold truncate ${!isOwned ? 'text-text-secondary' : ''}`}>
                                        {book.volumeNumber ? `${book.volumeNumber}巻` : book.title}
                                    </div>
                                    {!isOwned && isUpcoming && (
                                        <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded text-[9px] font-bold shrink-0">
                                            新刊予約
                                        </span>
                                    )}
                                    {!isOwned && !isUpcoming && (
                                        <span className="px-1.5 py-0.5 bg-text-muted text-white rounded text-[9px] font-bold shrink-0">
                                            未所有
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-text-muted mt-0.5">
                                    {!isOwned && pubDateStr ? `発売日: ${pubDateStr}` : ""}
                                    {isOwned && book.createdAt ? `登録日: ${book.createdAt.split("T")[0]}` : ""}
                                </div>
                                {/* 所有プラットフォーム・URL */}
                                {isOwned && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {book.ownerships.map((own) => (
                                            <span key={own.id} className="text-[10px] px-1.5 py-0.5 bg-bg-secondary border border-border rounded text-text-secondary font-medium">
                                                {own.platformDisplayName}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* アクション: 未所有時は「追加」、所有時は「既読トグル＆URL遷移」 */}
                            {!isOwned ? (
                                <button
                                    onClick={() => setAddingOwnershipForBooks([book.id])}
                                    className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 text-accent flex items-center justify-center hover:bg-accent/20 transition-colors"
                                    title="所有書籍として追加する"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                </button>
                            ) : (
                                <>
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
                                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${book.readingStatus === "read"
                                            ? "bg-accent-green border-accent-green text-white"
                                            : "border-border hover:border-accent-green hover:bg-accent-green-bg"
                                            }`}
                                    >
                                        {book.readingStatus === "read" && (
                                            <span className="material-symbols-outlined text-[14px]">check</span>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 一括操作バー */}
            {batchMode && selectedIds.size > 0 && (
                <div className="sticky bottom-0 bg-bg-primary border-t border-border py-4 px-5 flex flex-wrap gap-3 justify-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40">
                    {unownedSelected.length > 0 && (
                        <button
                            onClick={() => setAddingOwnershipForBooks(unownedSelected.map(b => b.id))}
                            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors hover:bg-blue-600 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            一括所有登録（{unownedSelected.length}冊）
                        </button>
                    )}

                    {ownedSelected.length > 0 && (
                        <>
                            <button
                                onClick={() => batchUpdateStatus("unread")}
                                className="px-5 py-2.5 border border-border hover:border-border-hover rounded-xl text-sm text-text-secondary bg-bg-secondary cursor-pointer transition-colors shadow-sm"
                            >
                                未読に戻す
                            </button>
                            <button
                                onClick={() => batchUpdateStatus("read")}
                                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-medium cursor-pointer transition-colors hover:bg-accent-hover shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                既読にする（{ownedSelected.length}冊）
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* 所有追加モーダル */}
            {addingOwnershipForBooks.length > 0 && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setAddingOwnershipForBooks([])}>
                    <div className="bg-bg-primary rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-text-primary mb-4 text-center">所有情報を追加</h3>
                        {addingOwnershipForBooks.length > 1 && (
                            <div className="mb-4 text-sm text-blue-600 bg-blue-500/10 px-3 py-2 rounded-lg text-center font-medium">
                                {addingOwnershipForBooks.length}冊をまとめて登録します
                            </div>
                        )}
                        <form onSubmit={handleAddOwnership}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">プラットフォーム <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full border border-border rounded-xl px-4 py-2.5 bg-bg-secondary text-sm outline-none focus:border-accent transition-colors"
                                    value={ownershipForm.platformName}
                                    onChange={e => setOwnershipForm({ ...ownershipForm, platformName: e.target.value })}
                                    required
                                >
                                    <option value="">プラットフォームを選択</option>
                                    {platforms.map(p => (
                                        <option key={p.id} value={p.name}>{p.displayName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">フォーマット</label>
                                <select
                                    className="w-full border border-border rounded-xl px-4 py-2.5 bg-bg-secondary text-sm outline-none focus:border-accent transition-colors"
                                    value={ownershipForm.format}
                                    onChange={e => setOwnershipForm({ ...ownershipForm, format: e.target.value })}
                                >
                                    <option value="digital">電子書籍 (Digital)</option>
                                    <option value="physical">紙媒体 (Physical)</option>
                                </select>
                            </div>
                            <div className="flex gap-3 justify-end mt-2">
                                <button type="button" onClick={() => setAddingOwnershipForBooks([])} className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer">
                                    キャンセル
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-sm hover:bg-accent-hover transition-all disabled:opacity-50 cursor-pointer">
                                    {isSubmitting ? "追加中..." : "追加する"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="h-20" />
        </>
    );
}
