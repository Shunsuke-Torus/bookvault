import type {
    GoogleBooksResponse,
    GoogleBooksVolume,
    RakutenBooksResponse,
    RakutenBooksItem,
    BookSearchResult,
} from "@/lib/types";
import { googleBooksConfig, rakutenBooksConfig, isRakutenBooksConfigured } from "@/lib/config";

/**
 * メインの検索ハブ（楽天APIを優先し、だめならGoogle APIへフォールバック）
 */
export async function searchBooks(
    query: string,
    maxResults: number = rakutenBooksConfig.defaultHits,
    startIndex: number = 0
): Promise<BookSearchResult[]> {
    // 1. 楽天APIで検索を試みる
    if (isRakutenBooksConfigured()) {
        const rakutenResults = await searchRakutenBooks(query, maxResults, startIndex);
        if (rakutenResults.length > 0) {
            return rakutenResults;
        }
    }

    // 2. フォールバック: 楽天APIで見つからなかった場合のみGoogle APIを使用
    return searchGoogleBooks(query, maxResults, startIndex);
}

/**
 * 楽天ブックスAPIで書籍検索を行う
 */
export async function searchRakutenBooks(
    query: string,
    maxResults: number = rakutenBooksConfig.defaultHits,
    startIndex: number = 0
): Promise<BookSearchResult[]> {
    // 楽天APIは page 指定 (1-indexed)。startIndexから逆算する
    // 例: startIndex=0, hits=30 -> page=1
    // 例: startIndex=30, hits=30 -> page=2
    const page = Math.floor(startIndex / maxResults) + 1;
    // 楽天APIは最大30件まで
    const hits = Math.min(maxResults, 30);

    const params = new URLSearchParams({
        title: query,
        applicationId: rakutenBooksConfig.appId,
        accessKey: rakutenBooksConfig.accessKey,
        hits: String(hits),
        page: String(page),
        format: "json",
    });

    if (rakutenBooksConfig.affiliateId) {
        params.set("affiliateId", rakutenBooksConfig.affiliateId);
    }

    try {
        const response = await fetch(`${rakutenBooksConfig.baseUrl}?${params}`);
        if (!response.ok) {
            console.error(`Rakuten API error: ${response.status}`, await response.text());
            return [];
        }

        const data: RakutenBooksResponse = await response.json();
        if (!data.Items || data.Items.length === 0) return [];

        return data.Items.map(item => rakutenItemToSearchResult(item.Item));
    } catch (error) {
        console.error("Failed to fetch from Rakuten API:", error);
        return [];
    }
}

/**
 * 楽天ブックスAPIで新刊（発売日が未来、または直近の巻）を検索する。
 * sort=-releaseDate を指定し、最新の巻を優先的に取得する。
 */
export async function searchUpcomingReleases(
    seriesTitle: string,
    author?: string,
    maxResults: number = 5
): Promise<BookSearchResult[]> {
    if (!isRakutenBooksConfigured()) return [];

    // 作者名がある場合はキーワードに追加して精度を上げる
    const query = author ? `${seriesTitle} ${author}` : seriesTitle;

    const params = new URLSearchParams({
        title: query,
        applicationId: rakutenBooksConfig.appId,
        accessKey: rakutenBooksConfig.accessKey,
        hits: String(maxResults),
        page: "1",
        sort: "-releaseDate", // 発売日降順
        format: "json",
    });

    if (rakutenBooksConfig.affiliateId) {
        params.set("affiliateId", rakutenBooksConfig.affiliateId);
    }

    try {
        const response = await fetch(`${rakutenBooksConfig.baseUrl}?${params}`);
        if (!response.ok) return [];

        const data: RakutenBooksResponse = await response.json();
        if (!data.Items || data.Items.length === 0) return [];

        // 検索結果からBookSearchResultに変換
        return data.Items.map(item => rakutenItemToSearchResult(item.Item));
    } catch (error) {
        console.error("Failed to fetch upcoming releases from Rakuten API:", error);
        return [];
    }
}

/**
 * 楽天ブックスAPIでISBN検索を行う（1件取得用）
 */
export async function searchRakutenByIsbn(
    isbn: string
): Promise<BookSearchResult | null> {
    const params = new URLSearchParams({
        isbn: isbn,
        applicationId: rakutenBooksConfig.appId,
        accessKey: rakutenBooksConfig.accessKey,
        format: "json",
    });

    try {
        const response = await fetch(`${rakutenBooksConfig.baseUrl}?${params}`);
        if (!response.ok) return null;

        const data: RakutenBooksResponse = await response.json();
        if (!data.Items || data.Items.length === 0) return null;

        return rakutenItemToSearchResult(data.Items[0].Item);
    } catch (error) {
        console.error("Failed to fetch from Rakuten API (ISBN):", error);
        return null;
    }
}

/**
 * Google Books APIでタイトル検索を行う
 */
async function searchGoogleBooks(
    query: string,
    maxResults: number = googleBooksConfig.defaultMaxResults,
    startIndex: number = 0
): Promise<BookSearchResult[]> {
    const params = new URLSearchParams({
        q: query,
        maxResults: String(maxResults),
        startIndex: String(startIndex),
        langRestrict: googleBooksConfig.langRestrict,
        printType: "books",
    });

    // APIキーが設定されていれば付加
    if (googleBooksConfig.apiKey) {
        params.set("key", googleBooksConfig.apiKey);
    }

    const response = await fetch(`${googleBooksConfig.baseUrl}?${params}`);
    if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
    }

    const data: GoogleBooksResponse = await response.json();
    if (!data.items) return [];

    return data.items.map(volumeToSearchResult);
}

/**
 * シリーズの全巻をページングで取得する
 * 楽天APIは1クエリで最大30件、Google APIは最大40件のため、
 * ページングで全巻をカバーする
 */
