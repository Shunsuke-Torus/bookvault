import { NextRequest, NextResponse } from "next/server";
import { searchBooks, getBookById } from "@/lib/services/search-service";

/**
 * GET /api/search?q=暗殺教室&maxResults=10
 * Google Books API検索のプロキシ
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const maxResults = parseInt(searchParams.get("maxResults") ?? "10", 10);
    const id = searchParams.get("id");

    try {
        // ID指定の場合は1件取得
        if (id) {
            const result = await getBookById(id);
            if (!result) {
                return NextResponse.json(
                    { error: "書籍が見つかりません" },
                    { status: 404 }
                );
            }
            return NextResponse.json(result);
        }

        // タイトル検索
        if (!query) {
            return NextResponse.json(
                { error: "検索クエリ(q)を指定してください" },
                { status: 400 }
            );
        }

        const results = await searchBooks(query, maxResults);
        return NextResponse.json({ items: results, totalItems: results.length });
    } catch (error) {
        console.error("Search API error:", error);
        return NextResponse.json(
            { error: "検索中にエラーが発生しました" },
            { status: 500 }
        );
    }
}
