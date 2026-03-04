const fs = require('fs');

async function test() {
    console.log("Testing search results...");
    try {
        const res = await fetch("http://localhost:3000/api/search?q=" + encodeURIComponent("メダリスト") + "&maxResults=40");
        const data = await res.json();
        const items = data.items || [];
        console.log(`Max results search got: ${items.length} items`);

        const seriesRes = await fetch("http://localhost:3000/api/search?q=" + encodeURIComponent("メダリスト") + "&series=true");
        const seriesData = await seriesRes.json();
        const seriesItems = seriesData.items || [];
        console.log(`Series search got: ${seriesItems.length} items`);

        // Let's filter like the frontend
        const filtered = seriesItems.filter(item => item.authors && item.authors.length > 0 && (item.seriesTitle || item.volumeNumber));
        console.log(`Filtered series items: ${filtered.length} items`);

        const groupMap = new Map();
        for (const item of filtered) {
            const key = item.seriesTitle || item.title;
            if (!groupMap.has(key)) {
                groupMap.set(key, { titles: [], volumes: new Set(), publishers: new Set() });
            }
            const group = groupMap.get(key);
            if (item.volumeNumber !== null) {
                if (!group.volumes.has(item.volumeNumber)) {
                    group.volumes.add(item.volumeNumber);
                    group.titles.push(item.title);
                    group.publishers.add(item.publisher || "不明");
                }
            }
        }

        for (const [key, group] of groupMap.entries()) {
            const vols = Array.from(group.volumes).sort((a, b) => a - b);
            console.log(`\nGroup: ${key}`);
            console.log(`Volumes (${vols.length}): ${vols.join(", ")}`);
            console.log(`Publishers: ${Array.from(group.publishers).join(", ")}`);
        }

        console.log("\nDone!");
    } catch (e) {
        console.error(e);
    }
}
test();
