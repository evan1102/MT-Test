//============== FORM ITEMS ================
// --- JOB SUMMARY ---
jobnumber = {
    dataField: "gpjobnumber",
    label: { text: "Job Number", location: "top" }
};
jobDescription = {
    colSpan: 2,
    dataField: "description",
    editorType: "dxTextArea",
    editorOptions: { height: 60 },
    label: { text: "Job Description", location: "top" }
};

// --- CALL SUMMARY ---
gpservicecallid = {
    dataField: "gpservicecallid",
    label: { text: "Service Call", location: "top" }
};
gpappointmentid = {
    dataField: "gpappointmentid",
    label: { text: "Appointment", location: "top" }
};
dateOpened = {
    dataField: "dateofcall",
    editorType: "dxDateBox",
    editorOptions: { type: "datetime", onFocusIn: function (e) { e.component.blur(); } },
    label: { text: "Opened", location: "top" }
};
problemtype = {
    dataField: "gpproblemtype",
    label: { text: "Problem Type", location: "top" }
};
calltype = {
    dataField: "gpcalltype",
    label: { text: "Call Type", location: "top" }
};
callPO = {
    dataField: "purchaseorder",
    label: { text: "Customer PO", location: "top" }
};

// --- RESOLUTION ---
resolutionName = {
    dataField: "callresolution_name",
    label: { text: "Name", location: "top" }
};
resolutionDescription = {
    colSpan: 3,
    dataField: "callresolution_description",
    label: { text: "Description", location: "top" }
};
resolutionNote = {
    dataField: "resolutionnote",
    editorType: "dxTextArea",
    editorOptions: { height: 100 },
    label: { text: "Resolution Note", location: "top" }
};

// --- LOCATION ---
customer = {
    colSpan: 4,
    dataField: "customer_name",
    label: { text: "Customer", location: "top" }
};
address1 = {
    colSpan: 4,
    dataField: "location_address1",
    label: { text: "Address", location: "top" }
};
city = {
    colSpan: 2,
    dataField: "location_city",
    label: { text: "City", location: "top" }
};
state = {
    dataField: "location_state",
    label: { text: "State", location: "top" }
};
zip = {
    dataField: "location_zip",
    label: { text: "Zip", location: "top" }
};

// --- COMMON ---
dateCompleted = {
    dataField: "completiondate",
    editorType: "dxDateBox",
    editorOptions: { type: "datetime", onFocusIn: function (e) { e.component.blur(); } },
    label: { text: "Completed", location: "top" }
};
description = {
    colSpan: 2,
    dataField: "description",
    editorType: "dxTextArea",
    editorOptions: { height: 60 },
    label: { text: "Description", location: "top" }
};
tech = {
    dataField: "gptechnicianid",
    label: { text: "Technician", location: "top" }
};

//============== FORM GROUPS ================
// --- JOB SUMMARY ---
jobDetailGroup = {
    cssClass: "formBox",
    itemType: "group",
    items: [jobnumber, dateCompleted, jobDescription, tech, resolutionNote]
};

// --- CALL SUMMARY ---
callApptDateGroup = {
    colCount: 2,
    cssClass: "formBox",
    itemType: "group",
    items: [gpservicecallid, gpappointmentid, dateOpened, dateCompleted, description]
};
callDetailGroup = {
    cssClass: "formBox",
    itemType: "group",
    items: [problemtype, calltype, callPO, tech, resolutionNote]
};
callResolutionGroup = {
    colCount: 4,
    cssClass: "formBox",
    itemType: "group",
    items: [resolutionName, resolutionDescription]
};

// --- LOCATION ---
locGroup = {
    colCount: 4,
    cssClass: "formBox",
    itemType: "group",
    items: [customer, address1, city, state, zip]
};

//============== FORM DETAILS ================
apptItems = [];
jobItems = [jobDetailGroup, locGroup];
callItems = [callApptDateGroup, locGroup, callDetailGroup];
resolutionItems = [callResolutionGroup];

