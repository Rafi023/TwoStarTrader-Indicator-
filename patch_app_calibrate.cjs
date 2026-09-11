const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add hasCalibrated state
const offsetState = `  // MT5 Broker Offset (e.g. +0.25 to align perfectly with user's specific MT5 broker)
  const [mt5Offset, setMt5Offset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gold_mt5_offset');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });`;

const newOffsetState = `  // MT5 Broker Offset (e.g. +0.25 to align perfectly with user's specific MT5 broker)
  const [mt5Offset, setMt5Offset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gold_mt5_offset');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [hasCalibrated, setHasCalibrated] = useState<boolean>(() => {
    return !!localStorage.getItem('gold_mt5_offset');
  });`;

code = code.replace(offsetState, newOffsetState);

// 2. Auto-calibrate in loadLiveMarket
const loadLiveMarketStart = code.indexOf("const live = await fetchLiveMt5Price(mt5Offset);");
const loadLiveMarketEnd = code.indexOf("if (live) {", loadLiveMarketStart);

if (loadLiveMarketStart !== -1 && loadLiveMarketEnd !== -1) {
  const replacement = `let live = await fetchLiveMt5Price(mt5Offset);
      if (!isMounted) return;
      
      if (live && !hasCalibrated) {
        // Auto-calibrate exactly to 4336.50 on first load to match the baseline
        const rawPrice = live.price - mt5Offset; // get the true Binance price
        const initialOffset = Number((4336.50 - rawPrice).toFixed(2));
        setMt5Offset(initialOffset);
        setHasCalibrated(true);
        localStorage.setItem('gold_mt5_offset', initialOffset.toString());
        
        // Update the live object with the new offset
        live = {
          ...live,
          price: Number((rawPrice + initialOffset).toFixed(2)),
          bid: Number((live.bid - mt5Offset + initialOffset).toFixed(2)),
          ask: Number((live.ask - mt5Offset + initialOffset).toFixed(2))
        };
      }

      if (live) {`;
  
  code = code.substring(0, loadLiveMarketStart) + replacement + code.substring(loadLiveMarketEnd + "if (live) {".length);
}

// 3. Fix handleCalibrateMt5Price to update hasCalibrated
const calibrateMt5 = `  const handleCalibrateMt5Price = (userMt5Price: number) => {
    if (!mt5Data || isNaN(userMt5Price)) return;
    const rawFeedPrice = mt5Data.price - mt5Offset;
    const exactOffset = Number((userMt5Price - rawFeedPrice).toFixed(2));
    handleSetMt5Offset(exactOffset);
  };`;

const newCalibrateMt5 = `  const handleCalibrateMt5Price = (userMt5Price: number) => {
    if (!mt5Data || isNaN(userMt5Price)) return;
    const rawFeedPrice = mt5Data.price - mt5Offset;
    const exactOffset = Number((userMt5Price - rawFeedPrice).toFixed(2));
    handleSetMt5Offset(exactOffset);
    setHasCalibrated(true);
  };`;

code = code.replace(calibrateMt5, newCalibrateMt5);

fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx calibrated");
