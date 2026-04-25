import { db } from "@/lib/db";
import { book, series, ownership, platform } from "@/lib/db/schema";
import { eq, getTableColumns } from "drizzle-orm";
import { NextResponse } from "next/server";
import Papa from "papaparse";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    try {
        const books = db.select({
            ...getTableColumns(book),
            seriesTitle: series.title,
            authorName: series.author,
        })
            .from(book)
            .leftJoin(series, eq(book.seriesId, series.id))
            .all();

        const ownerships = db.select({
            ...getTableColumns(ownership),
            platformName: platform.name,
        })
            .from(ownership)
            .leftJoin(platform, eq(ownership.platformId, platform.id))
            .all();

        // Process data to match JSON format
        const fullData = books.map(b => {
            const bookOwnerships = ownerships.filter(o => o.bookId === b.id);
            return {
                ...b,
                ownerships: bookOwnerships
            };
        });

        if (format === "json") {
            return new NextResponse(JSON.stringify(fullData, null, 2), {
                headers: {
                    "Content-Type": "application/json",
                    "Content-Disposition": `attachment; filename="bookvault_export.json"`,
                }
            });
        }

        // CSV mapping according to disc-009 requirements
        // title, author, volume, isbn, platform, format, status, rating, purchased_at, memo
        const csvData = fullData.flatMap(b => {
            if (b.ownerships.length === 0) {
                return [{
                    title: b.seriesTitle,
                    author: b.authorName,
                    volume: b.volumeNumber,
                    isbn: b.isbn || "",
                    platform: "",
                    format: "",
                    status: b.readingStatus,
                    rating: b.rating || "",
                    purchased_at: "",
                    memo: b.memo || ""
                }];
            }
            return b.ownerships.map(o => ({
                title: b.seriesTitle,
                author: b.authorName,
                volume: b.volumeNumber,
                isbn: b.isbn || "",
                platform: o.platformName || "",
                format: o.format || "",
                status: b.readingStatus,
                rating: b.rating || "",
                purchased_at: o.purchasedAt || "",
                memo: b.memo || ""
            }));
        });

        const csvString = Papa.unparse(csvData);
        // Add BOM for Excel compatibility
        const bom = "\uFEFF";

        return new NextResponse(bom + csvString, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="bookvault_export.csv"`,
            }
        });

    } catch (e: any) {
        console.error("Export error:", e);
        return NextResponse.json({ error: "データの取得に失敗しました。" }, { status: 500 });
    }
}
