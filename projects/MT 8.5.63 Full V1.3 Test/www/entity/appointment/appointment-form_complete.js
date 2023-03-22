//============== ENUM ================
const ReportType = {
    APPOINTMENT_SUMMARY_REPORT: "Appointment Summary Report",
    CALL_SUMMARY_REPORT: "Call Summary Report",
    FIELD_INVOICE_REPORT: "Field Invoice Report",
    INSPECTION_REPORT: "Inspection Report",
    JOB_APPOINTMENT_SUMMARY_REPORT: "Job Appt Summary Report"
};
const ValidationLevel = {
    Optional: '0',
    Warning: '1',
    Required: '2'
};
const Validation = {
    AssignEquipment: 'Add or Assign Equipment',
    CompleteAppointment: 'Complete the Appointment',
    Inventory: 'Add Inventory Transactions',
    PreviewInvoice: 'Preview Invoice',
    PurchaseOrderDetail: 'Create a Purchase Order',
    ResolutionCode: 'Add Resolution Code',
    ResolutionNote: 'Add Resolution Note',
    Signature_Customer: 'Capture Customer Signature',
    Signature_Technician: 'Capture Technician Signature',
    Signature_Invoice: 'Capture Invoice Signature',
    TaskCompletion: 'Complete Tasks',
    TaskResponse: 'Complete Task Responses',
    TimeLog: 'Appointment Time Out',
    TimeEntry_Labor: 'Add Labor Transactions',
    TimeEntry_Travel: 'Add Travel Transactions',
    TimeEntry_Expense: 'Add Expense Transactions'
};
const LaborExpenseCostType = {
    Labor: 1,
    Expense: 2,
    Travel: 3
};

