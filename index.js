
const searchInput = document.getElementById("item-search");
const dataList = document.getElementById("item-datalist");
const bestDealsList = document.getElementById("best-deals-list");

let items = [];

async function loadItems() {
    const response = await fetch("https://prices.runescape.wiki/api/v1/osrs/mapping");
    items = await response.json();
}

async function loadBestDeals() {
    try {
        //waits for the item list from loadItems before using it
        await itemsLoaded;

        //gets the last 24 hours and last hour of price and volume data
        const dayResponse = await fetch("https://prices.runescape.wiki/api/v1/osrs/24h");
        const hourResponse = await fetch("https://prices.runescape.wiki/api/v1/osrs/1h");
        const dayData = await dayResponse.json();
        const hourData = await hourResponse.json();

        const bestItems = [];

        //loops through all item data
        for (const item of items) {
            //stores data for item over 24 hours and last hour
            const daysTrading = dayData.data[item.id];
            const hoursTrading = hourData.data[item.id];

            //skips items with missing price data
            if (!daysTrading) continue;
            if (!hoursTrading) continue;
            if (!hoursTrading.avgHighPrice || !hoursTrading.avgLowPrice) continue;

            //calculate variables like tax (2%), margin (using last hour price), quantity, and potential profit
            const tax = Math.floor(hoursTrading.avgHighPrice * 0.02);
            const margin = hoursTrading.avgHighPrice - hoursTrading.avgLowPrice - tax;
            // trades at most buy limit or 5% of daily volume or what 10m gp can buy, whichever is smaller
            const quantity = Math.floor(Math.min(item.limit, daysTrading.lowPriceVolume * 0.05, daysTrading.highPriceVolume * 0.05, 10000000 / hoursTrading.avgLowPrice));
            const potentialProfit = margin * quantity;

            //skips items with no buy limit
            if (!item.limit) continue;
            //skips items with no profit
            if (margin <= 0) continue;
            //skips items under 500 trades per day
            if (daysTrading.lowPriceVolume < 500 || daysTrading.highPriceVolume < 500) continue;
            //skips items with an unrealistic ROI (>30%)
            if (margin / hoursTrading.avgLowPrice > 0.3) continue;
            //skips items with a sudden price drop
            if (hoursTrading.avgLowPrice < daysTrading.avgLowPrice * 0.95) continue;

            //pushes the surviving item to the list
            bestItems.push({ name: item.name, id: item.id, potentialProfit });
        }

        //sorts by potential profit and keeps the top 5 items
        const topDeals = bestItems.sort((a, b) => b.potentialProfit - a.potentialProfit).slice(0, 5);

        //clears the loading message and adds each deal to the panel
        bestDealsList.innerHTML = "";
        for (const deal of topDeals) {
            const li = document.createElement("li");
            li.className = "traded-item";

            const link = document.createElement("a");
            link.href = "individual_item/index.html?id=" + deal.id;

            const name = document.createElement("span");
            name.className = "traded-item-name";
            name.textContent = deal.name;

            const profit = document.createElement("span");
            profit.className = "traded-item-volume";
            profit.textContent = "+" + deal.potentialProfit.toLocaleString() + " gp";

            link.appendChild(name);
            li.appendChild(link);
            li.appendChild(profit);
            bestDealsList.appendChild(li);
        }
    }
    catch(error) {
        //shows an error message if the API fails to fetch
        bestDealsList.innerHTML = '<li class="traded-item">Unable to load deals</li>';
    }

}

searchInput.addEventListener("input", function() {
    dataList.innerHTML = "";
    const text = searchInput.value.toLowerCase().trim();

    // starts recommendations after 1 char
    if (text.length < 1) return;

    // filters by startin text
    const matches = items.filter(item =>
        item.name.toLowerCase().startsWith(text)
    );
    // then filters by mathching text anywhere in the name
    const otherMatches = items.filter(item =>
        !item.name.toLowerCase().startsWith(text) &&
        item.name.toLowerCase().includes(text)
    );

    // gets at most 10 matches and adds them to the datalist
    matches.concat(otherMatches).slice(0, 10).forEach(item => {
        const option = document.createElement("option");
        option.value = item.name;
        dataList.appendChild(option);
    });
});

searchInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        const item = items.find(item =>
            item.name.toLowerCase() === searchInput.value.trim().toLowerCase()
        );

        if (item) {
            window.location.href = "individual_item/?id=" + item.id;
        }
    }
});

// Clears the search on refresh
searchInput.value = "";

//loads the item list, then the best deals once it's ready
const itemsLoaded = loadItems();
loadBestDeals();


