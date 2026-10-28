const searchInput = document.getElementById("item-search");
const dataList = document.getElementById("item-datalist");
const itemList = document.getElementById("item-list");


searchInput.value = "";

const ITEMS_PER_PAGE = 10;
const MAX_SUGGESTIONS = 10;
const ICON_BASE = "https://oldschool.runescape.wiki/images/";

let items = [];


async function fetchItems()
{
    const response = await fetch("https://prices.runescape.wiki/api/v1/osrs/mapping");

    if (!response.ok)
    {
        throw new Error("Failed to retrieve items from the api");
    }

    return response.json();
}

const itemsLoaded = fetchItems();

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



function updateSuggestions()
{
    dataList.replaceChildren();
    const text = searchInput.value.trim().toLowerCase();

    
    if (text.length < 1)
    {
        return;
    }

    const matches = items.filter(function(item)
    {
        return item.name.toLowerCase().startsWith(text);
    }).sort(byName);

    const otherMatches = items.filter(function(item)
    {
        const name = item.name.toLowerCase();
        return !name.startsWith(text) && name.includes(text);
    }).sort(byName);

    matches.concat(otherMatches).slice(0, MAX_SUGGESTIONS).forEach(function(item)
    {
        const option = document.createElement("option");
        option.value = item.name;
        dataList.appendChild(option);
    });
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

    const text = document.createElement("div");
    text.className = "item-card-text";
    text.append(name, description);
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
        items = await itemsLoaded;
        const cards = items.slice(0, ITEMS_PER_PAGE).map(createItemCard);

        if (cards.length === 0)
        {
            showListMessage("No items found");
            return;
        }

        itemList.replaceChildren(...cards);
    }
    catch (error)
    {
        console.error(error);
        showListMessage("Unable to load items");
    }
}

loadItems();


searchInput.addEventListener("input", updateSuggestions);

searchInput.addEventListener("keydown", function(event)
{
    if (event.key === "Enter")
    {
        searchItem();
    }
});
