// if item is less than 50 then dont tax, if the total tax is greater than 5 million then tax is capped at 5 million
// everything else is taxed at 2% of the sell price
export function geTax(sellPrice) {
    if (sellPrice < 50) {
        return 0;
    }

    const tax = Math.floor(sellPrice * 0.02);

    return Math.min(tax, 5000000);
}
