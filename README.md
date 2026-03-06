---
created: 2026-03-03
author: shuns
version: 0.1
---

# 📚 BookVault

電子書籍・紙書籍の一元管理を行うセルフホスト型の書籍管理Webアプリケーション。

## 機能

- 📖 **書籍管理**: Google Books API連携による書籍検索・自動メタデータ取得
- 🏪 **購入元管理**: Amazon Kindle / DMM / 楽天Kobo / NextCloud等のプラットフォーム対応
- 📊 **読書進捗**: 未読 / 読書中 / 既読 / 積読の4状態管理
- 📥 **CSV/JSONインポート・エクスポート**: 手動でのバックアップと一括書籍登録
- 🏷️ **ラベル管理**: 自動・手動ラベル付けとスマートコレクション
- 🔗 **カスタムURL**: NextCloud上の自炊書籍へのリンク対応

## 技術スタック

| レイヤー       | 技術                               |
| -------------- | ---------------------------------- |
| フロントエンド | Next.js 15 (App Router) + React 19 |
| バックエンド   | Next.js API Routes                 |
| データベース   | SQLite (WALモード) + Drizzle ORM   |
| バリデーション | Zod                                |
| CSV/JSONパース | PapaParse / 標準JSON               |
| コンテナ       | Docker + Docker Compose            |
| CI/CD          | GitHub Actions                     |

## セットアップ

### ローカル開発

```bash
# 依存関係インストール
npm install

# DBセットアップ（マイグレーション + シードデータ）
npm run db:setup

# 開発サーバー起動
npm run dev
```

`http://localhost:3000` でアクセス可能。

### Docker Compose

```bash
docker compose up -d
```

### 環境変数（オプション）

| 変数           | 説明               | デフォルト            |
| -------------- | ------------------ | --------------------- |
| `DATABASE_URL` | SQLiteファイルパス | `./data/bookvault.db` |

## API仕様

| エンドポイント           | メソッド | 説明                     |
| ------------------------ | -------- | ------------------------ |
| `/api/search?q=タイトル` | GET      | Google Books API検索     |
| `/api/books`             | GET      | 書籍一覧                 |
| `/api/books`             | POST     | 書籍登録                 |
| `/api/books`             | PATCH    | 書籍更新（ステータス等） |
| `/api/series`            | GET      | シリーズ一覧             |
| `/api/series?id=N`       | GET      | シリーズ詳細（巻一覧）   |
| `/api/platforms`         | GET      | プラットフォーム一覧     |
| `/api/import`            | POST     | CSV/JSONインポート       |
| `/api/export`            | GET      | CSV/JSONエクスポート     |


## APIキー取得

### 楽天ブックスAPI
https://webservice.rakuten.co.jp/app/list

### How to use
https://webservice.rakuten.co.jp/explorer/api/BooksBook/Search