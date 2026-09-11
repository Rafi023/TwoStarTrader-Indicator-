const fs = require('fs');
let code = fs.readFileSync('src/utils/marketData.ts', 'utf-8');

const targetMethod = "export function generateNextTick(";
const startIdx = code.indexOf(targetMethod);
const blockStart = code.indexOf("let newPrice: number;", startIdx);
const blockEnd = code.indexOf("if (elapsed >= candleDuration) {", blockStart);

if (blockStart !== -1 && blockEnd !== -1) {
  const newBlock = `  let newPrice: number;
  if (liveTargetPrice !== undefined && !isNaN(liveTargetPrice) && liveTargetPrice > 0) {
    // Exactly match the live feed without artificial randomization
    newPrice = Number(liveTargetPrice.toFixed(2));
  } else {
    const tickDelta = Number(((Math.random() - 0.5) * 0.45).toFixed(2));
    newPrice = Number((last.close + tickDelta).toFixed(2));
  }

`;
  
  code = code.slice(0, blockStart) + newBlock + code.slice(blockEnd);
  fs.writeFileSync('src/utils/marketData.ts', code);
  console.log("marketData.ts patched");
} else {
  console.log("Could not patch marketData.ts");
}
