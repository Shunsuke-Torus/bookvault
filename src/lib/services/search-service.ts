import type {
    GoogleBooksResponse,
    GoogleBooksVolume,
    BookSearchResult,
} from "@/lib/types";
import { googleBooksConfig } from "@/lib/config";

/**
 * Google Books APIでタイトル検索を行う
 */
export async function searchBooks(
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
 * Google Books APIは1クエリで最大40件しか返さないため、
 * startIndexを使った複数ページ取得で全巻をカバーする
 */
export async function searchSeriesVolumes(
    seriesTitle: string,
    maxPages: number = 3
): Promise<BookSearchResult[]> {
    const allResults: BookSearchResult[] = [];
    const seenIds = new Set<string>();

    for (let page = 0; page < maxPages; page++) {
        const startIndex = page * 40;
        const results = await searchBooks(seriesTitle, 40, startIndex);

        if (results.length === 0) break;

        for (const r of results) {
            if (!seenIds.has(r.googleBooksId)) {
                seenIds.add(r.googleBooksId);
                allResults.push(r);
            }
        }

        // Google APIはmaxResults=40でも20件しか返さないことがあるため、
        // 単純に結果が0件になるまで取得するか、最大ページ数で打ち切る
    }

    return allResults;
}

/**
 * Google Books IDで書籍詳細を取得する
 */
export async function getBookById(
    googleBooksId: string
): Promise<BookSearchResult | null> {
    const params = new URLSearchParams();
    if (googleBooksConfig.apiKey) {
        params.set("key", googleBooksConfig.apiKey);
    }
    const qs = params.toString() ? `?${params}` : "";
    const response = await fetch(`${googleBooksConfig.baseUrl}/${googleBooksId}${qs}`);
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
        googleBooksId: volume.id,
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
 * 全角数字を半角に変換するヘルパー
 */
function normalizeDigits(str: string): string {
    return str.replace(/[０-９]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30)
    );
}

/**
 * タイトル文字列からシリーズ名と巻数を分離する
 * 例: "暗殺教室 8" → { seriesTitle: "暗殺教室", volumeNumber: 8 }
 * 例: "メダリスト（６）" → { seriesTitle: "メダリスト", volumeNumber: 6 }
 * 例: "ノルウェイの森" → { seriesTitle: null, volumeNumber: null }
 */
function parseTitle(title: string): {
    seriesTitle: string | null;
    volumeNumber: number | null;
} {
    // 全角数字を半角に正規化
    const normalized = normalizeDigits(title);

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

    return { seriesTitle: null, volumeNumber: null };
}

