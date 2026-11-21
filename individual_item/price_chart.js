//grabs the canvas the chart draws on
const chartCanvas = document.getElementById("price-chart");

//tests chart with fake values
new Chart(chartCanvas,
{
    type: "line",
    data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        datasets: [{
            label: "Price",
            data: [100, 120, 90, 130, 110]
        }]    
    }
});