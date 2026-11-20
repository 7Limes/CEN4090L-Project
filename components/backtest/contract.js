/**
 * Backtest data contract (issue #113).
 *
 * This file defines the two objects every part of the backtester agrees on:
 *
 *   BacktestSettings  what the user asked for (built on the item page)
 *   BacktestResult    what the engine gives back (shown on the report page)
 *
 * It also holds the allowed values (time windows, metrics, operators) and
 * validateSettings(), so every page checks settings the same way.
 *
 * Everything is attached to one global object, Backtest, so nothing here can
 * clash with the variables the pages already declare. Load it with a plain
 * <script> tag, before engine.js:
 *
 *     <script src="../components/backtest/contract.js"></script>
 *     <script src="../components/backtest/engine.js"></script>
 *
 * It is a classic script (no type="module"), so the site keeps working when
 * it is opened straight from disk (file://). The same file can be loaded in
 * Node with require(), so it can be unit tested without a browser.
 */

/**
 * One row of the Buy Conditions or Sell Conditions list.
 *
 * @typedef {Object} BacktestCondition
 * @property {"price"|"price_change"|"volume"|"margin"} metric
 *     What is measured. Matches the Metric dropdown in Report Settings.
 * @property {"gt"|"lt"|"gte"|"lte"} operator
 *     How the metric is compared with the threshold.
 * @property {number} threshold
 *     The number to compare against (gp, %, or items, depending on the metric).
 * @property {"and"|"or"} [join]
 *     How this row combines with the row above it. Required on every row
 *     except the first, where it is ignored.
 */

/**
 * Everything the user chose in Report Settings, for one item.
 *
 * @typedef {Object} BacktestSettings
 * @property {number} itemId  OSRS item id (same id as the ?id= query parameter).
 * @property {number} budget  Starting money in gp. A whole number above 0.
 * @property {"7d"|"1m"|"6m"|"1y"} window  How far back to test.
 * @property {BacktestCondition[]} buy   When to buy. At least one condition.
 * @property {BacktestCondition[]} sell  When to sell. At least one condition.
 */

/**
 * One point of price history.
 *
 * @typedef {Object} SeriesPoint
 * @property {number} time
 *     Start of the step, in Unix SECONDS (the unit the prices API uses).
 *     Use new Date(time * 1000) to get a Date.
 * @property {number|null} buyPrice
 *     Average instant-buy price in the step (the API's avgHighPrice), in gp.
 *     null when nothing was bought in that step.
 * @property {number|null} sellPrice
 *     Average instant-sell price in the step (the API's avgLowPrice), in gp.
 *     null when nothing was sold in that step.
 * @property {number} volume  Items traded in the step (buys + sells).
 */

/**
 * One simulated trade.
 *
 * @typedef {Object} Trade
 * @property {number} time      Unix seconds. Always equal to the time of a SeriesPoint.
 * @property {"buy"|"sell"} side
 * @property {number} quantity  Items traded. A whole number above 0.
 * @property {number} price     Price per item, in gp.
 * @property {number} tax       Total GE tax paid on this trade, in gp. Always 0 for a buy.
 * @property {number} cashAfter Money left right after the trade, in gp.
 */

/**
 * The headline numbers of a backtest.
 *
 * @typedef {Object} BacktestSummary
 * @property {number} startingBudget  The budget from the settings, in gp.
 * @property {number} endingValue     Cash at the end plus unrealizedValue, in gp.
 * @property {number} netProfit       endingValue - startingBudget, in gp. Negative for a loss.
 * @property {number} returnPercent   netProfit as a percentage of startingBudget. Not rounded.
 * @property {number} completedTrades Number of buys that were later sold (round trips).
 * @property {number} winningTrades   Completed trades that made money after tax.
 * @property {number} winRate         winningTrades as a percentage of completedTrades. 0 when there are none.
 * @property {number} totalTax        All GE tax paid, in gp.
 * @property {number} buyAndHoldProfit
 *     Profit in gp from simply buying at the first step and selling at the
 *     last one with the same budget. The baseline a strategy should beat.
 * @property {number} buyAndHoldReturnPercent  buyAndHoldProfit as a percentage of startingBudget.
 * @property {number} openQuantity    Items still held at the end. 0 when everything was sold.
 * @property {number} unrealizedValue What the items still held are worth after tax, in gp. 0 when none.
 * @property {boolean} noTrades       true when the strategy never traded. A valid result, not an error.
 */

/**
 * Everything the report page needs to show a backtest.
 *
 * @typedef {Object} BacktestResult
 * @property {boolean} isSample
 *     true while the engine is the stub from issue #113 and the numbers are
 *     made up. The real engine returns false.
 * @property {BacktestSettings} settings
 *     A copy of the settings that produced this result, so a saved report can
 *     show them and be run again.
 * @property {"1h"|"6h"|"24h"} timestep  Length of one step in the series.
 * @property {SeriesPoint[]} series  Price history, oldest step first.
 * @property {Trade[]} trades        Simulated trades, oldest first. Empty when noTrades is true.
 * @property {BacktestSummary} summary
 */

