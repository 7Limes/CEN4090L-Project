
const searchInput = document.getElementById("item-search");
const dataList = document.getElementById("item-datalist");

let items = [];

async function loadItems() {
    const response = await fetch("https://prices.runescape.wiki/api/v1/osrs/mapping");
    items = await response.json();
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
loadItems();


