const https = require('https');

async function check(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }}, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ url, status: res.statusCode, body: data.slice(0, 100) });
      });
    }).on('error', err => resolve({ url, error: err.message }));
  });
}

(async () => {
  console.log(await check('https://api.gold-api.com/price/XAU'));
  console.log(await check('https://financialmodelingprep.com/api/v3/quote/XAUUSD?apikey=demo'));
  console.log(await check('https://forex-data-feed.swissquote.com/public-quotes/bbo2/json'));
})();
