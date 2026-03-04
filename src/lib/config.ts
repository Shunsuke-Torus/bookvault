/**
 * 外部API設定を集約する設定モジュール
 * 新しいAPIを追加する場合はここにconfigを追加する
 */

export const googleBooksConfig = {
    baseUrl: "https://www.googleapis.com/books/v1/volumes",
    apiKey: process.env.GOOGLE_BOOKS_API_KEY || "",
    defaultMaxResults: 40,
    langRestrict: "ja",
} as const;

export const rakutenBooksConfig = {
    baseUrl: "https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404",
    appId: process.env.RAKUTEN_APP_ID || "",
    affiliateId: process.env.RAKUTEN_AFFILIATE_ID || "",
    accessKey: process.env.RAKUTEN_ACCESS_KEY || "",
    defaultHits: 30, // 楽天APIの最大hitsは30
} as const;

/**
 * APIキーが設定されているかチェック
 */
export function isGoogleBooksConfigured(): boolean {
    return googleBooksConfig.apiKey.length > 0;
}

export function isRakutenBooksConfigured(): boolean {
    return rakutenBooksConfig.appId.length > 0;
}
