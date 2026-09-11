const https = require('https');

async function check(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }}, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ url, status: res.statusCode, body: data.slice(0, 150) }));
    }).on('error', err => resolve({ url, error: err.message }));
  });
}

(async () => {
  // TwelveData
  console.log(await check('https://api.twelvedata.com/price?symbol=XAU/USD&apikey=demo'));
})();
