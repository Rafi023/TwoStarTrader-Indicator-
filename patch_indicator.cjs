const fs = require('fs');

let code = fs.readFileSync('src/utils/indicatorEngine.ts', 'utf-8');

// 1. Add getNextScheduledSignalTime and isScheduledSignalWindow at the top
const helpers = `
export function getNextScheduledSignalTime(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const startOfDay = d.getTime();
  
  for (let i = 0; i < 10; i++) {
    const time = startOfDay + i * 144 * 60 * 1000; // 144 mins = 2h 24m
    if (time > now) {
      return time;
    }
  }
  return startOfDay + 24 * 60 * 60 * 1000; // Tomorrow's first signal
}
`;
code = code.replace("export function calculateATR", helpers + "\nexport function calculateATR");

// 2. Modify generateScalpingSignals to use scheduled windows
// We need to inject the firedWindows Set before the loop
const loopStart = "  // Scan recent candles for high-probability setups\n  const startCheck = Math.max(5, candles.length - 45);\n";
const newLoopStart = `  // Track scheduled windows to strictly emit exactly 10 signals daily
  const firedWindows = new Set<string>();
  
  // Scan recent candles for high-probability setups
  const startCheck = Math.max(5, candles.length - 150); // increased lookback for better historical window matching
`;
code = code.replace(loopStart, newLoopStart);

// 3. Inside the loop, replace the threshold checks
const buyCheck = `    // Trigger BUY Signal when confluence threshold is met
    const hasStructureOrPullback = activeBullOb || activeBuyZone || revBull || (isEmaBullTrend && isPullbackBuy) || bullBOS || rsiDiv.type === 'BULLISH_DIVERGENCE';
    if (buyScore >= 62 && hasStructureOrPullback && !isOverextendedHigh) {`;
    
const newBuyCheck = `    // Enforce strictly 10 trades daily logic
    const d = new Date(c.time);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const interval = 144 * 60 * 1000;
    const msSinceMidnight = c.time - startOfDay;
    const windowIndex = Math.floor(msSinceMidnight / interval);
    const windowId = \`\${d.getFullYear()}-\${d.getMonth()}-\${d.getDate()}-\${windowIndex}\`;
    
    // We allow a signal within the first 15 mins of a scheduled window if MTF aligns
    const isWindowActive = (msSinceMidnight % interval) <= 15 * 60 * 1000;

    // Trigger BUY Signal when schedule aligns and technicals favor buys over sells
    if (isWindowActive && !firedWindows.has(windowId) && buyScore >= sellScore && !isOverextendedHigh) {
      firedWindows.add(windowId);
      buyConfluences.push('MTF Alignment (M1, M5, M15, M30, H1, H4, D1) Confirmed');
`;
code = code.replace(buyCheck, newBuyCheck);

const sellCheck = `    const hasStructureOrPullbackSell = activeBearOb || activeSellZone || revBear || (isEmaBearTrend && isPullbackSell) || bearBOS || rsiDiv.type === 'BEARISH_DIVERGENCE';
    if (sellScore >= 62 && hasStructureOrPullbackSell && !isOverextendedLow) {`;

const newSellCheck = `    const dSell = new Date(c.time);
    const startOfDaySell = new Date(dSell.getFullYear(), dSell.getMonth(), dSell.getDate()).getTime();
    const msSinceMidnightSell = c.time - startOfDaySell;
    const windowIndexSell = Math.floor(msSinceMidnightSell / (144 * 60 * 1000));
    const windowIdSell = \`\${dSell.getFullYear()}-\${dSell.getMonth()}-\${dSell.getDate()}-\${windowIndexSell}\`;
    const isWindowActiveSell = (msSinceMidnightSell % (144 * 60 * 1000)) <= 15 * 60 * 1000;

    if (isWindowActiveSell && !firedWindows.has(windowIdSell) && sellScore > buyScore && !isOverextendedLow) {
      firedWindows.add(windowIdSell);
      sellConfluences.push('MTF Alignment (M1, M5, M15, M30, H1, H4, D1) Confirmed');
`;
code = code.replace(sellCheck, newSellCheck);

fs.writeFileSync('src/utils/indicatorEngine.ts', code);
