const searchInput = document.getElementById("item-search");
const itemList = document.getElementById("item-list");
const sortSelect = document.getElementById("sort-select");
const sortDirectionButton = document.getElementById("sort-direction");


searchInput.value = "";

const API_BASE = "https://prices.runescape.wiki/api/v1/osrs";
const ITEMS_PER_PAGE = 10;
const MAX_SUGGESTIONS = 10;
const ICON_BASE = "https://oldschool.runescape.wiki/images/";

let items = [];

// Items in the current sort order. Pagination (#69) should slice this list.
let sortedItems = [];

// true = highest first, false = lowest first
let sortDescending = true;

// set once the item list and its price/volume data have loaded
let itemsReady = false;


async function fetchJson(url)
{
    const response = await fetch(url);

    if (!response.ok)
    {
        throw new Error("Request failed: " + url);
    }

    return response.json();
}

async function fetchItems()
{
    return fetchJson(API_BASE + "/mapping");
}

const itemsLoaded = fetchItems();

// Latest prices and 24h volumes for every item. These are only needed for sorting,
// so if either request fails the page still lists items instead of erroring out.
const pricesLoaded = fetchJson(API_BASE + "/latest").catch(function(error)
{
    console.error(error);
    return { data: {} };
});

const volumesLoaded = fetchJson(API_BASE + "/24h").catch(function(error)
{
    console.error(error);
    return { data: {} };
});

function searchItem()
{
    const searchName = searchInput.value.trim().toLowerCase();

    if (searchName === "")
    {
        return;
    }

    const item = items.find(function(item)
    {
        return item.name.toLowerCase() === searchName;
    });

    if (item)
    {
        window.location.href = "../individual_item/index.html?id=" + item.id;
    }
}



function byName(a, b)
{
    return a.name.localeCompare(b.name);
}

// formats a number with commas, or a dash if it's missing
function formatNumber(value)
{
    if (value === null || value === undefined)
    {
        return "-";
    }

    return value.toLocaleString();
}

// formats a number as gp, or a dash if it's missing
function formatGp(value)
{
    if (value === null || value === undefined)
    {
        return "-";
    }

    return value.toLocaleString() + " gp";
}


/**
 * Compares two items by the selected sort field and direction.
 * Items missing that value (untraded, no alch value) always go to the end,
 * whichever direction is selected. Ties are broken by name.
 */
function compareItems(a, b, field, descending)
{
    const aValue = a[field];
    const bValue = b[field];
    const aMissing = aValue === null || aValue === undefined;
    const bMissing = bValue === null || bValue === undefined;

    if (aMissing || bMissing)
    {
        if (aMissing && bMissing)
        {
            return byName(a, b);
        }

        return aMissing ? 1 : -1;
    }

    if (aValue === bValue)
    {
        return byName(a, b);
    }

    return descending ? bValue - aValue : aValue - bValue;
}

// filters the items by the search, so if a is typed it only shows items with a
function filterItems()
{
    const searchText = searchInput.value.trim().toLowerCase();

    const filteredItems = items.filter(function(item)
    {
        return item.name.toLowerCase().startsWith(searchText);
    });

    const field = sortSelect.value;

    sortedItems = filteredItems.sort(function(a, b)
    {
        return compareItems(a, b, field, sortDescending);
    });

    renderItems();
}


// Re-sorts every item using the current dropdown and direction, then redraws the list
function applySort()
{
    // the list is still loading; loadItems() sorts with the current settings once it's ready
    if (!itemsReady)
    {
        return;
    }

    const searchText = searchInput.value.trim().toLowerCase();

    sortedItems = items.filter(function(item)
    {
        return item.name.toLowerCase().startsWith(searchText);
    });

    sortedItems.sort(function(a, b)
    {
        return compareItems(a, b, sortSelect.value, sortDescending);
    });

    renderItems();
}

// Shows the first page of the sorted list
function renderItems()
{
    const cards = sortedItems.slice(0, ITEMS_PER_PAGE).map(createItemCard);

    if (cards.length === 0)
    {
        showListMessage("No items found");
        return;
    }

    itemList.replaceChildren(...cards);
}

// Keeps the direction button's text in sync with sortDescending
function updateSortDirectionButton()
{
    sortDirectionButton.textContent = sortDescending ? "High to Low" : "Low to High";
    sortDirectionButton.setAttribute("aria-label",
        "Sort direction: " + (sortDescending ? "descending" : "ascending") + ". Click to reverse.");
}


function createItemCard(item)
{
    const card = document.createElement("a");
    card.className = "item-card";
    card.href = "../individual_item/index.html?id=" + item.id;

    const name = document.createElement("h3");
    name.textContent = item.name;

    const description = document.createElement("p");
    description.textContent = item.examine || "-";

    // shows the values the list can be sorted by, so the order is visible
    const stats = document.createElement("p");
    stats.className = "item-card-stats";
    stats.textContent = "Price: " + formatGp(item.price)
        + "  |  Daily volume: " + formatNumber(item.volume)
        + "  |  High alch: " + formatGp(item.highalch);

    const text = document.createElement("div");
    text.className = "item-card-text";
    text.append(name, description, stats);
    card.append(text);


    if (item.icon)
    {
        const icon = document.createElement("img");
        icon.className = "item-card-icon";
        icon.src = ICON_BASE + encodeURIComponent(item.icon.replace(/ /g, "_"));
        icon.alt = item.name;
        card.append(icon);
    }

    return card;
}

//  4 errors
function showListMessage(message)
{
    const card = document.createElement("div");
    card.className = "item-card";

    const text = document.createElement("p");
    text.textContent = message;

    card.append(text);
    itemList.replaceChildren(card);
}


async function loadItems()
{
    try
    {
        const [mapping, prices, volumes] = await Promise.all([itemsLoaded, pricesLoaded, volumesLoaded]);

        // attaches each item's current price and daily volume so they can be sorted on
        items = mapping.map(function(item)
        {
            const latest = prices.data[item.id];
            const daysTrading = volumes.data[item.id];

            // price is the instant-buy price, falling back to instant-sell if nobody has bought recently
            let price = null;
            if (latest)
            {
                price = latest.high ?? latest.low ?? null;
            }

            // daily volume is buys and sells over the last 24 hours combined (same as the item page)
            let volume = null;
            if (daysTrading)
            {
                volume = (daysTrading.highPriceVolume || 0) + (daysTrading.lowPriceVolume || 0);
            }

            return { ...item, price: price, volume: volume };
        });

        itemsReady = true;
        applySort();
    }
    catch (error)
    {
        console.error(error);
        showListMessage("Unable to load items");
    }
}

updateSortDirectionButton();
loadItems();

searchInput.addEventListener("input", filterItems);

sortSelect.addEventListener("change", applySort);

sortDirectionButton.addEventListener("click", function()
{
    sortDescending = !sortDescending;
    updateSortDirectionButton();
    applySort();
});

searchInput.addEventListener("keydown", function(event)
{
    if (event.key === "Enter")
    {
        searchItem();
    }
});
