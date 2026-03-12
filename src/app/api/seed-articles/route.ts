import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ARTICLES = [
  {
    title: "Understanding Support and Resistance",
    category: "strategy",
    read_time: 5,
    published: true,
    excerpt: "Learn how to identify key price levels that can help you make better trading decisions.",
    content: `## What are Support and Resistance?

Support and resistance are the foundation of technical analysis. Every serious trader needs to master these concepts before anything else.

**Support** is a price level where buying pressure is strong enough to prevent the price from falling further. Think of it as a floor — the price bounces off it upward.

**Resistance** is a price level where selling pressure is strong enough to prevent the price from rising further. Think of it as a ceiling — the price bounces off it downward.

## Why Do They Form?

Support and resistance form because of human psychology and market memory. When price reaches a level where many traders previously bought or sold, those same traders remember that level and act on it again.

- **Previous highs** become resistance
- **Previous lows** become support
- **Round numbers** (like $70,000 for BTC) act as psychological levels
- **Moving averages** act as dynamic support/resistance

## How to Identify Key Levels

1. Look at the left side of the chart — where did price reverse multiple times?
2. Count the touches — the more times price touched a level and reversed, the stronger it is
3. Look for consolidation zones — areas where price moved sideways
4. Note high-volume areas — levels with high volume are stronger

## Support Becomes Resistance (And Vice Versa)

This is one of the most powerful concepts: when a support level breaks, it often becomes resistance, and vice versa.

Example: If BTC breaks below $60,000 (a former support), that $60,000 level will now act as resistance on the way back up.

## Practical Trading Tips

**Buying at support:**
- Wait for price to reach the support level
- Look for a confirmation candle (bullish engulfing, hammer)
- Place stop loss just below the support
- Target the next resistance level

**Selling at resistance:**
- Wait for price to reach the resistance level
- Look for a bearish confirmation candle
- Place stop loss just above the resistance
- Target the next support level

## Common Mistakes

❌ Trading every level — focus only on the strongest levels with multiple touches
❌ Ignoring the trend — support in a downtrend often breaks
❌ Placing stops exactly at the level — give it some room (0.5-1%)
❌ Forgetting about liquidity — price often wicks through levels to grab liquidity before reversing`,
  },
  {
    title: "What is RSI and How to Use It",
    category: "guide",
    read_time: 7,
    published: true,
    excerpt: "A complete guide to understanding and using the RSI indicator in crypto trading.",
    content: `## What is the RSI?

The Relative Strength Index (RSI) is a momentum oscillator that measures the speed and magnitude of price changes. It was developed by J. Welles Wilder Jr. and published in 1978.

RSI oscillates between 0 and 100, making it easy to read at a glance.

## How to Read RSI

Standard RSI settings use a 14-period lookback window.

- **Above 70** — Overbought: potential reversal downward
- **50–70** — Bullish momentum zone
- **30–50** — Bearish momentum zone
- **Below 30** — Oversold: potential reversal upward

## RSI Divergence — The Most Powerful Signal

Divergence occurs when price and RSI move in opposite directions. This is often a leading indicator of trend reversal.

**Bullish Divergence:**
- Price makes a lower low
- RSI makes a higher low
- Signal: potential reversal upward

**Bearish Divergence:**
- Price makes a higher high
- RSI makes a lower high
- Signal: potential reversal downward

## How Blocknate Uses RSI

In our signal engine, RSI plays a key role:

- RSI < 30 adds +25 confidence points to LONG signals
- RSI > 70 adds +25 confidence points to SHORT signals
- We combine RSI with MACD and EMA for higher accuracy

## Practical RSI Trading Rules

**Rule 1: Don't trade RSI alone.** RSI in a strong uptrend can stay above 70 for a long time. Always combine with trend analysis.

**Rule 2: Use different timeframes.** Use 1H RSI for entry timing, 4H RSI for trend direction, and 1D RSI for overall market context.

**Rule 3: RSI 50 crossover.** When RSI crosses above 50, it signals bullish momentum. Below 50 means bearish momentum.

## Common Mistakes

❌ Shorting just because RSI is above 70 — in bull markets, RSI stays high
❌ Ignoring the trend — RSI signals work best with the trend
❌ Using RSI alone — always confirm with price action`,
  },
  {
    title: "Head and Shoulders Pattern",
    category: "pattern",
    read_time: 6,
    published: true,
    excerpt: "Learn to identify and trade the classic head and shoulders reversal pattern.",
    content: `## What is the Head and Shoulders Pattern?

The Head and Shoulders is one of the most reliable reversal patterns in technical analysis. It signals the end of an uptrend and the beginning of a downtrend.

## The Anatomy

The pattern consists of three peaks:

1. **Left Shoulder** — price rises to a peak, then falls
2. **Head** — price rises to a higher peak, then falls
3. **Right Shoulder** — price rises to a lower peak similar to the left, then falls
4. **Neckline** — the support line connecting the two troughs between the peaks

## How to Identify It

✅ Three peaks where the middle peak is the highest
✅ The two shoulders are roughly equal in height
✅ A clear neckline that can be horizontal or slightly sloping
✅ Volume typically decreases from left shoulder to right shoulder

## Trading the Pattern

**Entry:** Wait for the price to break BELOW the neckline. Enter on the breakout or on a retest of the neckline as new resistance.

**Stop Loss:** Place above the right shoulder for a clearly defined risk level.

**Target:** Measure the distance from the head to the neckline, then project that distance downward from the neckline break point.

**Example calculation:**
- Head at $75,000
- Neckline at $68,000
- Distance = $7,000
- Target = $68,000 − $7,000 = $61,000

## Volume Confirmation

Volume should be highest on the left shoulder, decrease on the head, be lowest on the right shoulder, and then surge on the neckline breakout. The volume surge on the breakout is critical confirmation.

## Common Mistakes

❌ Entering too early — wait for the neckline break
❌ Ignoring volume — a breakout without volume surge is often a fake-out
❌ Not setting a stop loss — always protect your trade
❌ Pattern failure — if price closes back above the neckline, the pattern is invalid`,
  },
  {
    title: "Bullish Engulfing Candle",
    category: "pattern",
    read_time: 4,
    published: true,
    excerpt: "Master the bullish engulfing candlestick pattern for better entry timing.",
    content: `## What is a Bullish Engulfing Pattern?

The Bullish Engulfing is a powerful two-candle reversal pattern that signals a shift from bearish to bullish momentum. It's one of the most reliable candlestick patterns for finding entry points.

## How to Identify It

The pattern requires exactly two candles in a downtrend:

**Candle 1 — Bearish:**
- Red/bearish candle
- Part of an existing downtrend

**Candle 2 — The Engulfing Candle:**
- Green/bullish candle
- Opens below the close of candle 1
- Closes above the open of candle 1
- The body completely engulfs the body of candle 1

## Why It Works

The pattern shows a dramatic shift in market sentiment in a single session. Bears were in control, then bulls opened aggressively lower and completely reversed the move by the close — showing bulls have overwhelmed bears decisively.

## Strength Factors

✅ Appears after a prolonged downtrend (not just 1-2 red candles)
✅ The engulfing candle is much larger than the bearish candle
✅ Volume is significantly higher on the engulfing candle
✅ Forms at a key support level or round number
✅ Confirmed by RSI being in oversold territory

## Trading the Pattern

**Entry options:**
- Enter at the close of the engulfing candle (aggressive entry)
- Enter on the next candle open (conservative entry)
- Enter on a pullback to 50% of the engulfing candle (best risk/reward)

**Stop Loss:** Place below the low of the engulfing candle.

**Target:** Previous resistance level or a 2:1 to 3:1 risk/reward ratio.

## Combining With Other Signals

For highest accuracy, combine bullish engulfing with RSI below 35 (oversold), a key support level, high volume, and positive news sentiment. This multi-factor approach is how Blocknate's signal engine generates high-confidence entries.`,
  },
  {
    title: "Position Sizing: The Most Important Skill in Trading",
    category: "guide",
    read_time: 8,
    published: true,
    excerpt: "Learn how to size your positions correctly to survive drawdowns and grow your account consistently.",
    content: `## Why Position Sizing Is Everything

Most traders focus on finding the right entry. But the biggest factor in long-term success is not what you trade — it's how much you trade with.

Proper position sizing is what separates traders who last from those who blow up their accounts.

## The Core Rule: Risk Only 1-2% Per Trade

Never risk more than 1-2% of your total account on any single trade.

**Example:**
- Account size: $10,000
- Max risk per trade (1%): $100
- If your stop loss is 5% away from entry
- Position size = $100 / 5% = $2,000

You would buy $2,000 worth of the asset — not your entire account.

## Why This Matters

With 1% risk per trade, you can lose 10 trades in a row and still have 90% of your capital. With 10% risk per trade, 10 consecutive losses means you're wiped out.

Even the best traders have losing streaks. Position sizing ensures you survive them.

## The Kelly Criterion

A more advanced formula for optimal position sizing:

Kelly % = Win Rate − (Loss Rate / Win/Loss Ratio)

**Example:**
- Win rate: 60% (0.6)
- Loss rate: 40% (0.4)
- Average win: 3%, average loss: 1% → ratio of 3
- Kelly % = 0.6 − (0.4 / 3) = 0.47 = 47%

Most traders use half-Kelly (23%) to reduce variance.

## Leverage and Position Sizing

With leverage, position sizing becomes critical:

✅ 2x leverage: smaller positions, manageable risk
✅ 5x leverage: requires very tight stop losses
❌ 20x+ leverage: gambling, not trading

At Blocknate, our signals include recommended leverage for each setup based on the risk level.

## Practical Framework

1. Decide your max risk per trade (1% of account)
2. Calculate your stop loss distance in percentage
3. Divide risk amount by stop distance to get position size
4. Never adjust position size after entry
5. Scale out at take profit levels to lock in gains

## Common Mistakes

❌ Going all-in on a "sure thing" — there are no sure things
❌ Adding to losing positions — never average down on a losing trade
❌ Changing position size emotionally after wins or losses
❌ Ignoring fees — trading fees erode small accounts quickly`,
  },
  {
    title: "Dollar-Cost Averaging (DCA) Strategy",
    category: "strategy",
    read_time: 5,
    published: true,
    excerpt: "How to use DCA to build crypto positions without timing the market.",
    content: `## What is Dollar-Cost Averaging?

Dollar-Cost Averaging (DCA) is an investment strategy where you divide your total investment amount into smaller, equal purchases made at regular intervals — regardless of price.

Instead of trying to time the market, you invest systematically over time.

## How DCA Works

**Example:** You want to invest $12,000 in Bitcoin.

**Lump sum approach:** Buy $12,000 of BTC today at whatever price it is.

**DCA approach:** Buy $1,000 of BTC every month for 12 months.

With DCA, you buy more Bitcoin when the price is low, and less when the price is high. Over time, your average cost per Bitcoin will be lower than the average price during the period.

## Why DCA Works in Crypto

Crypto is extremely volatile. Trying to time the perfect entry is nearly impossible — even for professionals.

DCA removes emotion from the equation:
- No FOMO when prices are rising
- No fear when prices are dropping (you just buy more)
- No analysis paralysis about timing

## DCA in a Bear Market

Bear markets are where DCA truly shines. Every dip is an opportunity to accumulate more at lower prices.

✅ Prices drop 30%? Buy your scheduled amount.
✅ Prices drop 50%? Buy your scheduled amount and consider increasing it.
✅ Prices recover? Your average cost is now well below the current price.

## DCA Variations

**Weekly DCA:** Buy every Monday regardless of price. Simple and effective.

**Dip DCA:** Only DCA when price drops by a set percentage (e.g., buy whenever BTC drops 5%+). Higher risk, potentially higher reward.

**Value Averaging:** Adjust your purchase amount so that your portfolio grows by a fixed amount each period. More complex but can outperform standard DCA.

## When DCA Is Best

DCA is best for long-term accumulation of high-conviction assets like BTC and ETH. It's not ideal for short-term trading or for assets you're not willing to hold for 2+ years.

## Combining DCA With Signals

At Blocknate, you can use our signals to time your DCA entries more precisely. When a LONG signal fires during your DCA schedule, consider increasing your purchase amount for that period.

## Common Mistakes

❌ DCA-ing into low-quality altcoins that may go to zero
❌ Stopping DCA during bear markets when prices are most attractive
❌ Using DCA as an excuse not to learn technical analysis
❌ DCA-ing with money you might need in the short term`,
  },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SIGNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const results: Array<{ title: string; action: string; error?: string }> = [];

  for (const article of ARTICLES) {
    // Try update first (if title already exists)
    const { data: existing } = await supabase
      .from("articles")
      .select("id")
      .eq("title", article.title)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("articles")
        .update({
          content: article.content,
          excerpt: article.excerpt,
          read_time: article.read_time,
          published: true,
        })
        .eq("id", existing.id);
      results.push({ title: article.title, action: "updated", error: error?.message });
    } else {
      const { error } = await supabase
        .from("articles")
        .insert(article);
      results.push({ title: article.title, action: "inserted", error: error?.message });
    }
  }

  const succeeded = results.filter((r) => !r.error).length;

  return NextResponse.json({
    success: true,
    total: ARTICLES.length,
    succeeded,
    results,
  });
}