export async function searchSeriesVolumes(
    seriesTitle: string,
    maxPages: number = 3
): Promise<BookSearchResult[]> {
    const allResults: BookSearchResult[] = [];
    const seenIds = new Set<string>();
    // 楽天APIの最大hitsは30
    const pageSize = isRakutenBooksConfigured() ? 30 : 40;

    for (let page = 0; page < maxPages; page++) {
        const startIndex = page * pageSize;
        const results = await searchBooks(seriesTitle, pageSize, startIndex);

        if (results.length === 0) break;

        for (const r of results) {
            if (!seenIds.has(r.externalId)) {
                seenIds.add(r.externalId);
                allResults.push(r);
            }
        }
    }

    return allResults;
}

/**
 * 外部IDで書籍詳細を取得する
 * - "rakuten-{isbn}" 形式の場合は楽天APIでISBN検索
 * - それ以外はGoogle Books IDとして検索
 */
export async function getBookById(
    externalId: string
): Promise<BookSearchResult | null> {
    // 楽天IDの場合はISBN検索
    if (externalId.startsWith("rakuten-")) {
        const isbn = externalId.replace("rakuten-", "");
        return searchRakutenByIsbn(isbn);
    }

    // Google Books IDとしてフォールバック
    const params = new URLSearchParams();
    if (googleBooksConfig.apiKey) {
        params.set("key", googleBooksConfig.apiKey);
    }
    const qs = params.toString() ? `?${params}` : "";
    const response = await fetch(`${googleBooksConfig.baseUrl}/${externalId}${qs}`);
    if (!response.ok) return null;

    const volume: GoogleBooksVolume = await response.json();
    return volumeToSearchResult(volume);
}

/**
 * Google Books APIレスポンスをBookSearchResultに変換
 */
function volumeToSearchResult(volume: GoogleBooksVolume): BookSearchResult {
    const info = volume.volumeInfo;

    // タイトルからシリーズ名と巻数を分離
    const { seriesTitle, volumeNumber } = parseTitle(info.title);

    // ISBNを探す（ISBN_13 > ISBN_10 > null）
    const isbn =
        info.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier ??
        info.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier ??
        null;

    // 表紙画像URL（HTTPSに変換）
    const coverImageUrl = info.imageLinks?.thumbnail?.replace(
        "http://",
        "https://"
    ) ?? null;

    return {
        externalId: volume.id,
        title: info.title,
        seriesTitle,
        volumeNumber,
        authors: info.authors ?? [],
        publisher: info.publisher ?? null,
        publishedDate: info.publishedDate ?? null,
        description: info.description ?? null,
        isbn,
        coverImageUrl,
        categories: info.categories ?? [],
        listPrice: volume.saleInfo?.listPrice?.amount ?? null,
        seriesId: info.seriesInfo?.volumeSeries?.[0]?.seriesId ?? null,
    };
}

/**
 * 楽天ブックスのアイテムをBookSearchResultに変換
 */
function rakutenItemToSearchResult(item: RakutenBooksItem["Item"]): BookSearchResult {
    const { seriesTitle, volumeNumber } = parseTitle(item.title);

    return {
        externalId: `rakuten-${item.isbn}`,
        title: item.title,
        seriesTitle: seriesTitle || item.seriesName || null,
        volumeNumber,
        authors: item.author ? item.author.split("/") : [],
        publisher: item.publisherName || null,
        publishedDate: item.salesDate?.split("頃")[0] || null,
        description: item.itemCaption || null,
        isbn: item.isbn,
        coverImageUrl: item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || null,
        categories: [item.size],
        listPrice: item.itemPrice,
        seriesId: null, // 楽天APIには共通のシリーズIDがないためnull
    };
}

/**
 * 全角数字を半角に変換するヘルパー
 */
function normalizeDigits(str: string): string {
    return str.replace(/[０-９ａ-ｚＡ-Ｚ]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    ).replace(/　/g, " ").replace(/［/g, "[").replace(/］/g, "]");
}

/**
 * タイトル文字列からシリーズ名と巻数を分離する
 * 例: "暗殺教室 8" → { seriesTitle: "暗殺教室", volumeNumber: 8 }
 * 例: "メダリスト（６）" → { seriesTitle: "メダリスト", volumeNumber: 6 }
 * 例: "Fate/stay night [Heaven's Feel] 3巻" → { seriesTitle: "Fate/stay night [Heaven's Feel]", volumeNumber: 3 }
 */
function parseTitle(title: string): {
    seriesTitle: string | null;
    volumeNumber: number | null;
} {
    // 全角英数字・スペース・括弧を半角に正規化して揺れを吸収
    let normalized = normalizeDigits(title);

    // 連続するスペースを1つにまとめる
    normalized = normalized.replace(/\s+/g, ' ').trim();

    const patterns = [
        // "タイトル（数字）" 全角括弧 (例: "メダリスト（14）")
        /^(.+?)[\s]*（(\d+)）$/,
        // "タイトル(数字)" 半角括弧 (例: "Dr.STONE (5)")
        /^(.+?)[\s]*\((\d+)\)$/,
        // "タイトル 第N巻" (例: "進撃の巨人 第3巻")
        /^(.+?)\s*第(\d+)巻$/,
        // "タイトル N巻" (例: "進撃の巨人 3巻")
        /^(.+?)\s+(\d+)巻$/,
        // "タイトル 数字" (例: "暗殺教室 8") — 最後に試す
        /^(.+?)\s+(\d+)$/,
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) {
            return {
                seriesTitle: match[1].trim(),
                volumeNumber: parseInt(match[2], 10),
            };
        }
    }

    return { seriesTitle: title.trim(), volumeNumber: null };
}
