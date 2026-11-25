import { geTax } from "../components/geTax.js";

const API_BASE = "https://prices.runescape.wiki/api";
const ICON_BASE = "https://oldschool.runescape.wiki/images/";

const itemIcon = document.getElementById("item-icon");
const itemName = document.getElementById("item-name");
const buyPrice = document.getElementById("item-buy-price");
const sellPrice = document.getElementById("item-sell-price");
const marginValue = document.getElementById("item-margin");
const volumeValue = document.getElementById("item-volume");
const limitValue = document.getElementById("item-limit");
const description = document.getElementById("item-description");
const highAlch = document.getElementById("item-high-alch");
const lowAlch = document.getElementById("item-low-alch");
const reportButton = document.getElementById("report-button");

// formats a number as gp, or a dash if it's missing
function formatGp(value) {
    if (value === null || value === undefined) return "-";
    return value.toLocaleString() + " gp";
}

// shows an error in place of the item name
function showError(message) {
    itemName.textContent = message;
    document.title = message;
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Request failed: " + url);
    }
    return response.json();
}

async function loadItem() {
    // gets the item id from the ?id= query parameter
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id || !/^\d+$/.test(id)) {
        showError("No item selected");
        return;
    }

    try {
        // latest prices for this item, plus the item list and daily volumes
        const [latestData, items, dayData] = await Promise.all([
            fetchJson(API_BASE + "/v2/osrs/latest?id=" + id),
            fetchJson(API_BASE + "/v1/osrs/mapping"),  // grabs all items, but probably fine because of browser cache
            fetchJson(API_BASE + "/v1/osrs/24h"),
        ]);

        const item = items.find(item => item.id === Number(id));
        if (!item) {
            showError("Item not found");
            return;
        }

        const latest = latestData.data[id] || {};
        const daysTrading = dayData.data[id];

        // header
        itemName.textContent = item.name;
        document.title = item.name;
        if (item.icon) {
            itemIcon.src = ICON_BASE + encodeURIComponent(item.icon.replace(/ /g, "_"));
            itemIcon.alt = item.name;
            itemIcon.hidden = false;
        }

        // instant buy (high) and instant sell (low) prices
        buyPrice.textContent = formatGp(latest.high);
        sellPrice.textContent = formatGp(latest.low);

        // margin after the 2% GE tax on the sell side, capped at 5m
        if (latest.high && latest.low) {
            const tax = geTax(latest.high);
            const margin = latest.high - latest.low - tax;
            marginValue.textContent = (margin >= 0 ? "+" : "") + formatGp(margin);
            marginValue.classList.toggle("negative", margin < 0);
        }

        // daily volume is buys and sells over the last 24 hours combined
        if (daysTrading) {
            volumeValue.textContent = (daysTrading.highPriceVolume + daysTrading.lowPriceVolume).toLocaleString();
        }

        limitValue.textContent = item.limit ? item.limit.toLocaleString() : "-";
        description.textContent = item.examine || "-";
        highAlch.textContent = "High alch: " + formatGp(item.highalch);
        lowAlch.textContent = "Low alch: " + formatGp(item.lowalch);

        // passes the id along to the report page
        reportButton.href = "../item_report/index.html?id=" + id;
    }
    catch (error) {
        console.error(error);
        showError("Unable to load item");
    }
}

reportButton.addEventListener("click", function(event) {
    event.preventDefault();

    //Removes the old session storage
    sessionStorage.removeItem("sentReport");

    // reads the budget and time window from the report settings
    const budget = document.getElementById("report-budget").valueAsNumber;
    const timeWindow = document.getElementById("report-window").value;

    // creates a settings object matching the backtest contract
    const settings = {
        itemId: Number(new URLSearchParams(window.location.search).get("id")),
        budget: budget,
        window: timeWindow,
        buy: [],
        sell: []
    };

    // collects the buy and sell conditions
    document.querySelectorAll(".condition-group").forEach(group => {
        const groupName = group.dataset.group;

        group.querySelectorAll(".condition").forEach((row, index) => {
            const condition = {
                metric: row.querySelector('[data-field="metric"]').value,
                operator: row.querySelector('[data-field="operator"]').value,
                threshold: row.querySelector('[data-field="threshold"]').valueAsNumber
            };

            // first condition doesnt have a join
            if (index > 0) {
                condition.join = row.querySelector(
                    ".condition-join input:checked"
                )?.value;
            }

            settings[groupName].push(condition);
        });
    });

    // validates settings using the backtest contract
    const errors = Backtest.validateSettings(settings);

    if (errors.length > 0) {
        alert(errors.join("\n"));
        return;
    }

    // sends the settings to the report page
    try {
        sessionStorage.setItem("sentReport", JSON.stringify(settings));
        window.location.href = reportButton.href;
    }
    catch (error) {
        console.error(error);
        alert("Unable to save report settings.");
    }
});

loadItem();