//============== LIST COLLECTIONS ================
// --- TASK ---
taskGroupBy = "gptasklistid";
taskGroupHeader = function (data) {
    return $("<h3>").append(
        $("<br>"),
        $("<span>").append(data.key ? "Task List: " + data.key : "Tasks: "),
        $("<span>").append(data.key && data.items[0].gpsublocationid ? "<br>Sublocation: " + data.items[0].gpsublocationid : ""),
        $("<span>").append(data.key && data.items[0].gpequipmentid ? "<br>Equipment: " + data.items[0].gpequipmentid : "")
    );
};
taskSubGroupBy = "gpequipmentid_gptaskcode";
taskSubGroupTemplate = function (data, _, element) {
    return element.append(
        $("<span>").append(data.items[0].taskstatus_name + " - "),
        $("<i>").append(data.items[0].gptaskcode + ": " + data.items[0].description),
        $("<span>").append(!data.items[0].gptasklistid && data.items[0].gpsublocationid ? "<br>Sublocation: " + data.items[0].gpsublocationid : ""),
        $("<span>").append(!data.items[0].gptasklistid && data.items[0].gpequipmentid ? "<br>Equipment: " + data.items[0].gpequipmentid : ""),
        $("<span>").append(data.items[0].taskresponse_id ? "<br>Task Responses: " : "")
    )
};
taskSubGroupItemTemplate = function (data, _, element) {
    switch (data.taskresponse_responsetype) {
        case '1': value = data.taskresponse_stringresponse; break;
        case '2': value = data.taskresponse_numericresponse; break;
        case '3': value = data.taskresponse_integerresponse; break;
        case '4': switch (data.taskresponse_integerresponse) {
            case '1': value = "No"; break;
            case '2': value = "Yes"; break;
            default: value = "";
        } break;
        case '5': value = data.taskresponse_stringresponse; break;
        case '6': value = data.taskresponse_textresponse; break;
        case '7': switch (data.taskresponse_integerresponse) {
            case '1': value = "Billable"; break;
            case '2': value = "No"; break;
            case '3': value = "Yes"; break;
            default: value = "";
        } break;
        case '8': value = MobileCRM.CultureInfo.shortDateString(new Date(data.taskresponse_dateresponse)); break;
        default: value = "";
    }
    if (data.taskresponse_id)
        return element.append(
            $("<div style='white-space:normal'>").append(value ? data.taskresponse_responselabel + " : " + value : data.taskresponse_responselabel + " : ")
        );
    else
        return element.append("No Task Responses")
};

// --- TIME ENTRIES ---
timeEntriesGroupBy = "employee_name";
timeEntriesGroupHeader = function (data) {
    return $("<h3>").append("<br>" + data.key)
};
timeEntriesSubGroupBy = "costtype";
timeEntriesSubGroupTemplate = function (data) {
    switch (data.key) {
        case '1': header = "Labor"; break;
        case '2': header = "Expense"; break;
        case '3': header = "Travel"; break;
        default: header = "";
    }
    return $("<div>").append("Cost Type: " + header);
};
timeEntriesSubGroupItemTemplate = function (data, _, element) {
    if (data.costtype === '1')
        return element.append(
            $("<span>").append(data.paycode_name + ": "),
            $("<span>").append("<b>" + parseFloat(data.hoursunits).toFixed(2) + " hrs </b>"),
            $("<i style='white-space:normal'>").append(data.description ? "<br>" + data.description : ""),
            $("<i>").append(data.gptimein ? "<br>Time In: " +
                MobileCRM.CultureInfo.shortDateString(new Date(data.gptimein)) + " " +
                MobileCRM.CultureInfo.shortTimeString(new Date(data.gptimein)) : ""),
            $("<i>").append(data.gptimeout ? "<br>Time Out: " +
                MobileCRM.CultureInfo.shortDateString(new Date(data.gptimeout)) + " " +
                MobileCRM.CultureInfo.shortTimeString(new Date(data.gptimeout)) : "")
        );
    else
        return element.append(
            $("<i style='white-space:normal'>").append(data.description ? data.description + ", " : ""),
            $("<b>").append("Qty: " + data.quantity)
        );
};

// --- CONSUMED INVENTORY ---
invItemTemplate = function (data, _, element) {
    return element.append(
        $("<b>").append("Item: " + data.itemnumber),
        $("<i style='white-space:normal'>").append(data.itemdescription ? " - " + data.itemdescription + ", " : ", "),
        $("<span>").append("Qty: " + data.quantity)
    );
};

// --- PURCHASE ORDER ---
poGroupBy = "gppurchaseordernumber";
poGroupTemplate = function (data, _, element) {
    return element.append(
        $("<span>").append(data.key ? "PO#: " + data.key : "PO#:")
    );
};
poItemTemplate = function (data, _, element) {
    return element.append(
        $("<b>").append("Item: " + data.itemnumber),
        $("<i style='white-space:normal'>").append(data.itemdescription ? " - " + data.itemdescription + ", " : ", "),
        $("<span>").append("Qty: " + data.quantity)
    );
};

//============== CSS CLASSES ================
createCssClass("formBox", [
    "background-color: #e6e6e6",
    "border: 10px solid #5174FA",
    "border-style: none none none solid",
    "padding: 20px",
    "border-radius: 5px",
    "margin-top: 15px",
    "padding-right: 20px"
]);