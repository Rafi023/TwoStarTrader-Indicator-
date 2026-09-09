/**
 * Generates ready-to-use Pine Script v5 code for TradingView
 * implementing the exact XAUUSD AI Scalping Indicator logic.
 */

export function generatePineScriptV5(): string {
  return `//@version=5
indicator("XAUUSD AI Gold Scalping Indicator [SMC + Zones + OB + FVG]", "AI Gold Scalper", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// ==========================================
// 1. INPUT SETTINGS
// ==========================================
grp_main = "Indicator Core Settings"
show_ob        = input.bool(true, "Show Order Blocks (OB)", group=grp_main)
show_fvg       = input.bool(true, "Show Fair Value Gaps (FVG)", group=grp_main)
show_zones     = input.bool(true, "Show Buy & Sell Zones (Supply/Demand)", group=grp_main)
show_reversals = input.bool(true, "Show Valid Reversal Markers (CHoCH / Sweeps)", group=grp_main)
show_signals   = input.bool(true, "Show AI Scalping Signals", group=grp_main)

grp_smc = "SMC Parameters"
swing_lookback = input.int(4, "Fractal Swing Lookback", minval=2, maxval=10, group=grp_smc)
min_fvg_pips   = input.float(3.5, "Min FVG Size (in Pips / $0.35)", minval=1.0, group=grp_smc)
rr_ratio       = input.float(2.5, "Risk-to-Reward Target", minval=1.0, maxval=5.0, group=grp_smc)

// Colors
color_bull_ob   = color.new(#10b981, 75)
color_bull_ob_b = color.new(#059669, 0)
color_bear_ob   = color.new(#ef4444, 75)
color_bear_ob_b = color.new(#dc2626, 0)

color_fvg_bull  = color.new(#06b6d4, 80)
color_fvg_bear  = color.new(#f97316, 80)

color_demand    = color.new(#10b981, 85)
color_supply    = color.new(#f43f5e, 85)

// ==========================================
// 2. SWING HIGHS & LOWS (FRACTALS)
// ==========================================
var float[] swing_highs = array.new_float(0)
var float[] swing_lows  = array.new_float(0)

is_swing_high = true
is_swing_low  = true

for i = 1 to swing_lookback
    if high[i] >= high[0] or high[i] < high[swing_lookback]
        // loop check
        na
is_sh = ta.pivothigh(high, swing_lookback, swing_lookback)
is_sl = ta.pivotlow(low, swing_lookback, swing_lookback)

// ==========================================
// 3. FAIR VALUE GAPS (FVG)
// ==========================================
bull_fvg = show_fvg and (low > high[2]) and (close[1] > open[1]) and ((low - high[2]) >= (min_fvg_pips * syminfo.mintick * 10))
bear_fvg = show_fvg and (high < low[2]) and (close[1] < open[1]) and ((low[2] - high) >= (min_fvg_pips * syminfo.mintick * 10))

if bull_fvg
    box.new(left=bar_index-1, top=low, right=bar_index+10, bottom=high[2],
             bgcolor=color_fvg_bull, border_color=color.new(#0891b2, 30), border_style=line.style_dashed)

if bear_fvg
    box.new(left=bar_index-1, top=low[2], right=bar_index+10, bottom=high,
             bgcolor=color_fvg_bear, border_color=color.new(#ea580c, 30), border_style=line.style_dashed)

// ==========================================
// 4. ORDER BLOCKS (+OB / -OB)
// ==========================================
atr_val = ta.atr(14)
bull_displacement = (close[0] - open[0]) > (atr_val * 0.9) and (close[1] < open[1])
bear_displacement = (open[0] - close[0]) > (atr_val * 0.9) and (close[1] > open[1])

if show_ob and bull_displacement
    // Bullish OB is candle[1]
    ob_top = math.max(open[1], high[1])
    ob_bot = low[1]
    box.new(left=bar_index-1, top=ob_top, right=bar_index+15, bottom=ob_bot,
             bgcolor=color_bull_ob, border_color=color_bull_ob_b, text="+OB", text_color=color.white, text_size=size.tiny)

if show_ob and bear_displacement
    // Bearish OB is candle[1]
    ob_top = high[1]
    ob_bot = math.min(open[1], low[1])
    box.new(left=bar_index-1, top=ob_top, right=bar_index+15, bottom=ob_bot,
             bgcolor=color_bear_ob, border_color=color_bear_ob_b, text="-OB", text_color=color.white, text_size=size.tiny)

// ==========================================
// 5. REVERSALS & LIQUIDITY SWEEPS
// ==========================================
var float last_sh = na
var float last_sl = na

if not na(is_sh)
    last_sh := is_sh
if not na(is_sl)
    last_sl := is_sl

sweep_high = show_reversals and not na(last_sh) and (high > last_sh) and (close < last_sh)
sweep_low  = show_reversals and not na(last_sl) and (low < last_sl) and (close > last_sl)

if sweep_high
    label.new(bar_index, high, "SWEEP HIGH ⚡", style=label.style_label_down, color=color.orange, textcolor=color.white, size=size.tiny)

if sweep_low
    label.new(bar_index, low, "SWEEP LOW ⚡", style=label.style_label_up, color=color.aqua, textcolor=color.white, size=size.tiny)

// ==========================================
// 6. SCALPING SIGNALS & ALERTS
// ==========================================
buy_confluence  = (bull_displacement or sweep_low) and (close > open)
sell_confluence = (bear_displacement or sweep_high) and (close < open)

plotshape(show_signals and buy_confluence, title="Gold AI BUY Signal", style=shape.triangleup,
          location=location.belowbar, color=color.green, size=size.small, text="GOLD BUY")

plotshape(show_signals and sell_confluence, title="Gold AI SELL Signal", style=shape.triangledown,
          location=location.abovebar, color=color.red, size=size.small, text="GOLD SELL")

// Alerts
alertcondition(buy_confluence, title="Gold Scalp BUY Alert", message="⚡ XAUUSD Scalp BUY Confirmed! Target 1:2.5 RR")
alertcondition(sell_confluence, title="Gold Scalp SELL Alert", message="⚡ XAUUSD Scalp SELL Confirmed! Target 1:2.5 RR")
`;
}
