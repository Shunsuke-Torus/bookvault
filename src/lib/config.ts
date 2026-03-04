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

/**
 * APIキーが設定されているかチェック
 */
export function isGoogleBooksConfigured(): boolean {
    return googleBooksConfig.apiKey.length > 0;
}
