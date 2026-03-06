import { NextRequest, NextResponse } from "next/server";
import { getAllSeries, getSeriesBooks, deleteSeries } from "@/lib/services/book-service";

/**
 * GET /api/series
 * 全シリーズ一覧（ダッシュボード用）
 * GET /api/series?id=1
 * シリーズ詳細（巻一覧付き）
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (id) {
            const result = await getSeriesBooks(parseInt(id, 10));
            if (!result) {
                return NextResponse.json(
                    { error: "シリーズが見つかりません" },
                    { status: 404 }
                );
            }
            return NextResponse.json(result);
        }

        const allSeries = await getAllSeries();
        return NextResponse.json({ series: allSeries });
    } catch (error) {
        console.error("Series GET error:", error);
        return NextResponse.json(
            { error: "シリーズの取得に失敗しました" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const idStr = searchParams.get('id');

        if (!idStr) {
            return NextResponse.json(
                { error: "id は必須です" },
                { status: 400 }
            );
        }

        const id = parseInt(idStr, 10);
        await deleteSeries(id);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Series DELETE error:", error);
        return NextResponse.json(
            { error: "シリーズの削除に失敗しました" },
            { status: 500 }
        );
    }
}