(function (root) {
    "use strict";

    // In the browser everything hangs off the single global, Backtest.
    // In Node (e.g. unit tests) nothing global is touched; the object is exported instead.
    const isNode = typeof module === "object" && module !== null && typeof module.exports === "object";
    const Backtest = isNode ? {} : (root.Backtest = root.Backtest || {});

    /**
     * The time windows offered in Report Settings, and the price history each
     * one uses. The prices API returns a limited number of points per request,
     * so longer windows use longer steps.
     *
     *   timestep     value for the API's ?timestep= parameter
     *   stepSeconds  length of one step, in seconds
     *   steps        number of steps that cover the window
     */
    const WINDOWS = Object.freeze({
        "7d": Object.freeze({ label: "Last 7 days",   timestep: "1h",  stepSeconds: 3600,  steps: 168 }),
        "1m": Object.freeze({ label: "Last month",    timestep: "6h",  stepSeconds: 21600, steps: 120 }),
        "6m": Object.freeze({ label: "Last 6 months", timestep: "24h", stepSeconds: 86400, steps: 180 }),
        "1y": Object.freeze({ label: "Last year",     timestep: "24h", stepSeconds: 86400, steps: 365 }),
    });

    // allowed values, matching the dropdowns in individual_item/index.html
    const METRICS = Object.freeze(["price", "price_change", "volume", "margin"]);
    const OPERATORS = Object.freeze(["gt", "lt", "gte", "lte"]);
    const JOINS = Object.freeze(["and", "or"]);

    // a price or a volume can't be below zero, so neither can their thresholds
    const NON_NEGATIVE_METRICS = Object.freeze(["price", "volume"]);

    function isObject(value) {
        return typeof value === "object" && value !== null && !Array.isArray(value);
    }

    function isWholeNumber(value) {
        return typeof value === "number" && Number.isInteger(value);
    }

    // checks one condition list; groupLabel is "Buy" or "Sell"
    function validateConditions(conditions, groupLabel, errors) {
        if (!Array.isArray(conditions) || conditions.length === 0) {
            errors.push(groupLabel + " conditions: add at least one condition.");
            return;
        }

        conditions.forEach(function (condition, index) {
            const rowLabel = groupLabel + " condition " + (index + 1) + ": ";

            if (!isObject(condition)) {
                errors.push(rowLabel + "must be an object.");
                return;
            }

            if (!METRICS.includes(condition.metric)) {
                errors.push(rowLabel + "choose a metric.");
            }

            if (!OPERATORS.includes(condition.operator)) {
                errors.push(rowLabel + "choose an operator.");
            }

            if (typeof condition.threshold !== "number" || !Number.isFinite(condition.threshold)) {
                errors.push(rowLabel + "enter a number for the threshold.");
            }
            else if (NON_NEGATIVE_METRICS.includes(condition.metric) && condition.threshold < 0) {
                errors.push(rowLabel + "the threshold can't be negative for this metric.");
            }

            // the first row has nothing above it to join with
            if (index > 0 && !JOINS.includes(condition.join)) {
                errors.push(rowLabel + "choose AND or OR.");
            }
        });
    }

    /**
     * Checks a settings object against the contract.
     *
     * Values must already be the right type: numbers must be real numbers,
     * not text from an input or a URL, so convert them with Number() first.
     *
     * @param {BacktestSettings} settings
     * @returns {string[]} One readable message per problem. Empty when the settings are valid.
     */
    function validateSettings(settings) {
        const errors = [];

        if (!isObject(settings)) {
            return ["Settings must be an object."];
        }

        if (!isWholeNumber(settings.itemId) || settings.itemId <= 0) {
            errors.push("Item: itemId must be a whole number above 0.");
        }

        if (!isWholeNumber(settings.budget) || settings.budget <= 0) {
            errors.push("Budget: enter a whole number of gp above 0.");
        }

        if (typeof settings.window !== "string" || !Object.prototype.hasOwnProperty.call(WINDOWS, settings.window)) {
            errors.push("Time window: choose one of " + Object.keys(WINDOWS).join(", ") + ".");
        }

        validateConditions(settings.buy, "Buy", errors);
        validateConditions(settings.sell, "Sell", errors);

        return errors;
    }

    Backtest.WINDOWS = WINDOWS;
    Backtest.METRICS = METRICS;
    Backtest.OPERATORS = OPERATORS;
    Backtest.JOINS = JOINS;
    Backtest.validateSettings = validateSettings;

    if (isNode) {
        module.exports = Backtest;
    }
})(typeof globalThis !== "undefined" ? globalThis : this);
