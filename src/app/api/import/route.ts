import { db } from "@/lib/db";
import { book, series, ownership, platform, importLog, importLogItem } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import Papa from "papaparse";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "ファイルがアップロードされていません。" }, { status: 400 });
        }

        const fileName = file.name;
        const fileExt = fileName.split(".").pop()?.toLowerCase();
        const text = await file.text();

        let parsedData: any[] = [];
        let sourceType: "csv" | "json" = "csv";

        if (fileExt === "json") {
            parsedData = JSON.parse(text);
            sourceType = "json";
        } else if (fileExt === "csv") {
            const result = Papa.parse(text, { header: true, skipEmptyLines: true });
            parsedData = result.data;
        } else {
            return NextResponse.json({ error: "CSVまたはJSONファイルが必要です。" }, { status: 400 });
        }

        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;

        // Create Import Log
        const { importId } = db.insert(importLog).values({
            source: sourceType,
            filename: fileName,
            totalRecords: parsedData.length
        }).returning({ importId: importLog.id }).get();

        // Fetch all platforms once
        const allPlatforms = db.select().from(platform).all();
        const platformMap = new Map(allPlatforms.map(p => [p.name, p.id]));

        for (const row of parsedData) {
            try {
                const title = row.title || row.seriesTitle;
                const author = row.author || row.authorName;

                if (!title || !author) {
                    throw new Error("Title and Author are required parameters.");
                }

                // 1. Find or create series
                let seriesRecord = db.select().from(series).where(
                    and(eq(series.title, title), eq(series.author, author))
                ).get();

                if (!seriesRecord) {
                    const newSeries = db.insert(series).values({
                        title,
                        author,
                        status: "ongoing"
                    }).returning().get();
                    seriesRecord = newSeries;
                }

                // 2. Insert book if not exists for that series and volume
                const volumeNumber = row.volume ? parseInt(row.volume, 10) : undefined;
                let bookRecord = db.select().from(book).where(
                    and(
                        eq(book.seriesId, seriesRecord.id),
                        volumeNumber !== undefined ? eq(book.volumeNumber, volumeNumber) : eq(book.title, title)
                    )
                ).get();

                if (!bookRecord) {
                    const newBook = db.insert(book).values({
                        seriesId: seriesRecord.id,
                        title: title,
                        volumeNumber,
                        isbn: row.isbn || null,
                        readingStatus: row.status || row.readingStatus || "unread",
                        rating: row.rating ? parseInt(row.rating, 10) : null,
                        memo: row.memo || null,
                    }).returning().get();
                    bookRecord = newBook;
                }

                // 3. Handle ownership(s)
                if (sourceType === "json" && Array.isArray(row.ownerships)) {
                    for (const own of row.ownerships) {
                        if (own.platformName) {
                            const platId = platformMap.get(own.platformName);
                            if (platId) {
                                const existingOwnership = db.select().from(ownership).where(
                                    and(eq(ownership.bookId, bookRecord.id), eq(ownership.platformId, platId))
                                ).get();
                                if (!existingOwnership) {
                                    db.insert(ownership).values({
                                        bookId: bookRecord.id,
                                        platformId: platId,
                                        format: own.format || "digital",
                                        purchasedAt: own.purchasedAt || row.purchased_at || null
                                    }).run();
                                }
                            }
                        }
                    }
                } else {
                    const platStr = row.platform || row.platformName;
                    if (platStr) {
                        const platId = platformMap.get(platStr);
                        if (platId) {
                            const existingOwnership = db.select().from(ownership).where(
                                and(eq(ownership.bookId, bookRecord.id), eq(ownership.platformId, platId))
                            ).get();
                            if (!existingOwnership) {
                                db.insert(ownership).values({
                                    bookId: bookRecord.id,
                                    platformId: platId,
                                    format: row.format || "digital",
                                    purchasedAt: row.purchased_at || row.purchasedAt || null
                                }).run();
                            }
                        }
                    }
                }

                successCount++;
                db.insert(importLogItem).values({
                    importLogId: importId,
                    bookId: bookRecord.id,
                    rawData: JSON.stringify(row),
                    status: "success"
                }).run();

            } catch (err: any) {
                errorCount++;
                db.insert(importLogItem).values({
                    importLogId: importId,
                    rawData: JSON.stringify(row),
                    status: "error",
                    errorMessage: err.message
                }).run();
            }
        }

        db.update(importLog).set({
            successCount,
            errorCount
        }).where(eq(importLog.id, importId)).run();

        return NextResponse.json({ successCount, errorCount, skipCount });

    } catch (e: any) {
        console.error("Import error:", e);
        return NextResponse.json({ error: e.message || "インポートに失敗しました" }, { status: 500 });
    }
}
