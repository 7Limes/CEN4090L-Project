//grabs the canvas the chart draws on
const chartCanvas = document.getElementById("price-chart")

//chart styling: padding, grid colors, fonts, and yellow color for line/points
const options = {
    animation: true,
    maintainAspectRatio: false,
    layout: {
        padding: { left: 15, right: 30, top: 5, bottom: 15}
    },
    scales: {
            x: {
                grid: {
                    color: 'rgba(172, 169, 169, 0.42)'
                },
                ticks: {
                    color: 'white',
                    font: {
                        family: '"Runescape Chat Font Regular", sans-serif',
                        size: 15
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(172, 169, 169, 0.42)'
                },
                ticks: {
                    color: 'white',
                    font: {
                        family: '"Runescape Chat Font Regular", sans-serif',
                        size: 15
                    }
                }
            }
    },
    plugins: {
        tooltip: {
            intersect: false
        },
        legend: {
            labels:
            {
                font: {
                    family: '"Runescape Chat Font Regular", sans-serif',
                    size: 15
                },
                color: 'white'
            },
            onClick: () => {}
        }
    },
    elements: {
        point: {
            borderWidth: 3,
            backgroundColor: 'yellow',
            borderColor: 'yellow'
        },
        line: {
            borderWidth: 3,
            backgroundColor: 'yellow',
            borderColor: 'yellow'
        }
    }
}

//starts with no points, loadPrices then fills them in once prices load
//spanGaps connects the line across hours with no buy data
const data = {
    datasets: [{
        data: [],
        label: 'Average buy price (gp)',
        spanGaps: true
    }]
}

//creates an empty chart so it shows immediately
const priceChart = new Chart(chartCanvas,
{
    type: 'line',
    data,
    options
});

//keeps decimals for cheap items so small price changes still show on graph
//more expensive items round to a whole gp to be easily readable
function cleanPrice(price) {
    if (price === null)
        return null
    if (price < 100)
        return price
    return Math.round(price)
}

//loads the last 24 hours of buy prices and draws them on chart
async function loadPrices() {
    try {
        //retrieves item id from page URL
        const ITEM_ID = new URLSearchParams(window.location.search).get("id")

        //uses 7d because it's the only lookback with hourly points
        const priceResponse = await fetch("https://prices.runescape.wiki/api/v2/osrs/timeseries?id=" + ITEM_ID + "&lookback=7d")
        const priceData = await priceResponse.json()

        //keeps only the last 24 hours of data (timestamps are in seconds, Date.now() is in ms)
        const oneDayAgo = Date.now() / 1000 - 24 * 60 * 60
        const last24h = priceData.data.filter(point => point.timestamp >= oneDayAgo)

        //turns each hour into a chart point with a day and hour label
        const chartPoints = last24h.map(point => 
            ({x: new Date(point.timestamp * 1000).toLocaleTimeString([], {hour: "numeric", weekday: "short"}), y: cleanPrice(point.avgHighPrice)}))

        //adds an empty point for the current hour so the x-axis always reaches present time
        chartPoints.push({x: new Date().toLocaleTimeString([], {weekday: "short", hour: "numeric"}), y: null})

        //hides the chart and shows the no trades message if there is no buy data
        if (chartPoints.every(point => point.y === null)) {
            chartCanvas.style.display = "none"
            document.getElementById("chart-message").hidden = false
        }

        //puts the points into the chart and redraws the chart
        priceChart.data.datasets[0].data = chartPoints
        priceChart.update()
    }
    //shows an error message if the API is down or the item id is missing
    catch(priceError) {
        console.error(priceError)
        const chartMessage = document.getElementById("chart-message")
        chartMessage.textContent = "Price data is unavailable right now"
        chartMessage.hidden = false
        chartCanvas.style.display = "none"
    }
}

//loads the prices a single time when the page loads
loadPrices()