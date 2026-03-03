import type {
    GoogleBooksResponse,
    GoogleBooksVolume,
    BookSearchResult,
} from "@/lib/types";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

/**
 * Google Books APIでタイトル検索を行う
 */
export async function searchBooks(
    query: string,
    maxResults: number = 10
): Promise<BookSearchResult[]> {
    const params = new URLSearchParams({
        q: query,
        maxResults: String(maxResults),
        langRestrict: "ja",
        printType: "books",
    });

    const response = await fetch(`${GOOGLE_BOOKS_API}?${params}`);
    if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
    }

    const data: GoogleBooksResponse = await response.json();
    if (!data.items) return [];

    return data.items.map(volumeToSearchResult);
}

/**
 * Google Books IDで書籍詳細を取得する
 */
export async function getBookById(
    googleBooksId: string
): Promise<BookSearchResult | null> {
    const response = await fetch(`${GOOGLE_BOOKS_API}/${googleBooksId}`);
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
 * タイトル文字列からシリーズ名と巻数を分離する
 * 例: "暗殺教室 8" → { seriesTitle: "暗殺教室", volumeNumber: 8 }
 * 例: "ノルウェイの森" → { seriesTitle: null, volumeNumber: null }
 */
function parseTitle(title: string): {
    seriesTitle: string | null;
    volumeNumber: number | null;
} {
    // "タイトル 数字" のパターンを検出
    const match = title.match(/^(.+?)\s+(\d+)$/);
    if (match) {
        return {
            seriesTitle: match[1].trim(),
            volumeNumber: parseInt(match[2], 10),
        };
    }

    // "タイトル 第N巻" のパターン
    const matchVol = title.match(/^(.+?)\s*第?(\d+)巻$/);
    if (matchVol) {
        return {
            seriesTitle: matchVol[1].trim(),
            volumeNumber: parseInt(matchVol[2], 10),
        };
    }

    return { seriesTitle: null, volumeNumber: null };
}
