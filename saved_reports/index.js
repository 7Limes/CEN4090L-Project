//grab the list and the page buttons on the saved reports page
const reportList = document.getElementById("report-list-id");
const pageNumbers = document.getElementById("page-numbers");

//how many reports show on each page
const REPORTS_PER_PAGE = 10;
//how many page numbers show on each side of the current page (same as the browse page)
const PAGE_WINDOW = 2;

//load saved reports, or an empty list if none are saved yet (already newest first)
const savedReports = JSON.parse(localStorage.getItem("savedReports")) || [];

//the page being shown, starting at 1
let currentPage = 1;

function getPageCount()
{
    return Math.ceil(savedReports.length / REPORTS_PER_PAGE);
}

//builds one row: item name links to the report and the save date shows on the right
function createReportRow(report)
{
    //box for the whole row
    const div = document.createElement("div");
    div.className = "report-box";

    //item name that opens the saved report
    const link = document.createElement("a");
    link.href = "../item_report/index.html?report=" + report.id;
    link.textContent = report.itemName;

    //save date (displayed on the right hand side)
    const date = document.createElement("span");
    date.className = "report-box-date";
    date.textContent = report.saveDate;

    div.appendChild(link);
    div.appendChild(date);
    return div;
}

//shows the reports on the current page, then redraws the page buttons
function renderReports()
{
    //displays a message if no saved reports exist yet
    if (savedReports.length === 0)
    {
        reportList.textContent = "No saved reports yet";
        pageNumbers.replaceChildren();
        return;
    }

    const start = (currentPage - 1) * REPORTS_PER_PAGE;
    const rows = savedReports.slice(start, start + REPORTS_PER_PAGE).map(createReportRow);
    reportList.replaceChildren(...rows);

    renderPageNumbers();
}

function goToPage(page)
{
    if (page < 1 || page > getPageCount() || page === currentPage)
    {
        return;
    }

    currentPage = page;
    renderReports();
    window.scrollTo(0, 0);
}

function createPageButton(label, page, ariaLabel)
{
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-button";
    button.textContent = label;

    if (ariaLabel)
    {
        button.setAttribute("aria-label", ariaLabel);
    }

    if (page === currentPage && label === String(page))
    {
        button.classList.add("current-page");
        button.setAttribute("aria-current", "page");
    }

    if (page < 1 || page > getPageCount())
    {
        button.disabled = true;
    }

    button.addEventListener("click", function()
    {
        goToPage(page);
    });

    return button;
}

function createPageGap()
{
    const gap = document.createElement("span");
    gap.className = "page-gap";
    gap.textContent = "...";
    return gap;
}

//< 1 ... 4 5 [6] 7 8 ... 20 >
function renderPageNumbers()
{
    const pageCount = getPageCount();

    //no buttons needed when everything fits on one page
    if (pageCount <= 1)
    {
        pageNumbers.replaceChildren();
        return;
    }

    const buttons = [createPageButton("<", currentPage - 1, "Previous page")];

    const first = Math.max(1, currentPage - PAGE_WINDOW);
    const last = Math.min(pageCount, currentPage + PAGE_WINDOW);

    if (first > 1)
    {
        buttons.push(createPageButton("1", 1));
        if (first > 2)
        {
            buttons.push(createPageGap());
        }
    }

    for (let page = first; page <= last; page++)
    {
        buttons.push(createPageButton(String(page), page));
    }

    if (last < pageCount)
    {
        if (last < pageCount - 1)
        {
            buttons.push(createPageGap());
        }
        buttons.push(createPageButton(String(pageCount), pageCount));
    }

    buttons.push(createPageButton(">", currentPage + 1, "Next page"));

    pageNumbers.replaceChildren(...buttons);
}

renderReports();
