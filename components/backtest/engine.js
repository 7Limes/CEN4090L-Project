/**
 * Backtest engine entry point (issue #113).
 *
 * Pages call ONE function to run a backtest:
 *
 *     const result = await Backtest.runBacktest(settings);
 *
 * settings and result are described in contract.js (BacktestSettings and
 * BacktestResult). Load contract.js before this file:
 *
 *     <script src="../components/backtest/contract.js"></script>
 *     <script src="../components/backtest/engine.js"></script>
 *
 * STUB: for now runBacktest() does not read price history or evaluate the
 * buy and sell conditions. It returns made-up sample data in the final
 * shape, with isSample set to true, so the report page, the chart and saved
 * reports can be built before the real engine exists. The real engine
 * replaces the body of runBacktest() and deletes the "Sample data" section
 * below. The function name, its argument and the shape of what it returns
 * stay the same, so pages written against the stub keep working.
 *
 * What the sample does respond to:
 *   - settings.window  the series has the right number of steps and step length
 *   - settings.budget  trade sizes and the summary scale with it. A budget
 *                      under 1,000 gp can't afford one item, which gives the
 *                      "no trades" result (summary.noTrades === true).
 */
(function (root) {
    "use strict";

    // In the browser, contract.js has already created the global Backtest.
    // In Node (e.g. unit tests), load the contract with require() instead.
    const isNode = typeof module === "object" && module !== null && typeof module.exports === "object";
    const Backtest = isNode ? require("./contract.js") : root.Backtest;

    if (!Backtest || typeof Backtest.validateSettings !== "function") {
        throw new Error("engine.js: load components/backtest/contract.js before this file.");
    }

    // ------------------------------------------------------------------
    // Sample data (temporary: removed when the real engine is added)
    // ------------------------------------------------------------------

    // The sample history always ends at this moment (2026-11-16 00:00 UTC, in
    // Unix seconds), so the stub returns exactly the same data every time.
    const SAMPLE_END_TIME = 1794787200;

    // Shape of the sample price line: [position in the window (0 to 1000), price in gp].
    // It dips, climbs to a peak, then slides, so the sample has one winning
    // trade and one losing trade.
    const SAMPLE_PRICE_POINTS = [
        [0, 1200],
        [100, 1000],
        [350, 1300],
        [600, 1250],
        [850, 1100],
        [1000, 1180],
    ];

    // Where the sample buys and sells, as a fraction of the window: [buy, sell]
    const SAMPLE_ROUND_TRIPS = [
        [0.10, 0.35],   // buys the dip, sells the peak: a win
        [0.60, 0.85],   // buys high, sells lower: a loss
    ];

    // GE tax per item for the sample: 2% of the sell price, rounded down,
    // capped at 5m. Dividing by 50 is the same as 2% but stays exact for
    // whole numbers. Issue #109 adds the shared tax function the real engine uses.
    function sampleTaxPerItem(sellPrice) {
        return Math.min(Math.floor(sellPrice / 50), 5000000);
    }

    // price on the sample line at a position from 0 to 1000
    function samplePriceAt(position) {
        for (let i = 1; i < SAMPLE_PRICE_POINTS.length; i++) {
            const [startPosition, startPrice] = SAMPLE_PRICE_POINTS[i - 1];
            const [endPosition, endPrice] = SAMPLE_PRICE_POINTS[i];

            if (position <= endPosition) {
                const progress = (position - startPosition) / (endPosition - startPosition);
                return Math.round(startPrice + (endPrice - startPrice) * progress);
            }
        }

        return SAMPLE_PRICE_POINTS[SAMPLE_PRICE_POINTS.length - 1][1];
    }

    /**
     * Builds made-up price history covering a time window.
     * @param {string} windowKey  A key of Backtest.WINDOWS, e.g. "1m".
     * @returns {SeriesPoint[]} Oldest step first.
     */
    function buildSampleSeries(windowKey) {
        const { stepSeconds, steps } = Backtest.WINDOWS[windowKey];
        const lastIndex = steps - 1;
        const stepHours = stepSeconds / 3600;

        // One step in the middle has no prices, the way a real item has steps
        // where nothing was traded. Pages must cope with null prices.
        const quietIndex = Math.floor(steps / 2);

        const series = [];
        for (let index = 0; index < steps; index++) {
            const time = SAMPLE_END_TIME - (lastIndex - index) * stepSeconds;

            if (index === quietIndex) {
                series.push({ time: time, buyPrice: null, sellPrice: null, volume: 0 });
                continue;
            }

            // a small repeating wobble so the line isn't perfectly straight
            const wobble = (index * 7) % 11 - 5;
            const buyPrice = samplePriceAt(index * 1000 / lastIndex) + wobble;
            // people sell instantly for a little less than they buy instantly
            const sellPrice = buyPrice - (10 + index % 5);
            const volume = stepHours * (4000 + (index * 37) % 900);

            series.push({ time: time, buyPrice: buyPrice, sellPrice: sellPrice, volume: volume });
        }

        return series;
    }

    /**
     * Builds the sample trades and summary for a series and a budget.
     * @param {SeriesPoint[]} series
     * @param {number} budget
     * @returns {{trades: Trade[], summary: BacktestSummary}}
     */
    function buildSampleTrades(series, budget) {
        const lastIndex = series.length - 1;
        const trades = [];

        let cash = budget;
        let completedTrades = 0;
        let winningTrades = 0;
        let totalTax = 0;

        for (const [buyAt, sellAt] of SAMPLE_ROUND_TRIPS) {
            const buyPoint = series[Math.round(lastIndex * buyAt)];
            const sellPoint = series[Math.round(lastIndex * sellAt)];

            // buys as many as the money allows; skips the trade if that's none
            const quantity = Math.floor(cash / buyPoint.buyPrice);
            if (quantity < 1) continue;

            const cost = quantity * buyPoint.buyPrice;
            cash -= cost;
            trades.push({
                time: buyPoint.time, side: "buy", quantity: quantity,
                price: buyPoint.buyPrice, tax: 0, cashAfter: cash,
            });

            const tax = quantity * sampleTaxPerItem(sellPoint.sellPrice);
            const proceeds = quantity * sellPoint.sellPrice - tax;
            cash += proceeds;
            totalTax += tax;
            trades.push({
                time: sellPoint.time, side: "sell", quantity: quantity,
                price: sellPoint.sellPrice, tax: tax, cashAfter: cash,
            });

            completedTrades++;
            if (proceeds > cost) winningTrades++;
        }

        // baseline: buy at the first step and sell at the last one, same budget
        const firstPoint = series[0];
        const lastPoint = series[lastIndex];
        const holdQuantity = Math.floor(budget / firstPoint.buyPrice);
        const buyAndHoldProfit = holdQuantity * (lastPoint.sellPrice - sampleTaxPerItem(lastPoint.sellPrice))
            - holdQuantity * firstPoint.buyPrice;

        // the sample always sells everything, so nothing is left unsold at the end
        const openQuantity = 0;
        const unrealizedValue = 0;
        const endingValue = cash + unrealizedValue;
        const netProfit = endingValue - budget;

        return {
            trades: trades,
            summary: {
                startingBudget: budget,
                endingValue: endingValue,
                netProfit: netProfit,
                returnPercent: netProfit / budget * 100,
                completedTrades: completedTrades,
                winningTrades: winningTrades,
                winRate: completedTrades === 0 ? 0 : winningTrades / completedTrades * 100,
                totalTax: totalTax,
                buyAndHoldProfit: buyAndHoldProfit,
                buyAndHoldReturnPercent: buyAndHoldProfit / budget * 100,
                openQuantity: openQuantity,
                unrealizedValue: unrealizedValue,
                noTrades: trades.length === 0,
            },
        };
    }

    // ------------------------------------------------------------------
    // Public entry point (stays when the real engine is added)
    // ------------------------------------------------------------------

    /**
     * Runs a backtest.
     *
     * Returns a Promise because the real engine has to download price history
     * first. Use it with await, or with .then():
     *
     *     try {
     *         const result = await Backtest.runBacktest(settings);
     *     }
     *     catch (error) {
     *         // error.message is readable; for bad settings,
     *         // error.validationErrors lists each problem separately
     *     }
     *
     * @param {BacktestSettings} settings
     * @returns {Promise<BacktestResult>}
     *     Rejects with an Error when the settings don't pass Backtest.validateSettings().
     */
    async function runBacktest(settings) {
        const validationErrors = Backtest.validateSettings(settings);
        if (validationErrors.length > 0) {
            const error = new Error("Invalid backtest settings. " + validationErrors.join(" "));
            error.validationErrors = validationErrors;
            throw error;
        }

        // an independent copy, so changing the settings later can't change a result
        const settingsCopy = JSON.parse(JSON.stringify(settings));

        const series = buildSampleSeries(settingsCopy.window);
        const { trades, summary } = buildSampleTrades(series, settingsCopy.budget);

        return {
            isSample: true,
            settings: settingsCopy,
            timestep: Backtest.WINDOWS[settingsCopy.window].timestep,
            series: series,
            trades: trades,
            summary: summary,
        };
    }

    Backtest.runBacktest = runBacktest;

    if (isNode) {
        module.exports = Backtest;
    }
})(typeof globalThis !== "undefined" ? globalThis : this);
