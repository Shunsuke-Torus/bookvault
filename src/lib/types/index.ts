// Google Books APIレスポンスの型定義
export interface GoogleBooksVolume {
    id: string;
    volumeInfo: {
        title: string;
        authors?: string[];
        publisher?: string;
        publishedDate?: string;
        description?: string;
        industryIdentifiers?: Array<{
            type: string;
            identifier: string;
        }>;
        pageCount?: number;
        categories?: string[];
        imageLinks?: {
            smallThumbnail?: string;
            thumbnail?: string;
        };
        language?: string;
        seriesInfo?: {
            bookDisplayNumber?: string;
            volumeSeries?: Array<{
                seriesId: string;
                orderNumber: number;
            }>;
        };
    };
    saleInfo?: {
        saleability: string;
        isEbook?: boolean;
        listPrice?: { amount: number; currencyCode: string };
        retailPrice?: { amount: number; currencyCode: string };
    };
}

export interface GoogleBooksResponse {
    totalItems: number;
    items?: GoogleBooksVolume[];
}
// 楽天ブックスAPIレスポンスの型定義
export interface RakutenBooksItem {
    Item: {
        title: string;
        titleKana: string;
        subTitle: string;
        subTitleKana: string;
        seriesName: string;
        seriesNameKana: string;
        contents: string;
        author: string;
        authorKana: string;
        publisherName: string;
        size: string;
        isbn: string;
        itemCaption: string;
        salesDate: string;
        itemPrice: number;
        listPrice: number;
        discountRate: number;
        discountPrice: number;
        itemUrl: string;
        affiliateUrl: string;
        smallImageUrl: string;
        mediumImageUrl: string;
        largeImageUrl: string;
        chirayomiUrl: string;
        availability: string;
        postageFlag: number;
        limitedFlag: number;
        reviewCount: number;
        reviewAverage: string;
        booksGenreId: string;
    };
}

export interface RakutenBooksResponse {
    count: number;
    page: number;
    first: number;
    last: number;
    hits: number;
    carrier: number;
    pageCount: number;
    Items: RakutenBooksItem[];
}

// BookVault内部の型定義
export interface BookSearchResult {
    externalId: string; // 楽天: "rakuten-{isbn}", Google: Google Books ID
    title: string;
    seriesTitle: string | null;
    volumeNumber: number | null;
    authors: string[];
    publisher: string | null;
    publishedDate: string | null;
    description: string | null;
    isbn: string | null;
    coverImageUrl: string | null;
    categories: string[];
    listPrice: number | null;
    seriesId: string | null;
}

export interface CreateBookInput {
    title: string;
    author: string;
    publisher?: string;
    volumeNumber?: number;
    isbn?: string;
    coverImageUrl?: string;
    description?: string;
    externalId?: string; // 楽天: "rakuten-{isbn}", Google: Google Books ID
    externalSeriesId?: string;
    seriesId?: number; // 既存のDB上のシリーズID
    platformName?: string;
    platformBookId?: string;
    customUrl?: string; // NextCloud等のカスタムURL
    format?: "digital" | "physical";
    readingStatus?: "unread" | "reading" | "read" | "backlog";
}

export interface CsvImportRow {
    title: string;
    author: string;
    volume?: string;
    isbn?: string;
    platform?: string;
    format?: string;
    status?: string;
    rating?: string;
    purchased_at?: string;
    custom_url?: string;
    memo?: string;
}
