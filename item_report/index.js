const API_BASE = "https://prices.runescape.wiki/api";
const ICON_BASE = "https://oldschool.runescape.wiki/images/";

const itemIcon = document.getElementById("item-icon");
const itemName = document.getElementById("item-name");
const itemReport = document.getElementById("item-report");

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
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id || !/^\d+$/.test(id)) {
        showError("No item selected");
        return;
    }

    try {
        const items = await fetchJson(API_BASE + "/v1/osrs/mapping");

        const item = items.find(item => item.id === Number(id));
        if (!item) {
            showError("Item not found");
            return;
        }

        itemName.textContent = item.name;
        document.title = item.name;

        if (item.icon) {
            itemIcon.src = ICON_BASE + encodeURIComponent(item.icon.replace(/ /g, "_"));
            itemIcon.alt = item.name;
            itemIcon.hidden = false;
        }

        generateReport(item);
    }
    catch (error) {
        console.error(error);
        showError("Unable to load item");
    }
}

function generateReport(item) {
    if (!itemReport) return;
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    itemReport.innerHTML = `
        <h2 style="text-align: center;">Report for ${itemName.textContent}</h2>
        <p>Note: This is a placeholder report. Actual data and analysis will be included in future updates.</p>
        <p>Report generated on: <strong>${formattedDate}</strong></p>
    `;
}

loadItem();
