"use client";

import { useState, useEffect } from "react";

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

interface SearchResult {
    googleBooksId: string;
    title: string;
    seriesTitle: string | null;
    volumeNumber: number | null;
    authors: string[];
    publisher: string | null;
    coverImageUrl: string | null;
    isbn: string | null;
    listPrice: number | null;
    seriesId: string | null;
}

interface Platform {
    id: number;
    name: string;
    displayName: string;
}

export default function Dashboard() {
    const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedBook, setSelectedBook] = useState<SearchResult | null>(null);
    const [registerForm, setRegisterForm] = useState({
        platformName: "",
        platformBookId: "",
        customUrl: "",
        format: "digital" as "digital" | "physical",
        readingStatus: "unread" as "unread" | "reading" | "read" | "backlog",
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSeries();
        fetchPlatforms();
    }, []);

    async function fetchSeries() {
        try {
            const res = await fetch("/api/series");
            const data = await res.json();
            setSeriesList(data.series || []);
        } catch (err) {
            console.error("シリーズ取得エラー:", err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchPlatforms() {
        try {
            const res = await fetch("/api/platforms");
            const data = await res.json();
            setPlatforms(data.platforms || []);
        } catch (err) {
            console.error("プラットフォーム取得エラー:", err);
        }
    }

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(
                `/api/search?q=${encodeURIComponent(searchQuery)}&maxResults=10`
            );
            const data = await res.json();
            setSearchResults(data.items || []);
        } catch (err) {
            console.error("検索エラー:", err);
        } finally {
            setIsSearching(false);
        }
    }

    function openRegisterModal(result: SearchResult) {
        setSelectedBook(result);
        setShowRegisterModal(true);
        setRegisterForm({
            platformName: "",
            platformBookId: "",
            customUrl: "",
            format: "digital",
            readingStatus: "unread",
        });
    }

    async function handleRegister() {
        if (!selectedBook) return;

        try {
            const res = await fetch("/api/books", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: selectedBook.title,
                    author: selectedBook.authors[0] || "不明",
                    publisher: selectedBook.publisher,
                    volumeNumber: selectedBook.volumeNumber,
                    isbn: selectedBook.isbn,
                    coverImageUrl: selectedBook.coverImageUrl,
                    googleBooksId: selectedBook.googleBooksId,
                    googleSeriesId: selectedBook.seriesId,
                    platformName: registerForm.platformName || undefined,
                    platformBookId: registerForm.platformBookId || undefined,
                    customUrl: registerForm.customUrl || undefined,
                    format: registerForm.format,
                    readingStatus: registerForm.readingStatus,
                }),
            });

            if (res.ok) {
                setShowRegisterModal(false);
                setSelectedBook(null);
                fetchSeries(); // 一覧を更新
            }
        } catch (err) {
            console.error("登録エラー:", err);
        }
    }

    // 統計の計算
    const totalBooks = seriesList.reduce((acc, s) => acc + s.bookCount, 0);
    const totalOwned = seriesList.reduce((acc, s) => acc + s.ownedCount, 0);
    const totalRead = seriesList.reduce((acc, s) => acc + s.readCount, 0);

    const statusLabel: Record<string, string> = {
        unread: "未読",
        reading: "読書中",
        read: "既読",
        backlog: "積読",
    };

    return (
        <>
            {/* 検索セクション */}
            <div className="section-header" style={{ marginTop: 24 }}>
                <h2 className="section-title">🔍 書籍検索</h2>
            </div>
            <form className="search-bar" onSubmit={handleSearch}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="タイトルで検索（例: 暗殺教室）..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={isSearching}>
                    {isSearching ? "検索中..." : "検索"}
                </button>
            </form>

            {/* 検索結果 */}
            {searchResults.length > 0 && (
                <div className="search-results" style={{ marginTop: 16 }}>
                    {searchResults.map((result) => (
                        <div key={result.googleBooksId} className="search-result-item">
                            {result.coverImageUrl ? (
                                <img
                                    src={result.coverImageUrl}
                                    alt={result.title}
                                    className="search-result-cover"
                                />
                            ) : (
                                <div
                                    className="search-result-cover"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "1.5rem",
                                    }}
                                >
                                    📖
                                </div>
                            )}
                            <div className="search-result-info">
                                <div className="search-result-title">{result.title}</div>
                                <div className="search-result-meta">
                                    {result.authors.join(", ")}
                                    {result.publisher && ` · ${result.publisher}`}
                                    {result.listPrice && ` · ¥${result.listPrice}`}
                                </div>
                                {result.isbn && (
                                    <div className="search-result-meta">ISBN: {result.isbn}</div>
                                )}
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => openRegisterModal(result)}
                            >
                                + 登録
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 統計 */}
            <div className="section-header">
                <h2 className="section-title">📊 ライブラリ</h2>
            </div>
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-value" style={{ color: "var(--accent-blue)" }}>
                        {seriesList.length}
                    </div>
                    <div className="stat-label">シリーズ</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: "var(--accent-purple)" }}>
                        {totalBooks}
                    </div>
                    <div className="stat-label">書籍数</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: "var(--accent-green)" }}>
                        {totalOwned}
                    </div>
                    <div className="stat-label">所有数</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: "var(--accent-orange)" }}>
                        {totalRead}
                    </div>
                    <div className="stat-label">既読数</div>
                </div>
            </div>

            {/* シリーズ一覧 */}
            {loading ? (
                <div className="empty-state">
                    <div className="empty-state-text">読み込み中...</div>
                </div>
            ) : seriesList.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <div className="empty-state-text">
                        ライブラリに書籍がありません
                    </div>
                    <p style={{ color: "var(--text-muted)" }}>
                        上の検索バーから書籍を検索して登録しましょう
                    </p>
                </div>
            ) : (
                <div className="card-grid">
                    {seriesList.map((s) => (
                        <div key={s.id} className="card">
                            {s.coverImageUrl ? (
                                <img
                                    src={s.coverImageUrl}
                                    alt={s.title}
                                    className="card-cover"
                                />
                            ) : (
                                <div
                                    className="card-cover"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "3rem",
                                        background: "var(--bg-secondary)",
                                    }}
                                >
                                    📖
                                </div>
                            )}
                            <div className="card-body">
                                <div className="card-title">{s.title}</div>
                                <div className="card-meta">{s.author}</div>
                                <div className="card-badges">
                                    <span className="badge badge-count">
                                        {s.ownedCount}/{s.bookCount} 巻
                                    </span>
                                    {s.readCount > 0 && (
                                        <span className="badge badge-read">
                                            {s.readCount} 読了
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 登録モーダル */}
            {showRegisterModal && selectedBook && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowRegisterModal(false)}
                >
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">📖 書籍を登録</h3>

                        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                            {selectedBook.coverImageUrl && (
                                <img
                                    src={selectedBook.coverImageUrl}
                                    alt=""
                                    style={{
                                        width: 80,
                                        height: 110,
                                        objectFit: "cover",
                                        borderRadius: "var(--radius-sm)",
                                    }}
                                />
                            )}
                            <div>
                                <div style={{ fontWeight: 600 }}>{selectedBook.title}</div>
                                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                    {selectedBook.authors.join(", ")}
                                </div>
                                {selectedBook.publisher && (
                                    <div
                                        style={{
                                            fontSize: "0.85rem",
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        {selectedBook.publisher}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">購入プラットフォーム</label>
                            <select
                                className="form-select"
                                value={registerForm.platformName}
                                onChange={(e) =>
                                    setRegisterForm({ ...registerForm, platformName: e.target.value })
                                }
                            >
                                <option value="">選択なし</option>
                                {platforms.map((p) => (
                                    <option key={p.name} value={p.name}>
                                        {p.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                カスタムURL（NextCloud等のローカルアドレス）
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="https://nextcloud.local/books/..."
                                value={registerForm.customUrl}
                                onChange={(e) =>
                                    setRegisterForm({ ...registerForm, customUrl: e.target.value })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">形態</label>
                            <select
                                className="form-select"
                                value={registerForm.format}
                                onChange={(e) =>
                                    setRegisterForm({
                                        ...registerForm,
                                        format: e.target.value as "digital" | "physical",
                                    })
                                }
                            >
                                <option value="digital">電子書籍</option>
                                <option value="physical">紙の書籍</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">読書ステータス</label>
                            <select
                                className="form-select"
                                value={registerForm.readingStatus}
                                onChange={(e) =>
                                    setRegisterForm({
                                        ...registerForm,
                                        readingStatus: e.target.value as
                                            | "unread"
                                            | "reading"
                                            | "read"
                                            | "backlog",
                                    })
                                }
                            >
                                <option value="unread">未読</option>
                                <option value="reading">読書中</option>
                                <option value="read">既読</option>
                                <option value="backlog">積読</option>
                            </select>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 12,
                                justifyContent: "flex-end",
                                marginTop: 24,
                            }}
                        >
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowRegisterModal(false)}
                            >
                                キャンセル
                            </button>
                            <button className="btn btn-primary" onClick={handleRegister}>
                                登録する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
