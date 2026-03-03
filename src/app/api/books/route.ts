import { NextRequest, NextResponse } from "next/server";
import { createBook } from "@/lib/services/book-service";
import { db } from "@/lib/db";
import { book, ownership, platform, bookExternalId } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/books
 * 全書籍一覧を取得
 */
export async function GET() {
    try {
        const books = db
            .select()
            .from(book)
            .orderBy(book.title)
            .all();

        return NextResponse.json({ books });
    } catch (error) {
        console.error("Books GET error:", error);
        return NextResponse.json(
            { error: "書籍の取得に失敗しました" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/books
 * 書籍を登録（Google Books検索結果 or 手動入力）
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.title || !body.author) {
            return NextResponse.json(
                { error: "タイトルと著者名は必須です" },
                { status: 400 }
            );
        }

        const newBook = await createBook({
            title: body.title,
            author: body.author,
            publisher: body.publisher,
            volumeNumber: body.volumeNumber,
            isbn: body.isbn,
            coverImageUrl: body.coverImageUrl,
            description: body.description,
            googleBooksId: body.googleBooksId,
            googleSeriesId: body.googleSeriesId,
            seriesId: body.seriesId,
            platformName: body.platformName,
            platformBookId: body.platformBookId,
            customUrl: body.customUrl,
            format: body.format,
            readingStatus: body.readingStatus,
        });

        return NextResponse.json(newBook, { status: 201 });
    } catch (error) {
        console.error("Books POST error:", error);
        return NextResponse.json(
            { error: "書籍の登録に失敗しました" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/books
 * 書籍情報を更新（読書ステータス、お気に入り、評価等）
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: "書籍IDは必須です" },
                { status: 400 }
            );
        }

        const updates: Record<string, unknown> = {};
        if (body.readingStatus !== undefined) updates.readingStatus = body.readingStatus;
        if (body.isFavorite !== undefined) updates.isFavorite = body.isFavorite;
        if (body.rating !== undefined) updates.rating = body.rating;
        if (body.memo !== undefined) updates.memo = body.memo;
        if (body.readingStatus === "read" && !body.readAt) {
            updates.readAt = new Date().toISOString();
        }

        const updated = db
            .update(book)
            .set(updates)
            .where(eq(book.id, body.id))
            .returning()
            .get();

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Books PATCH error:", error);
        return NextResponse.json(
            { error: "書籍の更新に失敗しました" },
            { status: 500 }
        );
    }
}
