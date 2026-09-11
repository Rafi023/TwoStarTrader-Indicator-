const fs = require('fs');

let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const updateCountdownCode = `      const nextTime = getNextScheduledSignalTime(Date.now());
      setNextSignalMs(nextTime);
      const diff = nextTime - Date.now();
      if (diff <= 0) {
        setTimeUntilNext('GENERATING NOW...');
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      const nextDate = new Date(nextTime);
      const exactTime = \`\${nextDate.getHours().toString().padStart(2, '0')}:\${nextDate.getMinutes().toString().padStart(2, '0')}\`;
      
      setTimeUntilNext(\`\${exactTime} (in \${h > 0 ? h + 'h ' : ''}\${m}m \${s}s)\`);`;

code = code.replace(/const nextTime = getNextScheduledSignalTime[^]*?setTimeUntilNext.*?;/s, updateCountdownCode);

fs.writeFileSync('src/components/Header.tsx', code);
console.log("Header patched again!");
