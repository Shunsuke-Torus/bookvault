import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { series, book } from "@/lib/db/schema";
import { searchUpcomingReleases } from "@/lib/services/search-service";
import { eq, inArray, and } from "drizzle-orm";

// Cron用のエンドポイント。Vercel等で定期実行される想定。
// 認証ヘッダー等をつけるべきですが、一旦モック的にシンプルに実装します。
export async function GET(request: Request) {
    try {
        // 1. 対象のシリーズを取得 (連載中のものをメインにチェック)
        const ongoingSeries = db.select()
            .from(series)
            .where(inArray(series.status, ["ongoing"]))
            .all();

        if (ongoingSeries.length === 0) {
            return NextResponse.json({ message: "No ongoing series found to check." });
        }

        let addedBooksCount = 0;
        const addedBooks = [];

        // 2. 各シリーズについて新刊情報を楽天APIから取得
        for (const s of ongoingSeries) {
            // 楽天APIで最新の巻（発売日降順）を5件取得
            const upcomingReleases = await searchUpcomingReleases(s.title, s.author, 5);

            if (upcomingReleases.length === 0) continue;

            // 既存の巻情報を取得して重複チェック
            const existingBooks = db.select({
                volumeNumber: book.volumeNumber,
                title: book.title
            }).from(book).where(eq(book.seriesId, s.id)).all();

            console.log(`[Cron Debug] Series: ${s.title}`);
            console.log(`[Cron Debug] existingBooks (Initial):`, JSON.stringify(existingBooks, null, 2));

            for (const release of upcomingReleases) {
                // 同じ巻数、または同じタイトルのものがあればスキップ
                const exists = existingBooks.some(b =>
                    (release.volumeNumber !== null && Number(b.volumeNumber) === Number(release.volumeNumber)) ||
                    b.title.trim() === release.title.trim()
                );

                if (!exists) {
                    const newBook = db.insert(book).values({
                        seriesId: s.id,
                        title: release.title,
                        volumeNumber: release.volumeNumber,
                        isbn: release.isbn,
                        coverImageUrl: release.coverImageUrl,
                        publishedAt: release.publishedDate || null, // 発売日を記録
                        readingStatus: "unread", // 未読（未所有）として扱う
                    }).returning().get();

                    console.log(`[Cron Debug] newBook added:`, JSON.stringify(newBook, null, 2));

                    addedBooks.push(newBook);
                    addedBooksCount++;

                    // 新たに追加したものをexistingBooksリストに足しておく
                    existingBooks.push({
                        volumeNumber: newBook.volumeNumber,
                        title: newBook.title
                    });

                    console.log(`[Cron Debug] existingBooks after push:`, JSON.stringify(existingBooks, null, 2));
                }
            }
        }

        return NextResponse.json({
            message: "Release check completed successfully.",
            checkedSeriesCount: ongoingSeries.length,
            addedBooksCount,
            addedBooks
        });

    } catch (e: any) {
        console.error("Cron Release Check Error:", e);
        return NextResponse.json({ error: "自動更新処理中にエラーが発生しました。" }, { status: 500 });
    }
}
