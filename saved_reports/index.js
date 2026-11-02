//grab list on the saved reports page
const reportList = document.getElementById("report-list-id");

//load saved reports, or an empty list if none are saved yet
const savedReports = JSON.parse(localStorage.getItem("savedReports")) || [];

//displays a message if no saved reports exist yet
if (savedReports.length === 0)
{
    reportList.textContent = "No saved reports yet";
}

//adds a row for each saved report (newest first): item name links to report and date saved shows on right
for (const report of savedReports)
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
    reportList.appendChild(div);
}
    