//============== LOAD DATA ================
// ----- Report Util -----
function initializeSummaryReport() {
    var deferred = $.Deferred();

    var reportName = null;
    if (parseInt(selected[entityName].gpappointmenttype) === 1) {
        // Appointment And Call Summary Report         
        if (setupOptions.UseAppointmentResolutionNote)
            reportName = ReportType.APPOINTMENT_SUMMARY_REPORT;
        else
            reportName = ReportType.CALL_SUMMARY_REPORT;
    }
    else // Job Summary Report
        reportName = ReportType.JOB_APPOINTMENT_SUMMARY_REPORT;

    ifExistsDeleteReport(reportName).then(function () {
        ifNotExistsCreateReport(reportName).then(function (reportCreated) {
            if (reportCreated)  // Appointment Completion Summary Tab
                MobileCRM.bridge.raiseGlobalEvent("LoadSignatureReportIDs");
            return deferred.resolve();
        }, function (err) { return deferred.reject(err); });
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

function ifExistsDeleteReport(reportName) {
    var deferred = $.Deferred();
    // Make sure a service appointment does not have 
    // an Appointment and a Call Summary Report
    if (reportName === ReportType.JOB_APPOINTMENT_SUMMARY_REPORT) {
        return deferred.resolve();
    }

    var reportToDelete = null;
    switch (reportName) {
        case ReportType.APPOINTMENT_SUMMARY_REPORT:
            reportToDelete = ReportType.CALL_SUMMARY_REPORT; break;
        case ReportType.CALL_SUMMARY_REPORT:
            reportToDelete = ReportType.APPOINTMENT_SUMMARY_REPORT; break;
    }

    if (!reportToDelete) {
        return deferred.reject("Unable to perform report maintenance: Missing Report Name");
    }

    hasReportByName(selected[entityName].id, reportToDelete).then(function (hasReport) {
        if (hasReport) {
            getReportByName(selected[entityName].id, reportToDelete).then(function (report) {
                MobileCRM.DynamicEntity.deleteById(SCHEMA.report.name, report.id, function () {
                    return deferred.resolve();
                }, function (err) { return deferred.reject("Delete Report Error: " + err); });
            }, function (err) { return deferred.reject(err); });
        }
        else {
            return deferred.resolve();
        }
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function ifNotExistsCreateReport(reportName) {
    var deferred = $.Deferred();

    hasReportByName(selected[entityName].id, reportName).then(function (hasReport) {
        if (!hasReport)
            createAppointmentReport(reportName).then(function () {
                return deferred.resolve(true);
            }, function (err) { return deferred.reject(err); });
        else
            return deferred.resolve(false);
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function hasReportByName(entityID, reportName) {
    var deferred = $.Deferred();

    getReportByName(entityID, reportName).then(function (report) {
        return deferred.resolve(report !== null);
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function getReportByName(entityID, reportName) {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.report.name);
    entity.addAttribute('id');
    entity.addFilter().where('objectid', 'eq', entityID);
    entity.addFilter().where('name', 'eq', reportName);
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res[0] ? res[0] : null);
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function createAppointmentReport(reportName) {
    var deferred = $.Deferred();

    fetchSystemUser().then(function (systemuser) {
        // Create Report Entity
        var reportEntity = new MobileCRM.DynamicEntity.createNew(SCHEMA.report.name);
        reportEntity.properties.name = reportName;
        reportEntity.properties.appointmentid = new MobileCRM.DynamicEntity("appointment", selected[entityName].id);
        reportEntity.properties.objectid = new MobileCRM.DynamicEntity("appointment", selected[entityName].id);
        reportEntity.properties.ispreview = false;
        reportEntity.properties.email =
            parseInt(setupOptions.ReportEmailMode) === 3 ? null : systemuser.internalemailaddress;

        reportEntity.save(function (err) {
            if (err) return deferred.reject(err);
            else {
                // Create Annotation Entity
                var annotationEntity = new MobileCRM.DynamicEntity.createNew(SCHEMA.annotation.name);
                annotationEntity.properties.isdocument = true;
                annotationEntity.properties.isreadonly = true;
                annotationEntity.properties.subject = reportName;
                annotationEntity.properties.notetext = reportName + " for Service Call: " + selected[entityName].gpservicecallid;
                annotationEntity.properties.objectid = new MobileCRM.DynamicEntity("report", this.id);
                annotationEntity.save(function (err) { if (err) MobileCRM.bridge.alert(err); });
                return deferred.resolve();
            }
        });
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}

function removeDuplicateSummaryReports(summaryReports) {
    var deferred = $.Deferred();

    // Get the last modified names/signatures 
    var custNames = {};
    var custSignatures = {};
    var techNames = {};
    var techSignatures = {};
    summaryReports.forEach(function (report) {
        if (report.customername)
            custNames[report.modifiedon] = report.customername;
        if (report.customersignature)
            custSignatures[report.modifiedon] = report.customersignature;

        if (report.technicianname)
            techNames[report.modifiedon] = report.technicianname;
        if (report.techniciansignature)
            techSignatures[report.modifiedon] = report.techniciansignature;
    });
    var latestCustomerName = getLatestAttribute(custNames);
    var latestCustomerSignature = getLatestAttribute(custSignatures);
    var latestTechnicianName = getLatestAttribute(techNames);
    var latestTechnicianSignature = getLatestAttribute(techSignatures);
    // Update the first created report with the latest attributes
    MobileCRM.DynamicEntity.loadById("report", summaryReports[0].id, function (res) {
        res.properties.customername = latestCustomerName;
        res.properties.customersignature = latestCustomerSignature;
        res.properties.technicianname = latestTechnicianName;
        res.properties.techniciansignature = latestTechnicianSignature;
        res.save(function (err) {
            if (err)
                return deferred.reject(err);
            else {
                // Delete the other duplicate reports and their corresponding annotations
                for (var i = 1; i < summaryReports.length; i++) {
                    var deleteID = summaryReports[i].id;
                    MobileCRM.DynamicEntity.deleteById("report", deleteID, function () {
                        MobileCRM.bridge.log("Duplicate Summary Report Deleted - id: " + deleteID);
                        deleteCorrespondingAnnotation(deleteID);
                    }, MobileCRM.bridge.alert);
                }

                return deferred.resolve(this.id);
            }
        });
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function getLatestAttribute(attributeObj) {
    var sortedKeys = Object.keys(attributeObj).sort(function (a, b) {
        return new Date(a) - new Date(b);
    });
    return attributeObj[sortedKeys[sortedKeys.length - 1]];
}
function deleteCorrespondingAnnotation(reportID) {
    var entity = new MobileCRM.FetchXml.Entity("annotation");
    entity.addAttribute('id');
    entity.addFilter().where('objectid', 'eq', reportID);
    entity.addFilter().where('isdocument', 'eq', 1);
    entity.addFilter().where('isreadonly', 'eq', 1);
    entity.addFilter().contains('notetext', 'Summary Report');
    entity.filter.type = 'and';
    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        res.forEach(function (annotation) {
            var deleteID = annotation.id;
            MobileCRM.DynamicEntity.deleteById("annotation", deleteID, function () {
                MobileCRM.bridge.log("Corresponding Duplicate Summary Annotation Deleted - id: " + deleteID);
            }, MobileCRM.bridge.alert);
        });
    }, MobileCRM.bridge.alert);
}

//============== TOOLBAR FUNCTIONS ================
// ----- Form Validation -----
function combineValidationItems() {
    var deferred = $.Deferred();
    var combinedValidationFields = {};
    combinedValidationFields[ValidationLevel.Required] = [];
    combinedValidationFields[ValidationLevel.Warning] = [];

    $(arguments).each(function (i, e) {
        $(e[ValidationLevel.Required]).each(function (index, label) {
            combinedValidationFields[ValidationLevel.Required].push(label);
        });

        $(e[ValidationLevel.Warning]).each(function (index, label) {
            combinedValidationFields[ValidationLevel.Warning].push(label);
        });
    });

    return deferred.resolve(combinedValidationFields);
    return deferred.promise();
}
function showValidationPrompt(level, validationItems) {
    var popup = new MobileCRM.UI.MessageBox("Missing " +
        (level === ValidationLevel.Required ? "Required" : "Recommended") + " Data");
    popup.multiLine = true;
    popup.items = validationItems;
    popup.show(validationItemClicked);
}
function validationItemClicked(item) {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        switch (item) {
            case Validation.AssignEquipment:
                if (selected.servicecall)
                    navigateToTab("servicecall", selected.servicecall.id, "equipment");
                break;
            case Validation.CompleteAppointment:
                initializeFinalReports().then(function () {
                    if (parseInt(setupOptions.ReportEmailMode) === 3)
                        promptEmailForCompletion();
                    else
                        confirmCompletion();
                }, MobileCRM.bridge.alert);
                break;
            case Validation.Inventory:
                entityForm.selectTab("consumedinventory");
                break;
            case Validation.PreviewInvoice:
                MobileCRM.bridge.raiseGlobalEvent("CompleteValidation_Report", entityForm.entity.properties);
                break;
            case Validation.PurchaseOrderDetail:
                entityForm.selectTab("purchaseorderdetail");
                break;
            case Validation.ResolutionCode:
                entityForm.selectTab(detailViewName);
                var dv = entityForm.getDetailView(detailViewName);
                dv.startEditItem(dv.getItemIndex(SCHEMA.callresolution.name));
                break;
            case Validation.ResolutionNote:
                entityForm.selectTab(detailViewName);
                var dv = entityForm.getDetailView(detailViewName);
                dv.startEditItem(dv.getItemIndex("resolutionnote"));
                break;
            case Validation.Signature_Customer:
            case Validation.Signature_Technician:
                entityForm.entity.properties.captureSignature = true;
                entityForm.selectTab("Summary");
                MobileCRM.bridge.raiseGlobalEvent("CaptureSignature", { type: item });
                break;
            case Validation.Signature_Invoice:
                entityForm.selectTab("report");
                break;
            case Validation.TaskCompletion:
            case Validation.TaskResponse:
                if (setupOptions.ShowTasksForAppointments)
                    entityForm.selectTab("task");
                else if (selected.servicecall)
                    navigateToTab("servicecall", selected.servicecall.id, "task");
                break;
            case Validation.TimeEntry_Labor:
            case Validation.TimeEntry_Travel:
            case Validation.TimeEntry_Expense:
                entityForm.selectTab("laborexpense");
                break;
            case Validation.TimeLog:
                fetchAppointmentTimeLog_TimeOut().then(function (timelog) {
                    if (timelog)
                        MobileCRM.UI.FormManager.showEditDialog(SCHEMA.timelog.name, timelog.id);
                    else
                        MobileCRM.bridge.alert("Unable to Load Timelog");
                }, MobileCRM.bridge.alert);

                break;
        }
    }, MobileCRM.bridge.alert);
}

// ----- Form Validation: TimeLog -----
function checkTimeLog() {
    var deferred = $.Deferred();
    if (!setupOptions.UseTimeLog)
        return deferred.resolve({});

    isAppointmentCurrentlyTimedIn().then(function (isTimedIn) {
        var validationItems = {};
        if (isTimedIn)
            validationItems[ValidationLevel.Required] = [Validation.TimeLog];

        return deferred.resolve(validationItems);
    }, MobileCRM.bridge.alert);

    return deferred.promise();
}
function isAppointmentCurrentlyTimedIn() {
    var deferred = $.Deferred();

    fetchAppointmentTimeLog_TimeOut().then(function (timelog) {
        return deferred.resolve(timelog !== null);
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchAppointmentTimeLog_TimeOut() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.timelog.name);
    entity.addAttribute('id');

    entity.addFilter().where('appointmentid', 'eq', selected[entityName].id);
    entity.addFilter().where('gptimein', 'not-null');
    entity.addFilter().where('gptimeout', 'null');
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res[0] ? res[0] : null);
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

// ----- Form Validation: Time Entries -----
function checkTimeEntries() {
    var deferred = $.Deferred();
    if (!setupOptions.UseLabor && !setupOptions.UseTravel && !setupOptions.UseExpense)
        return deferred.resolve({});

    var timeEntryPromises = [];
    if (setupOptions.UseLabor)
        timeEntryPromises.push(checkLaborExpense(LaborExpenseCostType.Labor));
    if (setupOptions.UseTravel)
        timeEntryPromises.push(checkLaborExpense(LaborExpenseCostType.Travel));
    if (setupOptions.UseExpense)
        timeEntryPromises.push(checkLaborExpense(LaborExpenseCostType.Expense));

    $.when.apply($, timeEntryPromises)
        .then(combineValidationItems, function (err) { return deferred.reject(err); })
        .then(function (combinedItems) {
            return deferred.resolve(combinedItems);
        }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function checkLaborExpense(costType) {
    var deferred = $.Deferred();
    if (!costType)
        return deferred.resolve({});

    var validationLvl = "";
    var validationMsg = "";
    switch (costType) {
        case LaborExpenseCostType.Labor:
            validationLvl = setupOptions.LaborValidationLevel;
            validationMsg = Validation.TimeEntry_Labor;
            break;
        case LaborExpenseCostType.Travel:
            validationLvl = setupOptions.TravelValidationLevel;
            validationMsg = Validation.TimeEntry_Travel;
            break;
        case LaborExpenseCostType.Expense:
            validationLvl = setupOptions.ExpenseValidationLevel;
            validationMsg = Validation.TimeEntry_Expense;
            break;
        default:
            return deferred.reject("Invalid Time Entry Cost Type");
    }

    fetchLaborExpense(costType).then(function (laborexpenses) {
        var validationItems = {};
        if (!laborexpenses)
            validationItems[validationLvl] = [validationMsg];
        return deferred.resolve(validationItems);
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function fetchLaborExpense(costType) {
    var deferred = $.Deferred();
    if (!costType)
        return deferred.reject("Missing Cost Type");

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.laborexpense.name);
    entity.addAttribute('hoursunits');

    entity.addFilter().where('costtype', 'eq', costType);
    entity.addFilter().where('appointmentid', 'eq', selected[entityName].id);
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res.length > 0 ? res : null);
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

// ----- Form Validation: Inventory -----
function checkInventory() {
    var deferred = $.Deferred();
    if (!setupOptions.UseInventory)
        return deferred.resolve({});

    fetchConsumedInventory().then(function (consumedInventory) {
        var validationItems = {};
        if (!consumedInventory)
            validationItems[setupOptions.InventoryValidationLevel] = [Validation.Inventory];

        return deferred.resolve(validationItems);
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function fetchConsumedInventory() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.consumedinventory.name);
    entity.addAttribute('id');
    entity.addFilter().where('appointmentid', 'eq', selected[entityName].id);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res.length > 0 ? res : null);
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

// ----- Form Validation: Signatures -----
function checkSignatures() {
    var deferred = $.Deferred();
    if (!setupOptions.UseCustomerSignature && !setupOptions.UseTechnicianSignature)
        return deferred.resolve({});

    fetchSummaryReport().then(function (summaryReport) {
        var validationItems = {};
        // In case Customer and Technician Validation levels are the same
        validationItems[setupOptions.CustomerSignatureValidationLevel] = [];
        validationItems[setupOptions.TechnicianSignatureValidationLevel] = [];

        if (setupOptions.UseCustomerSignature && (!summaryReport.customername || !summaryReport.customersignature))
            validationItems[setupOptions.CustomerSignatureValidationLevel].push(Validation.Signature_Customer);

        if (setupOptions.UseTechnicianSignature && (!summaryReport.technicianname || !summaryReport.techniciansignature))
            validationItems[setupOptions.TechnicianSignatureValidationLevel].push(Validation.Signature_Technician);

        return deferred.resolve(validationItems);
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchSummaryReport() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.report.name);
    entity.addAttribute('id');
    entity.addAttribute('customername');
    entity.addAttribute('customersignature');
    entity.addAttribute('technicianname');
    entity.addAttribute('techniciansignature');
    entity.addAttribute('modifiedon');
    entity.orderBy('createdon', false);

    entity.addFilter().where('appointmentid', 'eq', selected[entityName].id);
    entity.addFilter().contains('name', 'Summary');
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        if (res.length > 1)
            removeDuplicateSummaryReports(res).then(function (summaryReportID) {
                return deferred.resolve(summaryReportID);
            }, function (err) { return deferred.reject(err); });
        else
            return deferred.resolve(res[0]);
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}

//============== FORM ITEM FUNCTIONS ================
function formValueChanged(entityForm) {
    if (entityForm.context.changedItem === "^BtnSnippet")
        showResolutionSnippets();
    else if (entityForm.context.changedItem === SCHEMA.callresolution.name) {
        callResolutionSelected(entityForm.entity.properties.callresolution);
    }
    else
        updateEntity(
            entityForm.context.changedItem,
            entityForm.entity.properties[entityForm.context.changedItem]);
}
function updateEntity(propName, propValue) {
    MobileCRM.DynamicEntity.loadById(entityName, selected[entityName].id, function (entity) {
        entity.properties[propName] = propValue;
        entity.save(function (err) {
            if (err)
                MobileCRM.bridge.alert(err);
            else
                setClean();
        });
    }, MobileCRM.bridge.alert);
}

//============== FORM EXECUTIONS ================
function promptEmailForCompletion() {
    MobileCRM.UI.FormManager.showNewDialog("locationcontact", null,
        { iFrameOptions: { appointment: selected[entityName] } });
}
function confirmCompletion() {
    var popup = new MobileCRM.UI.MessageBox("Confirm the completion of appointment " + selected[entityName].name + ". " +
        "You will be unable to further modify the appointment after it has been completed.");
    popup.items = ["Complete Appointment", "Complete and Create New", "Cancel"];
    popup.multiLine = true;
    popup.show(function (btn) {
        if (btn === popup.items[0])
            completeAppointment(false);
        if (btn === popup.items[1])
            completeAppointment(true);
        return;
    });
}

// ----- SAVE APPOINTMENT -----
function setAppointmentComplete() {
    var deferred = $.Deferred();

    var itemsDeferred = [
        fetchCompleteAppointmentStatusID(),
        fetchLaborExpense(LaborExpenseCostType.Labor)
    ];

    $.when.apply($, itemsDeferred).then(function () {
        var statusID = arguments[0];
        var timeEntries = arguments[1];
        var totalHours = 0;
        $(timeEntries).each(function (i, entry) {
            totalHours += parseFloat(entry.hoursunits);
        });

        MobileCRM.DynamicEntity.loadById(entityName, selected[entityName].id, function (appt) {
            appt.properties.appointmentstatusid = new MobileCRM.DynamicEntity("appointmentstatus", statusID);
            appt.properties.actualhours = totalHours;
            appt.save(function (err) {
                if (err)
                    return deferred.reject(err);
                else
                    return deferred.resolve(this.properties);
            });
        }, function (err) { return deferred.reject(err); });
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchCompleteAppointmentStatusID() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.appointmentstatus.name);
    entity.addAttribute('id');
    entity.addFilter().where('name', 'eq', "COMPLETE");

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        if (res[0])
            return deferred.resolve(res[0].id);
        else
            return deferred.reject("Complete Appointment Status Not Found");

    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

// ----- AFTER SAVE APPOINTMENT -----
function updateAppointmentStatusTimeStamp(appointment) {
    var deferred = $.Deferred();

    fetchAppointmentStatusTimeStampID(appointment).then(function (timestampID) {
        var timestamp = new MobileCRM.DynamicEntity("appointmentstatustimestamp", timestampID);
        timestamp.properties.name = "COMPLETE";
        timestamp.properties.appointmentstatus = "COMPLETE";
        timestamp.properties.appointmentstatusdate = new Date();

        timestamp.properties.gpappointmentid = appointment.gpappointmentid;
        timestamp.properties.gpservicecallid = appointment.gpservicecallid;
        timestamp.properties.appointmentid = new MobileCRM.DynamicEntity(entityName, appointment.id);

        timestamp.save(function (err) {
            if (err)
                return deferred.reject(err);
            else
                return deferred.resolve("Timestamp Updated");
        })
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchAppointmentStatusTimeStampID(appointment) {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.appointmentstatustimestamp.name);
    entity.addAttribute('id');
    entity.addFilter().where("appointmentid", 'eq', appointment.id);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res[0] ? res[0].id : null);
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

function requestReportPreviews(appointment) {
    var deferred = $.Deferred();
    if (!appointment)
        return deferred.reject("Missing Appointment ID");

    fetchAppointmentReports(appointment.id).then(function (reports) {
        var itemsDeferred = [];
        $(reports).each(function (i, report) {
            itemsDeferred.push(requestPreview(report));
        });

        $.when.apply($, itemsDeferred).then(function () {
            return deferred.resolve("Report Preview: " + reports.length);
        }, function (err) { return deferred.reject(err); });
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function fetchAppointmentReports(appointmentID) {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.report.name);
    entity.addAttribute('id');
    entity.addAttribute('name');
    entity.addFilter().where('appointmentid', 'eq', appointmentID);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (res) { return deferred.resolve(res); },
        function (err) { return deferred.reject(err); }
    );
    return deferred.promise();
}
function requestPreview(report) {
    var deferred = $.Deferred();
    if (!report) {
        return deferred.reject("Request Report Error: Missing Report Details")
    }

    MobileCRM.DynamicEntity.loadById(SCHEMA.report.name, report.id, function (entity) {
        entity.properties.status = "REQUESTED";
        entity.properties.ispreview = false;
        entity.properties.errormessage = "";

        entity.save(function (err) {
            if (err)
                return deferred.reject(err);
            else
                return deferred.resolve();
        });
    }, function (err) { return deferred.reject("Load Report Error: " + err); });
    return deferred.promise();
}

function updateLocationContacts() {
    // if !UseContactManagement or version < 18.0.3
    // delete locationcontacts where gpcontacttype = Signature
    var deferred = $.Deferred();

    var version = setupOptions.CompanyDatabaseVersion.split(".");
    var year = parseInt(version[0]);
    var major = parseInt(version[1]);
    var minor = parseInt(version[2]);
    var beforeVersion = (year < 18 || (year === 18 && major === 0 && minor < 3));

    if (!setupOptions.UseContactManagement || beforeVersion)
        deleteSignatureLocationContacts().then(
            function (count) { return deferred.resolve("Deleted Location Contacts: " + count); },
            function (err) { return deferred.reject(err); }
        );
    else
        return deferred.resolve("Do not delete contacts");
    return deferred.promise();
}
function deleteSignatureLocationContacts() {
    var deferred = $.Deferred();

    fetchSignatureLocationContacts().then(function (contactsToDelete) {
        var itemsDeferred = [];
        $(contactsToDelete).each(function (i, contact) {
            itemsDeferred.push(deleteContact(contact));
        });

        $.when.apply($, itemsDeferred).then(function () {
            return deferred.resolve(contactsToDelete.length);
        }, function (err) { return deferred.reject(err); });
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchSignatureLocationContacts() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.locationcontact.name);
    entity.addAttribute('id');
    entity.addFilter().where('gpcontacttype', 'eq', "Signature");

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (res) { return deferred.resolve(res); },
        function (err) { return deferred.reject(err); }
    );
    return deferred.promise();
}
function deleteContact(contact) {
    var deferred = $.Deferred();
    if (!contact)
        return deferred.resolve();

    MobileCRM.DynamicEntity.deleteById("locationcontact", contact.id,
        function () { return deferred.resolve(); },
        function (err) { return deferred.reject(err); }
    );
    return deferred.promise();
}

function fetchSystemUser() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.systemuser.name);
    entity.addAttribute('id');
    entity.addAttribute('gptechnicianid');
    entity.addAttribute('internalemailaddress');

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return res[0] ? deferred.resolve(res[0]) : deferred.reject("System User Not Found");
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function checkIsInternal() {
    var deferred = $.Deferred();
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        return deferred.resolve(entityForm.entity.properties.isinternal);
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}