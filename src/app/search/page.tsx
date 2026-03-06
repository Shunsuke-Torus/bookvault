"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    publishedDate?: string | null;
}

interface SeriesGroup {
    seriesTitle: string;
    seriesId: string | null;
    author: string;
    publisher: string | null;
    volumes: SearchResult[];
}

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [groups, setGroups] = useState<SeriesGroup[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [subscribingGroup, setSubscribingGroup] = useState<string | null>(null);
    const [isCompletingSeries, setIsCompletingSeries] = useState(false);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
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
        } catch (err) {
            console.error("検索エラー:", err);
        } finally {
            setIsSearching(false);
        }
    }

    function normalizePublisher(pub: string | null): string {
        if (!pub) return "不明";
        return pub
            .replace(/(株式会社|有限会社|合同会社)/g, "")
            .replace(/[\s　・]/g, "")
            .toLowerCase();
    }

    function buildGroups(items: SearchResult[]): SeriesGroup[] {
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
            const group = groupMap.get(key)!;
            const isDuplicate = item.volumeNumber !== null &&
                group.volumes.some((v) => v.volumeNumber === item.volumeNumber);
            if (!isDuplicate) {
                group.volumes.push(item);
            }
        }

        for (const [key, group] of groupMap) {
            if (group.volumes.length >= 3) {
                const pubCount = new Map<string, number>();
                for (const v of group.volumes) {
                    const normPub = normalizePublisher(v.publisher);
                    pubCount.set(normPub, (pubCount.get(normPub) || 0) + 1);
                }
                let maxPubNorm = "";
                let maxCount = 0;
                for (const [pubNorm, count] of pubCount) {
                    if (count > maxCount) {
                        maxPubNorm = pubNorm;
                        maxCount = count;
                    }
                }
                if (pubCount.size > 1 && maxCount >= group.volumes.length * 0.5) {
                    group.volumes = group.volumes.filter(
                        (v) => normalizePublisher(v.publisher) === maxPubNorm
                    );
                    // Find actual dominant publisher name to display (just pick the first one matching)
                    const actualPub = group.volumes.find(v => normalizePublisher(v.publisher) === maxPubNorm)?.publisher;
                    group.publisher = actualPub || group.publisher;
                }
            }
        }

        for (const group of groupMap.values()) {
            group.volumes.sort((a, b) => (a.volumeNumber ?? 999) - (b.volumeNumber ?? 999));
        }

        return Array.from(groupMap.values());
    }

    async function completeSeriesVolumes(currentGroups: SeriesGroup[]): Promise<SeriesGroup[]> {
        const updated = [...currentGroups];

        for (let i = 0; i < updated.length; i++) {
            const group = updated[i];
            if (!group.seriesTitle || group.volumes.length < 3) continue;

            try {
                const res = await fetch(
                    `/api/search?q=${encodeURIComponent(group.seriesTitle)}&series=true`
                );
                const data = await res.json();
                const seriesItems: SearchResult[] = data.items || [];

                const existingVolumes = new Set(
                    group.volumes
                        .filter((v) => v.volumeNumber !== null)
                        .map((v) => v.volumeNumber)
                );

                for (const item of seriesItems) {
                    if (
                        item.seriesTitle === group.seriesTitle &&
                        item.volumeNumber !== null &&
                        !existingVolumes.has(item.volumeNumber) &&
                        item.authors.length > 0 &&
                        (!group.publisher || !item.publisher || normalizePublisher(item.publisher) === normalizePublisher(group.publisher))
                    ) {
                        group.volumes.push(item);
                        existingVolumes.add(item.volumeNumber);
                    }
                }

                group.volumes.sort((a, b) => (a.volumeNumber ?? 999) - (b.volumeNumber ?? 999));
            } catch (err) {
                console.error(`シリーズ補完エラー (${group.seriesTitle}):`, err);
            }
        }

        return updated;
    }

    async function handleSubscribe(group: SeriesGroup) {
        setSubscribingGroup(group.seriesTitle);
        try {
            const res = await fetch("/api/series/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    seriesTitle: group.seriesTitle,
                    author: group.author,
                    publisher: group.publisher,
                    volumes: group.volumes,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // 購読成功したらシリーズ詳細画面へ遷移
                router.push(`/series/${data.seriesId}`);
            } else {
                const errorData = await res.json();
                alert(`エラー: ${errorData.error || "登録に失敗しました"}`);
            }
        } catch (err) {
            console.error("購読エラー:", err);
            alert("通信エラーが発生しました");
        } finally {
            setSubscribingGroup(null);
        }
    }

    return (
        <div className="py-5">
            <h1 className="text-xl font-bold mb-4">シリーズ検索・購読</h1>

            <form className="flex gap-2" onSubmit={handleSearch}>
                <input
                    type="text"
                    className="flex-1 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary text-sm outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                    placeholder="シリーズ名で検索（例: 暗殺教室）"
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

            {isCompletingSeries && (
                <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    シリーズの全巻を取得中...
                </div>
            )}

            {groups.map((group, gi) => (
                <div key={gi} className="mt-5 border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-3.5 py-3 bg-bg-secondary border-b border-border">
                        {group.volumes[0]?.coverImageUrl ? (
                            <img src={group.volumes[0].coverImageUrl} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                            <div className="w-10 h-14 rounded bg-bg-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-text-muted">book</span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{group.seriesTitle}</div>
                            <div className="text-xs text-text-muted">
                                {group.author}
                                {group.publisher && ` · ${group.publisher}`}
                                {` · ${group.volumes.length}巻`}
                            </div>
                        </div>
                        <button
                            onClick={() => handleSubscribe(group)}
                            disabled={subscribingGroup === group.seriesTitle}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-accent-hover disabled:opacity-50"
                        >
                            {subscribingGroup === group.seriesTitle ? (
                                <>
                                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                    追加中...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[16px]">library_add</span>
                                    ライブラリに追加
                                </>
                            )}
                        </button>
                    </div>

                    {group.volumes.slice(0, 5).map((vol) => (
                        <div
                            key={vol.externalId}
                            className="flex items-center gap-3 px-3.5 py-3 border-b border-border last:border-b-0 bg-bg-primary"
                        >
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
                    {group.volumes.length > 5 && (
                        <div className="px-3.5 py-2 text-xs text-text-muted text-center bg-bg-primary">
                            他 {group.volumes.length - 5} 冊の巻が含まれます
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
