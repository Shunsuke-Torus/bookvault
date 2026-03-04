import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================
// SERIES: シリーズ（作品）テーブル
// ============================================================
export const series = sqliteTable("series", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    titleKana: text("title_kana"),
    author: text("author").notNull(),
    authorKana: text("author_kana"),
    publisher: text("publisher"),
    totalVolumes: integer("total_volumes"),
    status: text("status", { enum: ["ongoing", "completed", "hiatus"] })
        .notNull()
        .default("ongoing"),
    coverImageUrl: text("cover_image_url"),
    coverImagePath: text("cover_image_path"),
    description: text("description"),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
        .notNull()
        .default(sql`(datetime('now'))`),
});

// ============================================================
// BOOK: 書籍（巻）テーブル
// ============================================================
export const book = sqliteTable("book", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seriesId: integer("series_id").references(() => series.id, {
        onDelete: "set null",
    }),
    title: text("title").notNull(),
    volumeNumber: integer("volume_number"),
    isbn: text("isbn"), // NULL許容・非UNIQUE（電子書籍はISBNがないケースが多い）
    coverImageUrl: text("cover_image_url"),
    coverImagePath: text("cover_image_path"),
    readingStatus: text("reading_status", {
        enum: ["unread", "reading", "read", "backlog"],
    })
        .notNull()
        .default("unread"),
    isFavorite: integer("is_favorite", { mode: "boolean" })
        .notNull()
        .default(false),
    rating: integer("rating"),
    memo: text("memo"),
    readAt: text("read_at"),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
        .notNull()
        .default(sql`(datetime('now'))`),
});

// ============================================================
// PLATFORM: 購入プラットフォームテーブル
// ============================================================
export const platform = sqliteTable("platform", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    libraryUrl: text("library_url"), // ライブラリ一覧ページURL
    bookUrlTemplate: text("book_url_template"), // 個別書籍URL（{id}を置換）
    iconUrl: text("icon_url"),
    iconPath: text("icon_path"),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(datetime('now'))`),
});

// ============================================================
// OWNERSHIP: 所有情報テーブル
// ============================================================
export const ownership = sqliteTable("ownership", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookId: integer("book_id")
        .notNull()
        .references(() => book.id, { onDelete: "cascade" }),
    platformId: integer("platform_id")
        .notNull()
        .references(() => platform.id, { onDelete: "restrict" }),
    platformBookId: text("platform_book_id"), // プラットフォーム側の書籍ID（ASIN等）
    customUrl: text("custom_url"), // ユーザー定義URL（NextCloudローカルアドレス等）
    format: text("format", { enum: ["digital", "physical"] })
        .notNull()
        .default("digital"),
    purchasedAt: text("purchased_at"),
    purchasePrice: integer("purchase_price"), // 円単位
    memo: text("memo"),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(datetime('now'))`),
});

// ============================================================
// LABEL: ラベル・タグテーブル
// ============================================================
export const label = sqliteTable("label", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    color: text("color").default("#6B7280"),
    isAuto: integer("is_auto", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(datetime('now'))`),
});

// ============================================================
// BOOK_LABEL: 書籍-ラベル中間テーブル
// ============================================================
export const bookLabel = sqliteTable("book_label", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookId: integer("book_id")
        .notNull()
        .references(() => book.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
        .notNull()
        .references(() => label.id, { onDelete: "cascade" }),
});

// ============================================================
// LABEL_LINK: ラベル間関連テーブル
// ============================================================
export const labelLink = sqliteTable("label_link", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    labelIdFrom: integer("label_id_from")
        .notNull()
        .references(() => label.id, { onDelete: "cascade" }),
    labelIdTo: integer("label_id_to")
        .notNull()
        .references(() => label.id, { onDelete: "cascade" }),
});

// ============================================================
// SERIES_EXTERNAL_ID: シリーズ外部ID紐付けテーブル
// ============================================================
export const seriesExternalId = sqliteTable("series_external_id", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seriesId: integer("series_id")
        .notNull()
        .references(() => series.id, { onDelete: "cascade" }),
    source: text("source", {
        enum: ["google_books", "rakuten", "dmm", "ndl", "openbd"],
    }).notNull(),
    externalId: text("external_id").notNull(),
});

// ============================================================
// BOOK_EXTERNAL_ID: 書籍外部ID紐付けテーブル
// ============================================================
export const bookExternalId = sqliteTable("book_external_id", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookId: integer("book_id")
        .notNull()
        .references(() => book.id, { onDelete: "cascade" }),
    source: text("source", {
        enum: ["google_books", "rakuten", "dmm", "ndl", "openbd", "asin"],
    }).notNull(),
    externalId: text("external_id").notNull(),
});

// ============================================================
// PRICE_HISTORY: 価格履歴テーブル（Phase 2 - スキーマのみ）
// ============================================================
export const priceHistory = sqliteTable("price_history", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookId: integer("book_id")
        .notNull()
        .references(() => book.id, { onDelete: "cascade" }),
    platformId: integer("platform_id")
        .notNull()
        .references(() => platform.id, { onDelete: "restrict" }),
    regularPrice: integer("regular_price"),
    salePrice: integer("sale_price"),
    discountPercent: integer("discount_percent"),
    checkedAt: text("checked_at")
        .notNull()
        .default(sql`(datetime('now'))`),
});

// ============================================================
// NOTIFICATION_LOG: 通知ログテーブル（Phase 2 - スキーマのみ）
// ============================================================
export const notificationLog = sqliteTable("notification_log", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookId: integer("book_id")
        .notNull()
        .references(() => book.id, { onDelete: "cascade" }),
    platformId: integer("platform_id")
        .notNull()
        .references(() => platform.id, { onDelete: "restrict" }),
    notificationType: text("notification_type", {
        enum: ["sale", "new_volume", "price_drop"],
    }).notNull(),
    salePrice: integer("sale_price"),
    discountPercent: integer("discount_percent"),
    notifiedAt: text("notified_at")
        .notNull()
        .default(sql`(datetime('now'))`),
    channel: text("channel", { enum: ["discord", "email", "webpush"] })
        .notNull()
        .default("discord"),
});

// ============================================================
// IMPORT_LOG: インポート履歴テーブル
// ============================================================
export const importLog = sqliteTable("import_log", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source", { enum: ["csv", "json", "api_batch", "manual"] }).notNull(),
    filename: text("filename"),
    totalRecords: integer("total_records").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    importedAt: text("imported_at")
        .notNull()
        .default(sql`(datetime('now'))`),
});

// ============================================================
// IMPORT_LOG_ITEM: インポート明細テーブル
// ============================================================
export const importLogItem = sqliteTable("import_log_item", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    importLogId: integer("import_log_id")
        .notNull()
        .references(() => importLog.id, { onDelete: "cascade" }),
    bookId: integer("book_id").references(() => book.id, {
        onDelete: "set null",
    }),
    rawData: text("raw_data"),
    status: text("status", { enum: ["success", "error", "skipped"] }).notNull(),
    errorMessage: text("error_message"),
});

// ============================================================
// APP_SETTING: アプリケーション設定テーブル
// ============================================================
export const appSetting = sqliteTable("app_setting", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: text("updated_at")
        .notNull()
        .default(sql`(datetime('now'))`),
});
