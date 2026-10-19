const searchInput = document.getElementById("item-search");
// clears the search on refresh
searchInput.value = "";

async function searchItem() {
    const searchName = searchInput.value.trim();

    if (searchName === "")
    {
        return;
    }

    try 
    {
        const response = await fetch("https://prices.runescape.wiki/api/v1/osrs/mapping");

        if (!response.ok) 
        {
            throw new Error("Failed to retrieve items from the api");
        }

        const items = await response.json();

        const item = items.find(function(item) 
        {
            return item.name.toLowerCase() === searchName.toLowerCase();
        });

        if (item) 
        {
            window.location.href = "../individual_item/?id=" + item.id;
        } 
    } 
    catch (error) 
    {
        console.error(error);
        alert("Error Searching for Items");
    }
}

//does the action of searchItem on enter press
searchInput.addEventListener("keydown", function(event) 
{
    if (event.key === "Enter") 
    {
        searchItem();
    }
});