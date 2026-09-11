const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Find the interval block
const effectStart = code.indexOf("// Live Price Ticker Interval continuously synchronizing with MT5");
const effectEnd = code.indexOf("}, [isLiveTicking, mt5Offset, timeframe, basePrice, settings, activePosition]);", effectStart);

if (effectStart !== -1 && effectEnd !== -1) {
    const fullEnd = effectEnd + "}, [isLiveTicking, mt5Offset, timeframe, basePrice, settings, activePosition]);".length;
    
    const replacement = `  // 1. Background Network Poller: Syncs with live market every 3 seconds
  useEffect(() => {
    if (!isLiveTicking) return;
    let isMounted = true;
    
    const syncMarket = async () => {
      try {
        const live = await fetchLiveMt5Price(mt5Offset);
        if (isMounted && live) {
          setMt5Data(live);
        }
      } catch (err) {
        // silent
      }
    };
    
    syncMarket();
    const interval = setInterval(syncMarket, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveTicking, mt5Offset]);

  // 2. High-Frequency UI Ticker: Updates the screen exactly every 1000ms like MT5
  useEffect(() => {
    if (!isLiveTicking) return;
    
    const tickInterval = setInterval(() => {
      setCandles((prevCandles) => {
        const lastClose = prevCandles[prevCandles.length - 1]?.close || basePrice;
        // Generate a smooth MT5-like tick pulling towards the latest known mt5Data price
        const { updatedCandles, tickPrice: resolvedTick } = generateNextTick(
          prevCandles,
          timeframe,
          mt5Data ? mt5Data.price : undefined
        );
        
        setPrevPrice(lastClose);

        // Check if active position reached TP or SL
        if (activePosition && activePosition.status === 'ACTIVE') {
          const isBuy = activePosition.direction === 'BUY';
          if (isBuy && resolvedTick >= activePosition.takeProfitPrice) {
            setActivePosition((p) => (p ? { ...p, status: 'HIT_TP' } : null));
            if (settings.soundAlerts) playSignalChime('BUY');
          } else if (!isBuy && resolvedTick <= activePosition.takeProfitPrice) {
            setActivePosition((p) => (p ? { ...p, status: 'HIT_TP' } : null));
            if (settings.soundAlerts) playSignalChime('SELL');
          } else if (isBuy && resolvedTick <= activePosition.stopLossPrice) {
            setActivePosition((p) => (p ? { ...p, status: 'HIT_SL' } : null));
          } else if (!isBuy && resolvedTick >= activePosition.stopLossPrice) {
            setActivePosition((p) => (p ? { ...p, status: 'HIT_SL' } : null));
          }
        }

        return updatedCandles;
      });
    }, 1000); // Exactly 1-second MT5-like ticks

    return () => clearInterval(tickInterval);
  }, [isLiveTicking, mt5Data, timeframe, basePrice, settings, activePosition]);`;

    code = code.substring(0, effectStart) + replacement + code.substring(fullEnd);
    fs.writeFileSync('src/App.tsx', code);
    console.log("App.tsx patched");
} else {
    console.log("Could not find effect block");
}
