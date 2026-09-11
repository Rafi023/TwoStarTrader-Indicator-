const fs = require('fs');

let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const hookStart = code.indexOf("const [nextSignalMs, setNextSignalMs]");
const hookEnd = code.indexOf("return () => clearInterval(interval);\n  }, []);", hookStart);

if (hookStart !== -1 && hookEnd !== -1) {
    const fullEnd = hookEnd + "return () => clearInterval(interval);\n  }, []);".length;
    
    const newHook = `
  const [nextSignalMs, setNextSignalMs] = useState<number>(0);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const nextTime = getNextScheduledSignalTime(Date.now());
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
      
      setTimeUntilNext(\`\${exactTime} (in \${h > 0 ? h + 'h ' : ''}\${m}m \${s}s)\`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);`;
    
    code = code.substring(0, hookStart) + newHook + code.substring(fullEnd);
    fs.writeFileSync('src/components/Header.tsx', code);
    console.log("Fixed!");
}
