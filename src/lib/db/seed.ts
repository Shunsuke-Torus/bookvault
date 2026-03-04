import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { platform, appSetting } from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH =
    process.env.DATABASE_URL || path.join(process.cwd(), "data", "bookvault.db");

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

async function seed() {
    console.log("🌱 シードデータの投入を開始...");

    // プラットフォームマスタ
    const platforms = [
        {
            name: "amazon_kindle",
            displayName: "Amazon Kindle",
            libraryUrl: "https://read.amazon.co.jp/kindle-library",
            bookUrlTemplate: "https://read.amazon.co.jp/manga/{id}",
        },
        {
            name: "dmm_books",
            displayName: "DMM ブックス",
            libraryUrl: "https://book.dmm.com/library/",
            bookUrlTemplate: "https://book.dmm.com/detail/{id}/",
        },
        {
            name: "d_anime_store",
            displayName: "dアニメストア",
            libraryUrl: "https://animestore.docomo.ne.jp/animestore/mpb_viw",
            bookUrlTemplate: "https://animestore.docomo.ne.jp/animestore/book/content?titleid={id}",
        },
        {
            name: "nextcloud",
            displayName: "NextCloud",
            libraryUrl: null,
            bookUrlTemplate: null,
        },
        {
            name: "physical",
            displayName: "紙の書籍",
            libraryUrl: null,
            bookUrlTemplate: null,
        },
    ];

    for (const p of platforms) {
        db.insert(platform)
            .values(p)
            .onConflictDoNothing({ target: platform.name })
            .run();
    }
    console.log(`  ✅ プラットフォーム: ${platforms.length}件`);

    // アプリ設定初期値
    const settings = [
        { key: "discord_webhook_url", value: '""' },
        { key: "sale_check_interval_hours", value: "12" },
        { key: "sale_discount_threshold", value: "30" },
        { key: "sale_notification_cooldown_days", value: "7" },
        { key: "google_books_api_key", value: '""' },
    ];

    for (const s of settings) {
        db.insert(appSetting)
            .values(s)
            .onConflictDoNothing({ target: appSetting.key })
            .run();
    }
    console.log(`  ✅ アプリ設定: ${settings.length}件`);

    console.log("🎉 シードデータの投入が完了しました");
    sqlite.close();
}

seed().catch(console.error);
