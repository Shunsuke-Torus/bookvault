import { db } from "@/lib/db";
import {
    series,
    book,
    ownership,
    bookExternalId,
    seriesExternalId,
    platform,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { CreateBookInput } from "@/lib/types";

/**
 * 書籍を登録する（シリーズ自動作成 + 外部ID紐付け）
 */
export async function createBook(input: CreateBookInput) {
    // ── googleBooksId による重複チェック ──
    // シリーズ概念導入前に単体登録された書籍が、シリーズ一括登録時に
    // 再度追加されるのを防ぐ
    if (input.googleBooksId) {
        const existingExtId = db
            .select()
            .from(bookExternalId)
            .where(
                and(
                    eq(bookExternalId.source, "google_books"),
                    eq(bookExternalId.externalId, input.googleBooksId)
                )
            )
            .get();

        if (existingExtId) {
            // 既存の書籍を取得
            const existingBook = db
                .select()
                .from(book)
                .where(eq(book.id, existingExtId.bookId))
                .get();

            if (existingBook) {
                // シリーズIDが指定されているか、タイトルからシリーズを解決する
                let resolvedSeriesId = input.seriesId ?? null;

                if (!resolvedSeriesId) {
                    const seriesTitle = extractSeriesTitle(input.title);
                    const existingSeries = db
                        .select()
                        .from(series)
                        .where(
                            and(
                                eq(series.title, seriesTitle),
                                eq(series.author, input.author)
                            )
                        )
                        .get();
                    if (existingSeries) {
                        resolvedSeriesId = existingSeries.id;
                    }
                }

                // シリーズ紐付けを更新（既存書籍がシリーズ未所属の場合）
                if (resolvedSeriesId && existingBook.seriesId !== resolvedSeriesId) {
                    db.update(book)
                        .set({
                            seriesId: resolvedSeriesId,
                            volumeNumber: input.volumeNumber ?? existingBook.volumeNumber,
                            coverImageUrl: input.coverImageUrl ?? existingBook.coverImageUrl,
                        })
                        .where(eq(book.id, existingBook.id))
                        .run();
                }

                return existingBook;
            }
        }
    }

    let seriesDbId = input.seriesId ?? null;

    // タイトルからシリーズ名を抽出するヘルパー
    function extractSeriesTitle(title: string): string {
        // 全角数字を半角に変換
        const normalized = title.replace(/[０-９]/g, (ch) =>
            String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30)
        );
        return normalized
            .replace(/[\s]*（\d+）$/, "")     // 末尾の「（14）」
            .replace(/[\s]*\(\d+\)$/, "")     // 末尾の「(14)」
            .replace(/\s*第\d+巻$/, "")       // 末尾の「第3巻」
            .replace(/\s+\d+巻$/, "")         // 末尾の「 3巻」
            .replace(/\s+\d+$/, "")           // 末尾の「 8」
            .trim();
    }

    // シリーズの検索 or 作成
    if (!seriesDbId) {
        const seriesTitle = extractSeriesTitle(input.title);

        // 既存シリーズをタイトル+著者で検索
        const existingSeries = db
            .select()
            .from(series)
            .where(
                and(
                    eq(series.title, seriesTitle),
                    eq(series.author, input.author)
                )
            )
            .get();

        if (existingSeries) {
            seriesDbId = existingSeries.id;
        } else if (input.volumeNumber) {
            // 巻数がある = シリーズ物 → 新規シリーズ作成
            const result = db
                .insert(series)
                .values({
                    title: seriesTitle,
                    author: input.author,
                    publisher: input.publisher,
                    coverImageUrl: input.coverImageUrl,
                    description: input.description,
                })
                .returning()
                .get();
            seriesDbId = result.id;

            // Google BooksシリーズIDを紐付け
            if (input.googleSeriesId) {
                db.insert(seriesExternalId)
                    .values({
                        seriesId: seriesDbId,
                        source: "google_books",
                        externalId: input.googleSeriesId,
                    })
                    .run();
            }
        }
    }

    // 書籍本体を登録
    const bookTitle = input.volumeNumber
        ? `${input.title.replace(/\s+\d+$/, "").trim()} ${input.volumeNumber}`
        : input.title;

    const newBook = db
        .insert(book)
        .values({
            seriesId: seriesDbId,
            title: bookTitle,
            volumeNumber: input.volumeNumber,
            isbn: input.isbn,
            coverImageUrl: input.coverImageUrl,
            readingStatus: input.readingStatus ?? "unread",
        })
        .returning()
        .get();

    // Google Books外部IDを紐付け
    if (input.googleBooksId) {
        db.insert(bookExternalId)
            .values({
                bookId: newBook.id,
                source: "google_books",
                externalId: input.googleBooksId,
            })
            .run();
    }

    // 所有情報を登録
    if (input.platformName) {
        const plt = db
            .select()
            .from(platform)
            .where(eq(platform.name, input.platformName))
            .get();

        if (plt) {
            db.insert(ownership)
                .values({
                    bookId: newBook.id,
                    platformId: plt.id,
                    platformBookId: input.platformBookId,
                    customUrl: input.customUrl,
                    format: input.format ?? "digital",
                })
                .run();
        }
    }

    return newBook;
}

/**
 * 全シリーズ一覧を取得（ダッシュボード用）
 */
export async function getAllSeries() {
    const allSeries = db.select().from(series).orderBy(series.title).all();

    // 各シリーズの書籍数・所有数を集計
    const result = allSeries.map((s) => {
        const books = db
            .select()
            .from(book)
            .where(eq(book.seriesId, s.id))
            .all();

        const ownedBooks = books.filter((b) => {
            const own = db
                .select()
                .from(ownership)
                .where(eq(ownership.bookId, b.id))
                .get();
            return !!own;
        });

        const readBooks = books.filter((b) => b.readingStatus === "read");

        return {
            ...s,
            bookCount: books.length,
            ownedCount: ownedBooks.length,
            readCount: readBooks.length,
        };
    });

    return result;
}

/**
 * シリーズ内の書籍を取得
 */
export async function getSeriesBooks(seriesId: number) {
    const seriesData = db
        .select()
        .from(series)
        .where(eq(series.id, seriesId))
        .get();

    if (!seriesData) return null;

    const books = db
        .select()
        .from(book)
        .where(eq(book.seriesId, seriesId))
        .orderBy(book.volumeNumber)
        .all();

    const booksWithOwnership = books.map((b) => {
        const ownerships = db
            .select({
                id: ownership.id,
                platformId: ownership.platformId,
                platformBookId: ownership.platformBookId,
                customUrl: ownership.customUrl,
                format: ownership.format,
                purchasedAt: ownership.purchasedAt,
                purchasePrice: ownership.purchasePrice,
                platformName: platform.name,
                platformDisplayName: platform.displayName,
                libraryUrl: platform.libraryUrl,
                bookUrlTemplate: platform.bookUrlTemplate,
            })
            .from(ownership)
            .innerJoin(platform, eq(ownership.platformId, platform.id))
            .where(eq(ownership.bookId, b.id))
            .all();

        return { ...b, ownerships };
    });

    return { series: seriesData, books: booksWithOwnership };
}

/**
 * シリーズに属さない単巻の書籍を取得
 */
export async function getStandaloneBooks() {
    return db
        .select()
        .from(book)
        .where(eq(book.seriesId, 0)) // seriesId が null の場合
        .orderBy(book.title)
        .all();
}
