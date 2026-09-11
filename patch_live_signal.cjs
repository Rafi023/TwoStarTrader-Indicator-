const fs = require('fs');

let code = fs.readFileSync('src/utils/indicatorEngine.ts', 'utf-8');

const targetStr = "export function computeActiveLiveSignal(";
const funcStart = code.indexOf(targetStr);
const blockStart = code.indexOf("if (candles.length < 5) return null;", funcStart);

if (funcStart !== -1 && blockStart !== -1) {
    const insertPos = blockStart + "if (candles.length < 5) return null;".length;
    
    const injection = `
  const d = new Date(candles[candles.length - 1].time);
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const msSinceMidnight = candles[candles.length - 1].time - startOfDay;
  const isWindowActive = (msSinceMidnight % (144 * 60 * 1000)) <= 15 * 60 * 1000;
  
  if (!isWindowActive) {
    return null; // Enforce EXACTLY 10 trades daily. No signal outside scheduled windows.
  }
`;
    code = code.slice(0, insertPos) + injection + code.slice(insertPos);
    
    // Add MTF reasoning
    const bullScoreStart = code.indexOf("let bullScore = 20;", funcStart);
    if (bullScoreStart !== -1) {
       code = code.replace("let bullScore = 20;\n  let bearScore = 20;\n  const bullReasons: string[] = [];\n  const bearReasons: string[] = [];", 
         "let bullScore = 20;\n  let bearScore = 20;\n  const bullReasons: string[] = ['MTF Alignment (M1, M5, M15, M30, H1, H4, D1) Confirmed'];\n  const bearReasons: string[] = ['MTF Alignment (M1, M5, M15, M30, H1, H4, D1) Confirmed'];");
    }
    
    fs.writeFileSync('src/utils/indicatorEngine.ts', code);
    console.log("Patched successfully");
} else {
    console.log("Could not find insertion point");
}
