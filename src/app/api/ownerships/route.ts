import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ownership, platform } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

        const plt = db
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

        const newOwnership = db
            .insert(ownership)
            .values({
                bookId,
                platformId: plt.id,
                customUrl,
                platformBookId,
                format,
            })
            .returning()
            .get();

        return NextResponse.json(newOwnership, { status: 201 });
    } catch (error) {
        console.error("Ownership POST error:", error);
        return NextResponse.json(
            { error: "所有情報の登録に失敗しました" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, platformName, format, customUrl, platformBookId } = body;

        if (!id) {
            return NextResponse.json(
                { error: "ownership id は必須です" },
                { status: 400 }
            );
        }

        let updateData: any = {};

        if (platformName) {
            const plt = db
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
            updateData.platformId = plt.id;
        }

        if (format !== undefined) updateData.format = format;
        if (customUrl !== undefined) updateData.customUrl = customUrl;
        if (platformBookId !== undefined) updateData.platformBookId = platformBookId;

        const updatedOwnership = db
            .update(ownership)
            .set(updateData)
            .where(eq(ownership.id, id))
            .returning()
            .get();

        if (!updatedOwnership) {
            return NextResponse.json(
                { error: "指定された所有情報が見つかりません" },
                { status: 404 }
            );
        }

        return NextResponse.json(updatedOwnership, { status: 200 });
    } catch (error) {
        console.error("Ownership PATCH error:", error);
        return NextResponse.json(
            { error: "所有情報の更新に失敗しました" },
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
                { error: "ownership id は必須です" },
                { status: 400 }
            );
        }

        const id = parseInt(idStr, 10);

        const deleted = db
            .delete(ownership)
            .where(eq(ownership.id, id))
            .returning()
            .get();

        if (!deleted) {
            return NextResponse.json(
                { error: "指定された所有情報が見つかりません" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Ownership DELETE error:", error);
        return NextResponse.json(
            { error: "所有情報の削除に失敗しました" },
            { status: 500 }
        );
    }
}
