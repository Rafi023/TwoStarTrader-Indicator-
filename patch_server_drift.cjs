const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const replacement = `    const microTick = Number(((Math.random() - 0.5) * 0.25).toFixed(2));
    lastKnownGoldPrice = Number((lastKnownGoldPrice + microTick).toFixed(2));
    const price = lastKnownGoldPrice;`;

code = code.replace("    const microTick = Number(((Math.random() - 0.5) * 0.25).toFixed(2));\n    const price = Number((lastKnownGoldPrice + microTick).toFixed(2));", replacement);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts drift");
