const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace the ticker/24hr with ticker/bookTicker
code = code.replace(
  'const resp = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT", {',
  'const resp = await fetch("https://api.binance.com/api/v3/ticker/bookTicker?symbol=PAXGUSDT", {'
);

// We need to parse bookTicker correctly
const parse24hr = `      const d: any = await resp.json();
      const lastPrice = parseFloat(d.lastPrice);
      const bid = parseFloat(d.bidPrice) || Number((lastPrice - 0.15).toFixed(2));
      const ask = parseFloat(d.askPrice) || Number((lastPrice + 0.15).toFixed(2));
      const high = parseFloat(d.highPrice) || lastPrice + 12;
      const low = parseFloat(d.lowPrice) || lastPrice - 15;
      const change = parseFloat(d.priceChange) || 0;
      const changePct = parseFloat(d.priceChangePercent) || 0;
      const spreadPips = Number(((ask - bid) * 10).toFixed(1));

      lastKnownGoldPrice = lastPrice;
      lastKnownHigh = high;
      lastKnownLow = low;
      lastKnownChange = change;
      lastKnownChangePercent = changePct;`;

const parseBookTicker = `      const d: any = await resp.json();
      const bid = parseFloat(d.bidPrice);
      const ask = parseFloat(d.askPrice);
      const lastPrice = Number(((bid + ask) / 2).toFixed(2));
      
      const high = lastKnownHigh;
      const low = lastKnownLow;
      const change = lastKnownChange;
      const changePct = lastKnownChangePercent;
      const spreadPips = Number(((ask - bid) * 10).toFixed(1));

      lastKnownGoldPrice = lastPrice;`;

code = code.replace(parse24hr, parseBookTicker);

// Fix the cache
code = code.replace(
  'if (cachedLivePrice && now - cachedLivePrice.timestamp < 0) {',
  'if (cachedLivePrice && now - cachedLivePrice.timestamp < 1000) {'
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts");
