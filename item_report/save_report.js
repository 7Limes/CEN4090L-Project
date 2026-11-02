//grab the save report button on the report page
const saveReportButton = document.getElementById("save-report-button");

//save a snapshot of the report to local storage when the save report button is clicked
saveReportButton.addEventListener("click", function(event){
    //prevents link from jumping to the top of the page
    event.preventDefault();
    //loads the saved reports, or an empty list if none are saved
    const savedReports = JSON.parse(localStorage.getItem("savedReports")) || [];
    //uses unshift to add the report to the front of the list so newest is first
    savedReports.unshift({id: Date.now(), itemId: new URLSearchParams(window.location.search).get("id"), itemName: itemName.textContent, icon: itemIcon.src, saveDate: new Date().toLocaleDateString(), html: itemReport.innerHTML});
    //saves the updated list back to local storage
    localStorage.setItem("savedReports", JSON.stringify(savedReports));
    saveReportButton.textContent = "Saved!";
});

//gets the saved report id if the page was opened from the saved reports page (?report=...)
const reportId = new URLSearchParams(window.location.search).get("report");
if (reportId)
{
    //finds the saved report with a matching id
    const savedReports = JSON.parse(localStorage.getItem("savedReports")) || [];
    const report = savedReports.find(report => report.id === Number(reportId));
    //hides the save button so a saved report can't be saved twice
    saveReportButton.hidden = true;
    //shows a message if the report no longer exists
    if (!report) {
        itemName.textContent = "Report not found";
        itemReport.textContent = "";
    }
    //shows the snapshot exactly as it was saved
    else
    {
        itemName.textContent = report.itemName;
        document.title = report.itemName;
        itemIcon.src = report.icon;
        itemIcon.hidden = false;
        itemReport.innerHTML = report.html;
    }
}