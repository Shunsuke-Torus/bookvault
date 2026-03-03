import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platform } from "@/lib/db/schema";

/**
 * GET /api/platforms
 * 全プラットフォーム一覧
 */
export async function GET() {
    try {
        const platforms = db.select().from(platform).orderBy(platform.displayName).all();
        return NextResponse.json({ platforms });
    } catch (error) {
        console.error("Platforms GET error:", error);
        return NextResponse.json(
            { error: "プラットフォームの取得に失敗しました" },
            { status: 500 }
        );
    }
}
