import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ownership, platform } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { bookId, platformName, format = "digital", customUrl, platformBookId } = body;

        if (!bookId || !platformName) {
            return NextResponse.json(
                { error: "bookId と platformName は必須です" },
                { status: 400 }
            );
        }

        const plt = await db
            .select()
            .from(platform)
            .where(eq(platform.name, platformName))
            .get();

        if (!plt) {
            return NextResponse.json(
                { error: "指定されたプラットフォームが見つかりません" },
                { status: 404 }
            );
        }

        const [newOwnership] = await db
            .insert(ownership)
            .values({
                bookId,
                platformId: plt.id,
                customUrl,
                platformBookId,
                format,
            })
            .returning();

        return NextResponse.json(newOwnership, { status: 201 });
    } catch (error) {
        console.error("Ownership POST error:", error);
        return NextResponse.json(
            { error: "所有情報の登録に失敗しました" },
            { status: 500 }
        );
    }
}
