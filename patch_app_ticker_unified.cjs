const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const effectStart = code.indexOf("// 1. Background Network Poller:");
const effectEnd = code.indexOf("}, [isLiveTicking, mt5Data, timeframe, basePrice, settings, activePosition]);", effectStart);

if (effectStart !== -1 && effectEnd !== -1) {
    const fullEnd = effectEnd + "}, [isLiveTicking, mt5Data, timeframe, basePrice, settings, activePosition]);".length;
    
    const replacement = `  // Unified Live Price Ticker: Syncs and ticks exactly every 1 second
  useEffect(() => {
    if (!isLiveTicking) return;
    let isMounted = true;
    
    const syncAndTick = async () => {
      try {
        const live = await fetchLiveMt5Price(mt5Offset);
        if (!isMounted || !live) return;
        
        setMt5Data(live);
        
        setCandles((prevCandles) => {
          const lastClose = prevCandles[prevCandles.length - 1]?.close || basePrice;
          const { updatedCandles, tickPrice: resolvedTick } = generateNextTick(
            prevCandles,
            timeframe,
            live.price
          );
          
          setPrevPrice(lastClose);

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
      } catch (err) {
        // silent
      }
    };
    
    syncAndTick();
    const interval = setInterval(syncAndTick, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveTicking, mt5Offset, timeframe, basePrice, settings, activePosition]);`;

    code = code.substring(0, effectStart) + replacement + code.substring(fullEnd);
    fs.writeFileSync('src/App.tsx', code);
    console.log("App.tsx patched with unified ticker");
} else {
    console.log("Could not find effect block");
}
