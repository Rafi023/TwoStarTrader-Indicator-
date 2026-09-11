const fs = require('fs');

let code = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// Add import for getNextScheduledSignalTime
if (!code.includes('getNextScheduledSignalTime')) {
  code = code.replace("import { IndicatorSettings", "import { getNextScheduledSignalTime } from '../utils/indicatorEngine';\nimport { IndicatorSettings");
}

// Add state for countdown
const headerStart = "export const Header: React.FC<HeaderProps> = ({";
const returnStart = "  return (\n    <header";

if (code.includes(returnStart)) {
  const insertState = `
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
      setTimeUntilNext(\`\${h > 0 ? h + 'h ' : ''}\${m}m \${s}s\`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);
`;
  code = code.replace(returnStart, insertState + "\n" + returnStart);
}

// Add UI for countdown
// Insert next to the timeframe selector
const tfSelector = "        {/* Timeframe selector */}";
const countdownUI = `
        {/* Next Signal Schedule Countdown */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 shadow-xs mr-2">
           <Zap className="w-4 h-4 text-indigo-600 animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[9px] font-black uppercase text-indigo-800 tracking-wider leading-none">Next Signal In</span>
             <span className="text-xs font-mono font-bold text-indigo-950 leading-none mt-0.5">{timeUntilNext}</span>
           </div>
        </div>
`;
code = code.replace(tfSelector, countdownUI + "\n" + tfSelector);

fs.writeFileSync('src/components/Header.tsx', code);
console.log("Header patched!");
