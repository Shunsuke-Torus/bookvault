"use client";

import { useState } from "react";

interface SearchResult {
    externalId: string;
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

interface SeriesGroup {
    seriesTitle: string;
    seriesId: string | null;
    author: string;
    publisher: string | null;
    volumes: SearchResult[];
}

interface Platform {
    id: number;
    name: string;
    displayName: string;
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [groups, setGroups] = useState<SeriesGroup[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [registerForm, setRegisterForm] = useState({
        platformName: "",
        customUrl: "",
        format: "digital" as "digital" | "physical",
        readingStatus: "unread" as "unread" | "reading" | "read" | "backlog",
    });
    const [registering, setRegistering] = useState(false);

    const [isCompletingSeries, setIsCompletingSeries] = useState(false);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setSelected(new Set());
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&maxResults=40`);
            const data = await res.json();
            const items: SearchResult[] = data.items || [];

            const grouped = buildGroups(items);
            setGroups(grouped);

            // シリーズ物を検出したら自動で全巻補完
            if (grouped.length > 0) {
                setIsCompletingSeries(true);
                try {
                    const completed = await completeSeriesVolumes(grouped);
                    setGroups(completed);
                } finally {
                    setIsCompletingSeries(false);
                }
            }

            if (platforms.length === 0) {
                const pRes = await fetch("/api/platforms");
                const pData = await pRes.json();
                setPlatforms(pData.platforms || []);
            }
        } catch (err) {
            console.error("検索エラー:", err);
        } finally {
            setIsSearching(false);
        }
    }

    /**
     * 検索結果をシリーズごとにグルーピングする
     * 同一seriesTitle + 最多出版社でグループ化し、外国語版を除外
     */
    function buildGroups(items: SearchResult[]): SeriesGroup[] {
        // 著者情報がない or 巻数もシリーズ名もないゴミデータを除外
        const filtered = items.filter(
            (item) => item.authors.length > 0 && (item.seriesTitle || item.volumeNumber)
        );

        const groupMap = new Map<string, SeriesGroup>();
        for (const item of filtered) {
            const key = item.seriesTitle || item.title;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    seriesTitle: item.seriesTitle || item.title,
                    seriesId: item.seriesId,
                    author: item.authors[0] || "不明",
                    publisher: item.publisher,
                    volumes: [],
                });
            }
            // 同一巻番号の重複を排除（先にある方＝情報が多い方を優先）
            const group = groupMap.get(key)!;
            const isDuplicate = item.volumeNumber !== null &&
                group.volumes.some((v) => v.volumeNumber === item.volumeNumber);
            if (!isDuplicate) {
                group.volumes.push(item);
            }
        }

        // 各グループ内で出版社をカウントし、最多出版社でフィルタリング
        for (const [key, group] of groupMap) {
            if (group.volumes.length >= 3) {
                const pubCount = new Map<string, number>();
                for (const v of group.volumes) {
                    const pub = v.publisher || "不明";
                    pubCount.set(pub, (pubCount.get(pub) || 0) + 1);
                }
                // 最多出版社を特定
                let maxPub = "";
                let maxCount = 0;
                for (const [pub, count] of pubCount) {
                    if (count > maxCount) {
                        maxPub = pub;
                        maxCount = count;
                    }
                }
                // 出版社が2つ以上混在し、最多出版社が圧倒的多数なら他をフィルタ
                if (pubCount.size > 1 && maxCount >= group.volumes.length * 0.5) {
                    group.volumes = group.volumes.filter(
                        (v) => (v.publisher || "不明") === maxPub
                    );
                    group.publisher = maxPub;
                }
            }
        }

        for (const group of groupMap.values()) {
            group.volumes.sort((a, b) => (a.volumeNumber ?? 999) - (b.volumeNumber ?? 999));
        }

        return Array.from(groupMap.values());
    }

    /**
     * 検出されたシリーズグループに対して、欠落巻を補完する
     * series=true API を使ってページング取得し、既存グループにマージする
     */
    async function completeSeriesVolumes(currentGroups: SeriesGroup[]): Promise<SeriesGroup[]> {
        const updated = [...currentGroups];

        for (let i = 0; i < updated.length; i++) {
            const group = updated[i];
            // シリーズ名があり、巻数付きの結果が3巻以上あるグループのみ補完
            if (!group.seriesTitle || group.volumes.length < 3) continue;

            try {
                const res = await fetch(
                    `/api/search?q=${encodeURIComponent(group.seriesTitle)}&series=true`
                );
                const data = await res.json();
                const seriesItems: SearchResult[] = data.items || [];

                // 既存巻番号のセット
                const existingVolumes = new Set(
                    group.volumes
                        .filter((v) => v.volumeNumber !== null)
                        .map((v) => v.volumeNumber)
                );

                // 新しい巻を追加（同一シリーズ名 + 同一出版社のもののみ）
                for (const item of seriesItems) {
                    if (
                        item.seriesTitle === group.seriesTitle &&
                        item.volumeNumber !== null &&
                        !existingVolumes.has(item.volumeNumber) &&
                        item.authors.length > 0 &&
                        (!group.publisher || (item.publisher || "不明") === group.publisher)
                    ) {
                        group.volumes.push(item);
                        existingVolumes.add(item.volumeNumber);
                    }
                }

                // 巻番号で再ソート
                group.volumes.sort((a, b) => (a.volumeNumber ?? 999) - (b.volumeNumber ?? 999));
            } catch (err) {
                console.error(`シリーズ補完エラー (${group.seriesTitle}):`, err);
            }
        }

        return updated;
    }

    function toggleSelect(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleGroupAll(group: SeriesGroup) {
        const allIds = group.volumes.map((v) => v.externalId);
        const allSelected = allIds.every((id) => selected.has(id));
        setSelected((prev) => {
            const next = new Set(prev);
            if (allSelected) allIds.forEach((id) => next.delete(id));
            else allIds.forEach((id) => next.add(id));
            return next;
        });
    }

    async function handleBatchRegister() {
        setRegistering(true);
        const allVolumes = groups.flatMap((g) => g.volumes);
        const toRegister = allVolumes.filter((v) => selected.has(v.externalId));

        let successCount = 0;
        for (const vol of toRegister) {
            try {
                const res = await fetch("/api/books", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: vol.title,
                        author: vol.authors[0] || "不明",
                        publisher: vol.publisher,
                        volumeNumber: vol.volumeNumber,
                        isbn: vol.isbn,
                        coverImageUrl: vol.coverImageUrl,
                        externalId: vol.externalId,
                        externalSeriesId: vol.seriesId,
                        platformName: registerForm.platformName || undefined,
                        customUrl: registerForm.customUrl || undefined,
                        format: registerForm.format,
                        readingStatus: registerForm.readingStatus,
                    }),
                });
                if (res.ok) successCount++;
            } catch (err) {
                console.error("登録エラー:", err);
            }
        }

        setRegistering(false);
        setShowModal(false);
        if (successCount > 0) {
            setSelected(new Set());
            alert(`${successCount}冊を登録しました`);
        }
    }

    return (
        <div className="py-5">
            <h1 className="text-xl font-bold mb-4">検索</h1>

            <form className="flex gap-2" onSubmit={handleSearch}>
                <input
                    type="text"
                    className="flex-1 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary text-sm outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                    placeholder="タイトルで検索（例: 暗殺教室）"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-3 bg-accent text-white rounded-xl text-sm font-medium cursor-pointer transition-colors hover:bg-accent-hover disabled:opacity-50"
                    disabled={isSearching}
                >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    {isSearching ? "検索中..." : "検索"}
                </button>
            </form>

            {/* シリーズ補完中のローディング */}
            {isCompletingSeries && (
                <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    シリーズの全巻を取得中...
                </div>
            )}

            {/* 検索結果 */}
            {groups.map((group, gi) => {
                const allIds = group.volumes.map((v) => v.externalId);
                const allSelected = allIds.every((id) => selected.has(id));

                return (
                    <div key={gi} className="mt-5 border border-border rounded-xl overflow-hidden">
                        {/* グループヘッダー */}
                        <div className="flex items-center gap-3 px-3.5 py-3 bg-bg-secondary border-b border-border">
                            <button
                                type="button"
                                onClick={() => toggleGroupAll(group)}
                                className={`w-[22px] h-[22px] rounded flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer ${allSelected
                                    ? "bg-accent-green border-accent-green text-white"
                                    : "border-border-hover bg-bg-primary hover:border-accent"
                                    }`}
                            >
                                {allSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                            </button>
                            {group.volumes[0]?.coverImageUrl && (
                                <img src={group.volumes[0].coverImageUrl} alt="" className="w-10 h-14 object-cover rounded" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{group.seriesTitle}</div>
                                <div className="text-xs text-text-muted">
                                    {group.author}
                                    {group.publisher && ` · ${group.publisher}`}
                                    {` · ${group.volumes.length}巻`}
                                </div>
                            </div>
                        </div>

                        {/* 巻リスト */}
                        {group.volumes.map((vol) => (
                            <div
                                key={vol.externalId}
                                className="flex items-center gap-3 px-3.5 py-3 border-b border-border last:border-b-0 bg-bg-primary transition-colors hover:bg-bg-hover"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleSelect(vol.externalId)}
                                    className={`w-[22px] h-[22px] rounded flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer ${selected.has(vol.externalId)
                                        ? "bg-accent-green border-accent-green text-white"
                                        : "border-border-hover bg-bg-primary hover:border-accent"
                                        }`}
                                >
                                    {selected.has(vol.externalId) && (
                                        <span className="material-symbols-outlined text-[16px]">check</span>
                                    )}
                                </button>
                                {vol.coverImageUrl ? (
                                    <img src={vol.coverImageUrl} alt="" className="w-11 h-[62px] rounded object-cover bg-bg-secondary shrink-0" />
                                ) : (
                                    <div className="w-11 h-[62px] rounded bg-bg-secondary shrink-0 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-lg text-text-muted">book</span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold">
                                        {vol.volumeNumber ? `${vol.volumeNumber}巻` : vol.title}
                                    </div>
                                    {vol.listPrice && <div className="text-xs text-text-muted">¥{vol.listPrice}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}

            {/* バッチ操作バー */}
            {selected.size > 0 && (
                <div className="sticky bottom-0 bg-bg-primary border-t border-border py-3 px-5 flex gap-3 justify-center shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
                    <span className="text-sm text-text-secondary self-center">{selected.size}冊選択中</span>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium cursor-pointer transition-colors hover:bg-accent-hover"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        選択した巻を登録
                    </button>
                </div>
            )}

            {/* 登録モーダル */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200]" onClick={() => setShowModal(false)}>
                    <div className="bg-bg-primary rounded-2xl w-[90%] max-w-[480px] max-h-[80vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined">playlist_add</span>
                            {selected.size}冊を登録
                        </h3>

                        <div className="mb-3.5">
                            <label className="block text-xs text-text-secondary mb-1 font-medium">購入プラットフォーム</label>
                            <select
                                className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-md text-text-primary text-sm outline-none transition-colors focus:border-accent"
                                value={registerForm.platformName}
                                onChange={(e) => setRegisterForm({ ...registerForm, platformName: e.target.value })}
                            >
                                <option value="">選択なし</option>
                                {platforms.map((p) => (
                                    <option key={p.name} value={p.name}>{p.displayName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-3.5">
                            <label className="block text-xs text-text-secondary mb-1 font-medium">カスタムURL</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-md text-text-primary text-sm outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                                placeholder="https://nextcloud.local/books/..."
                                value={registerForm.customUrl}
                                onChange={(e) => setRegisterForm({ ...registerForm, customUrl: e.target.value })}
                            />
                        </div>

                        <div className="mb-3.5">
                            <label className="block text-xs text-text-secondary mb-1 font-medium">形態</label>
                            <select
                                className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-md text-text-primary text-sm outline-none transition-colors focus:border-accent"
                                value={registerForm.format}
                                onChange={(e) => setRegisterForm({ ...registerForm, format: e.target.value as "digital" | "physical" })}
                            >
                                <option value="digital">電子書籍</option>
                                <option value="physical">紙の書籍</option>
                            </select>
                        </div>

                        <div className="mb-3.5">
                            <label className="block text-xs text-text-secondary mb-1 font-medium">読書ステータス</label>
                            <select
                                className="w-full px-3 py-2.5 bg-bg-primary border border-border rounded-md text-text-primary text-sm outline-none transition-colors focus:border-accent"
                                value={registerForm.readingStatus}
                                onChange={(e) => setRegisterForm({ ...registerForm, readingStatus: e.target.value as "unread" | "reading" | "read" | "backlog" })}
                            >
                                <option value="unread">未読</option>
                                <option value="reading">読書中</option>
                                <option value="read">既読</option>
                                <option value="backlog">積読</option>
                            </select>
                        </div>

                        <div className="flex gap-3 justify-end mt-5">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 border border-border rounded-xl text-sm text-text-secondary bg-transparent cursor-pointer transition-colors hover:bg-bg-secondary"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleBatchRegister}
                                disabled={registering}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium cursor-pointer transition-colors hover:bg-accent-hover disabled:opacity-50"
                            >
                                {registering ? "登録中..." : `${selected.size}冊を登録`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
