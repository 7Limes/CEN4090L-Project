// Buy and sell conditions in the Report Settings panel (issue #72).
//
// Each group (buy, sell) is a list of conditions. A condition is a metric,
// an operator and a threshold, e.g. "price change (%) more than 25".
// Every condition after the first also has an AND/OR choice for how it joins
// the condition above it, like the line operators in FSU's library search.
//
// Front end only for now: nothing reads these values yet. The report page and
// backtester will pick them up in a later issue.

// unit shown in the threshold label, and the input limits that make sense for each metric
const METRIC_SETTINGS = {
    price:        { unit: "gp",    min: "0", step: "1" },
    price_change: { unit: "%",     min: "",  step: "any" },  // can be negative or fractional
    volume:       { unit: "items", min: "0", step: "1" },
    margin:       { unit: "gp",    min: "",  step: "1" },    // a margin can be negative
};

const conditionTemplate = document.getElementById("condition-template");
const conditionGroups = document.querySelectorAll(".condition-group");

// counts up so every condition row gets its own ids, even after rows are removed
let nextConditionId = 1;

// adds a condition row to a group; join is "and" or "or" (ignored for the first row)
function addCondition(group, join) {
    const groupName = group.dataset.group;
    const rowId = groupName + "-condition-" + nextConditionId++;
    const row = conditionTemplate.content.firstElementChild.cloneNode(true);

    // give each control a unique id so its label points at it
    row.querySelectorAll("[data-field]").forEach(control => {
        control.id = rowId + "-" + control.dataset.field;
        control.name = control.id;
        row.querySelector('label[data-for="' + control.dataset.field + '"]').htmlFor = control.id;
    });

    // the radios share a name per row, so each row has its own AND/OR choice
    row.querySelectorAll(".condition-join input").forEach(radio => {
        radio.name = rowId + "-join";
        radio.checked = radio.value === join;
    });

    group.querySelector(".condition-list").appendChild(row);
    updateGroup(group);
    return row;
}

// removes a row, keeping at least one condition in the group
function removeCondition(group, row) {
    const list = group.querySelector(".condition-list");
    if (list.children.length <= 1) return;

    // move focus somewhere sensible, since the focused Remove button is about to disappear
    const neighbour = row.previousElementSibling || row.nextElementSibling;
    row.remove();
    updateGroup(group);
    neighbour.querySelector('[data-field="metric"]').focus();
}

// keeps the rows of a group consistent after one is added or removed
function updateGroup(group) {
    const groupName = group.dataset.group;
    const rows = group.querySelectorAll(".condition");

    rows.forEach((row, index) => {
        const number = index + 1;

        // the first condition has nothing above it to join with
        row.querySelector(".condition-join").hidden = index === 0;
        row.querySelector(".condition-join legend").textContent =
            "Combine " + groupName + " condition " + number + " with the condition above using";

        // a lone condition can't be removed (leave its fields empty instead)
        const removeButton = row.querySelector(".condition-remove");
        removeButton.disabled = rows.length === 1;
        removeButton.setAttribute("aria-label", "Remove " + groupName + " condition " + number);
    });
}

// matches the threshold label and limits to the chosen metric, e.g. "Threshold (%)"
function updateThreshold(row) {
    const metric = row.querySelector('[data-field="metric"]').value;
    const settings = METRIC_SETTINGS[metric];
    const threshold = row.querySelector('[data-field="threshold"]');
    const label = row.querySelector('label[data-for="threshold"]');

    label.textContent = settings ? "Threshold (" + settings.unit + ")" : "Threshold";
    threshold.min = settings ? settings.min : "";
    threshold.step = settings ? settings.step : "any";
}

conditionGroups.forEach(group => {
    // every group starts with one condition
    addCondition(group, "and");

    // one listener per group handles the buttons and selects of every row in it
    group.addEventListener("click", event => {
        const addButton = event.target.closest(".condition-add");
        if (addButton) {
            const row = addCondition(group, addButton.dataset.join);
            row.querySelector('[data-field="metric"]').focus();
            return;
        }

        const removeButton = event.target.closest(".condition-remove");
        if (removeButton) {
            removeCondition(group, removeButton.closest(".condition"));
        }
    });

    group.addEventListener("change", event => {
        if (event.target.matches('[data-field="metric"]')) {
            updateThreshold(event.target.closest(".condition"));
        }
    });
});
