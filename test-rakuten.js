const https = require('https');
const appId = process.env.NEXT_PUBLIC_RAKUTEN_APP_ID;

const query = encodeURIComponent("葬送のフリーレン");
const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?applicationId=${appId}&title=${query}&sort=-releaseDate&format=json`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.Items) {
        json.Items.slice(0, 5).forEach(item => {
          console.log(item.Item.title, item.Item.salesDate);
        });
      } else {
        console.log("No items", json);
      }
    } catch (e) { console.log(e); }
  });
}).on('error', (e) => {
  console.error(e);
});
