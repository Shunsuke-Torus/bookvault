import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { series, book, bookExternalId } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { seriesTitle, author, publisher, volumes } = body;

        if (!seriesTitle || !author || !volumes || !Array.isArray(volumes)) {
            return NextResponse.json(
                { error: "seriesTitle, author, volumes は必須です" },
                { status: 400 }
            );
        }

        // 1. 著者名の正規化（book-serviceと同様）
        const normalizeAuthor = (a: string) =>
            a.replace(/([\u3000-\u9FFF\uF900-\uFAFF])\s+([\u3000-\u9FFF\uF900-\uFAFF])/g, "$1$2").trim();
        const normalizedAuthor = normalizeAuthor(author);

        // 2. シリーズを検索 or 作成
        let seriesDbId: number;
        const candidateSeries = await db
            .select()
            .from(series)
            .where(eq(series.title, seriesTitle));

        const existingSeries = candidateSeries.find(
            (s) => normalizeAuthor(s.author) === normalizedAuthor
        );

        if (existingSeries) {
            seriesDbId = existingSeries.id;
        } else {
            const [newSeries] = await db
                .insert(series)
                .values({
                    title: seriesTitle,
                    author: normalizedAuthor,
                    publisher: publisher,
                    coverImageUrl: volumes[0]?.coverImageUrl || null,
                })
                .returning();
            seriesDbId = newSeries.id;
        }

        let addedCount = 0;

        // 3. 各巻（volumes）を未所有（readingStatus='unread'）として一括登録
        for (const vol of volumes) {
            // externalIdでの重複チェック
            if (vol.externalId) {
                const extSource = vol.externalId.startsWith("rakuten-") ? "rakuten" : "google_books";
                const existingExt = await db
                    .select()
                    .from(bookExternalId)
                    .where(
                        and(
                            eq(bookExternalId.source, extSource),
                            eq(bookExternalId.externalId, vol.externalId)
                        )
                    )
                    .get();

                if (existingExt) {
                    // 既に登録済みの場合、単行本として登録されている等で seriesId が設定されていない可能性がある
                    // そのため、既存のbookの seriesId を今回の seriesDbId に更新して紐付ける
                    await db
                        .update(book)
                        .set({ seriesId: seriesDbId })
                        .where(eq(book.id, existingExt.bookId));
                    addedCount++;
                    continue; // 挿入はスキップ
                }
            }

            // bookテーブルへ挿入
            const bookTitle = vol.volumeNumber
                ? `${seriesTitle} ${vol.volumeNumber}`
                : vol.title;

            const [newBook] = await db
                .insert(book)
                .values({
                    seriesId: seriesDbId,
                    title: bookTitle,
                    volumeNumber: vol.volumeNumber,
                    isbn: vol.isbn,
                    coverImageUrl: vol.coverImageUrl,
                    publishedAt: vol.publishedDate || null,
                    readingStatus: "unread", // 未所持・未読
                })
                .returning();

            addedCount++;

            // externalIdの紐付け
            if (vol.externalId) {
                const extSource = vol.externalId.startsWith("rakuten-") ? "rakuten" : "google_books";
                await db.insert(bookExternalId)
                    .values({
                        bookId: newBook.id,
                        source: extSource,
                        externalId: vol.externalId,
                    });
            }
        }

        return NextResponse.json({
            success: true,
            seriesId: seriesDbId,
            addedCount,
        });

    } catch (error) {
        console.error("Series Subscribe Error:", error);
        return NextResponse.json(
            { error: "シリーズの追加処理に失敗しました" },
            { status: 500 }
        );
    }
}
