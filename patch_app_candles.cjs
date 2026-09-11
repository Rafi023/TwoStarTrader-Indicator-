const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = "const liveCandles = await fetchLiveMt5Candles(timeframe, mt5Offset, 80);";

const replacement = `      const currentOffset = (!hasCalibrated && live) ? Number((4336.50 - (live.price - mt5Offset)).toFixed(2)) : mt5Offset;
      const liveCandles = await fetchLiveMt5Candles(timeframe, currentOffset, 80);`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx candles patched");
