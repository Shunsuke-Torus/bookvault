import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { importLog, importLogItem } from "@/lib/db/schema";
import { createBook } from "@/lib/services/book-service";
import { searchBooks } from "@/lib/services/search-service";
import Papa from "papaparse";
import type { CsvImportRow } from "@/lib/types";

/**
 * POST /api/import
 * CSVファイルをインポート（タイトル検索ベース）
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "CSVファイルを指定してください" },
                { status: 400 }
            );
        }

        const csvText = await file.text();
        const { data, errors } = Papa.parse<CsvImportRow>(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim().toLowerCase(),
        });

        if (errors.length > 0) {
            return NextResponse.json(
                { error: "CSVパースエラー", details: errors },
                { status: 400 }
            );
        }

        // インポートログを作成
        const log = db
            .insert(importLog)
            .values({
                source: "csv",
                filename: file.name,
                totalRecords: data.length,
            })
            .returning()
            .get();

        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
            try {
                if (!row.title || !row.author) {
                    db.insert(importLogItem)
                        .values({
                            importLogId: log.id,
                            rawData: JSON.stringify(row),
                            status: "error",
                            errorMessage: "title と author は必須です",
                        })
                        .run();
                    errorCount++;
                    continue;
                }

                // Google Books APIでタイトル検索してメタデータを取得
                let coverImageUrl: string | null = null;
                let googleBooksId: string | null = null;
                let googleSeriesId: string | null = null;
                let publisher: string | null = null;

                const searchQuery = row.volume
                    ? `${row.title} ${row.volume}`
                    : row.title;

                const searchResults = await searchBooks(searchQuery, 3);
                if (searchResults.length > 0) {
                    const best = searchResults[0];
                    coverImageUrl = best.coverImageUrl;
                    googleBooksId = best.googleBooksId;
                    googleSeriesId = best.seriesId;
                    publisher = best.publisher;
                }

                const newBook = await createBook({
                    title: row.volume ? `${row.title} ${row.volume}` : row.title,
                    author: row.author,
                    publisher: publisher ?? undefined,
                    volumeNumber: row.volume ? parseInt(row.volume, 10) : undefined,
                    isbn: row.isbn,
                    coverImageUrl: coverImageUrl ?? undefined,
                    googleBooksId: googleBooksId ?? undefined,
                    googleSeriesId: googleSeriesId ?? undefined,
                    platformName: row.platform,
                    customUrl: row.custom_url,
                    format: (row.format as "digital" | "physical") ?? "digital",
                    readingStatus:
                        (row.status as "unread" | "reading" | "read" | "backlog") ??
                        "unread",
                });

                db.insert(importLogItem)
                    .values({
                        importLogId: log.id,
                        bookId: newBook.id,
                        rawData: JSON.stringify(row),
                        status: "success",
                    })
                    .run();
                successCount++;
            } catch (err) {
                db.insert(importLogItem)
                    .values({
                        importLogId: log.id,
                        rawData: JSON.stringify(row),
                        status: "error",
                        errorMessage:
                            err instanceof Error ? err.message : "不明なエラー",
                    })
                    .run();
                errorCount++;
            }
        }

        // ログの集計を更新
        db.update(importLog)
            .set({ successCount, errorCount })
            .run();

        return NextResponse.json({
            importId: log.id,
            totalRecords: data.length,
            successCount,
            errorCount,
        });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json(
            { error: "インポート中にエラーが発生しました" },
            { status: 500 }
        );
    }
}
