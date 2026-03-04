"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function SettingsPage() {
    const [importLoading, setImportLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleExport = async (format: "csv" | "json") => {
        try {
            setExportLoading(true);
            setMessage(null);

            const res = await fetch(`/api/export?format=${format}`, {
                method: "GET",
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "エクスポートに失敗しました");
            }

            // Get the blob and trigger download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `bookvault_export_${new Date().toISOString().split("T")[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setMessage({ type: "success", text: `${format.toUpperCase()}のエクスポートが完了しました` });
        } catch (error: any) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setExportLoading(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setImportLoading(true);
            setMessage(null);

            const fileExt = file.name.split(".").pop()?.toLowerCase();
            if (fileExt !== "csv" && fileExt !== "json") {
                throw new Error("CSVまたはJSONファイルを選択してください");
            }

            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`/api/import`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "インポートに失敗しました");
            }

            setMessage({
                type: "success",
                text: `インポートが完了しました（成功: ${data.successCount}件、失敗: ${data.errorCount}件、スキップ: ${data.skipCount}件）`,
            });
        } catch (error: any) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setImportLoading(false);
            e.target.value = ""; // Reset input
        }
    };

    return (
        <div className="py-8 animate-fade-in flex flex-col gap-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[28px] text-text-muted">settings</span>
                設定
            </h1>

            {message && (
                <div
                    className={`p-4 rounded-md border ${message.type === "success"
                            ? "bg-bg-success/20 border-border-success text-text-primary"
                            : "bg-bg-danger/20 border-border-danger text-text-danger"
                        }`}
                >
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Section */}
                <div className="bg-bg-secondary border border-border rounded-lg p-6 flex flex-col gap-4">
                    <h2 className="text-xl font-semibold flex items-center justify-between">
                        <span>エクスポート</span>
                        <span className="material-symbols-outlined text-text-muted">download</span>
                    </h2>
                    <p className="text-sm text-text-secondary">
                        登録されている書籍データをダウンロードします。バックアップには「JSON完全エクスポート」を推奨します。
                    </p>
                    <div className="flex gap-4 mt-auto">
                        <button
                            onClick={() => handleExport("csv")}
                            disabled={exportLoading}
                            className="flex-1 bg-bg-primary hover:bg-bg-hover active:bg-bg-active border border-border text-text-primary px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {exportLoading ? "処理中..." : "CSV"}
                        </button>
                        <button
                            onClick={() => handleExport("json")}
                            disabled={exportLoading}
                            className="flex-1 bg-accent/10 hover:bg-accent/20 active:bg-accent/30 border border-accent/20 text-accent px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {exportLoading ? "処理中..." : "JSON 完全版"}
                        </button>
                    </div>
                </div>

                {/* Import Section */}
                <div className="bg-bg-secondary border border-border rounded-lg p-6 flex flex-col gap-4">
                    <h2 className="text-xl font-semibold flex items-center justify-between">
                        <span>インポート</span>
                        <span className="material-symbols-outlined text-text-muted">upload</span>
                    </h2>
                    <p className="text-sm text-text-secondary">
                        BookVaultのエクスポートファイル、または指定フォーマットのCSV/JSONファイルから書籍を一括登録します。
                    </p>
                    <div className="mt-auto">
                        <input
                            type="file"
                            accept=".csv,.json"
                            onChange={handleImport}
                            disabled={importLoading}
                            className="hidden"
                            id="import-file"
                        />
                        <label
                            htmlFor="import-file"
                            className="flex items-center justify-center gap-2 w-full bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md font-bold cursor-pointer transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">file_upload</span>
                            {importLoading ? "アップロード中..." : "ファイルを選択 (CSV / JSON)"}
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-bg-secondary border border-border rounded-lg p-6 mt-4">
                <h3 className="font-semibold mb-2">CSVのフォーマットについて</h3>
                <p className="text-sm text-text-secondary mb-4">
                    CSVファイルは以下のカラムを持つ必要があります：
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border text-text-secondary">
                                <th className="py-2 px-4 font-medium">カラム名</th>
                                <th className="py-2 px-4 font-medium">説明</th>
                                <th className="py-2 px-4 font-medium">例</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">title</td>
                                <td className="py-2 px-4">書籍のタイトル（必須）</td>
                                <td className="py-2 px-4">進撃の巨人</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">author</td>
                                <td className="py-2 px-4">著者名</td>
                                <td className="py-2 px-4">諫山創</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">volume</td>
                                <td className="py-2 px-4">巻数</td>
                                <td className="py-2 px-4">1</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">isbn</td>
                                <td className="py-2 px-4">ISBN（13桁または10桁）</td>
                                <td className="py-2 px-4">9784063842760</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">platform</td>
                                <td className="py-2 px-4">購入元プラットフォーム名</td>
                                <td className="py-2 px-4">amazon_kindle</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">format</td>
                                <td className="py-2 px-4">フォーマット (physical/digital)</td>
                                <td className="py-2 px-4">digital</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">status</td>
                                <td className="py-2 px-4">ステータス (unread/reading/read/tsundoku)</td>
                                <td className="py-2 px-4">read</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">rating</td>
                                <td className="py-2 px-4">評価（1〜5の数値）</td>
                                <td className="py-2 px-4">5</td>
                            </tr>
                            <tr className="border-b border-border/50">
                                <td className="py-2 px-4 font-mono">purchased_at</td>
                                <td className="py-2 px-4">購入日 (YYYY-MM-DD)</td>
                                <td className="py-2 px-4">2024-03-15</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-4 font-mono">memo</td>
                                <td className="py-2 px-4">任意のメモ内容</td>
                                <td className="py-2 px-4">最高です</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
