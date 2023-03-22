//============== ENUM ================
const CostType = {
    Labor: 1,
    Expense: 2,
    Travel: 3
};
const FormCaption = {
    1: "Labor",
    2: "Expenses",
    3: "Travel"
};
const QuantityLabel = {
    1: "Quantity",
    2: "Quantity",
    3: "Units"
};
const TransactionStatus = {
    0: "Transferring",
    1: "Pending",
    2: "Approved",
    3: "Rejected",
    4: "Hold"
};
var locAlert = { FmtFieldNotZero: " cannot be zero." };
var isTransferTravel = false;

//============== LOAD OPTIONS ================
function loadFormOptions() {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        selected[entityName] = entityForm.entity.properties;
        selected.employee = selected[entityName].employeeid;
        selected.appointment = selected[entityName].appointmentid;
        if (selected.appointment && selected.appointment.id === '00000000-0000-0000-0000-000000000000') {
            selected.appointment = null;
        }

        if (entityForm.iFrameOptions && entityForm.iFrameOptions.transferTravel) {
            isTransferTravel = true;
            selected.transferTravel = entityForm.iFrameOptions.transferTravel;
        }

        hasTimelog = (!entityForm.entity.isNew || (isTransferTravel && selected.appointment)) &&
            typeof selected[entityName].gptimein != 'undefined' && selected[entityName].gptimein.getFullYear() > 1900;

        isTechActivity = selected.appointment && selected[entityName].transactiontype === "UNBILLED";

        entityForm.form.caption = FormCaption[parseInt(selected[entityName].costtype)];
        isProcessed = JSON.parse(selected[entityName].isprocessed);
        isRejected = parseInt(selected[entityName].transactionstatus) === 3;
        isEditable = !isProcessed || (isProcessed && isRejected && setupOptions.UseManagerApproval) || (isProcessed && isTransferTravel);

        loadFormItems(entityForm);
    }, MobileCRM.bridge.alert);
}
function loadFormItems(entityForm) {
    // Load Form Items
    var detailView = entityForm.getDetailView(entityName);
    var formItems = [];

    $(detailView.items).each(function (index, item) {
        item.isEnabled = isEditable;    // Can't disable form via Woodford Rules because need to check setup option
        formItems[item.name] = item;
    });

    // Set Form Item Visibility
    formItems.gptimein.isVisible = hasTimelog;
    formItems.gptimeout.isVisible = hasTimelog;
    formItems.transactiondate.isVisible = !hasTimelog;
    formItems.hoursunits.isVisible = selected[entityName].costtype === CostType.Labor;
    formItems.cost.isVisible = selected[entityName].costtype === CostType.Expense;
    formItems.quantity.isVisible = selected[entityName].costtype !== CostType.Labor;
    formItems.managercomment.isVisible = setupOptions.UseManagerApproval && isRejected;

    // Enable Form Items
    formItems.employeeid.isEnabled = setupOptions.UseTechnicianHelper && entityForm.entity.isNew &&
        (!selected.appointment || selected[entityName].transactiontype !== "UNBILLED");
    formItems.gptimein.isEnabled = isEditable && (hasTimelog && !setupOptions.TimeLogLockTimeInTimeOut);
    formItems.gptimeout.isEnabled = isEditable && (hasTimelog && !setupOptions.TimeLogLockTimeInTimeOut);
    formItems.hoursunits.isEnabled = isEditable && (!hasTimelog || (hasTimelog && !setupOptions.TimeLogLockLaborTime));

    // Set Form Item Options    
    formItems.gptimein.label = "Time In";
    formItems.gptimeout.label = "Time Out";
    formItems.transactiondate.parts = 1;
    formItems.transactiondate.isNullable = false;
    if (isEditable && entityForm.entity.isNew && !hasTimelog) {
        var now = new Date();
        var todayNoon = new Date(now.setHours(12, 0, 0));
        entityForm.entity.properties.transactiondate = new Date(todayNoon);
    }

    formItems.hoursunits.minimum = -24;
    formItems.hoursunits.maximum = 24;
    formItems.hoursunits.increment = (hasTimelog && setupOptions.TimeLogRoundingInterval) ?
        parseFloat(setupOptions.TimeLogRoundingInterval) / 60 : 0.25;
    formItems.hoursunits.upDownVisible = formItems.hoursunits.isEnabled;
    formItems.hoursunits.decimalPlaces = 2;

    formItems.cost.minimum = 0;
    formItems.cost.increment = 0.25;
    formItems.cost.upDownVisible = formItems.cost.isEnabled;
    formItems.cost.decimalPlaces = 2;
    formItems.cost.displayFormat = "{0:C}";

    if (selected[entityName].costtype === CostType.Travel && hasTimelog) {
        formItems.quantity.label = MobileCRM.Localization.get("laborexpense.TravelTimeLog.quantity");
    }
    else {
        formItems.quantity.label = QuantityLabel[selected[entityName].costtype];
    }
    formItems.quantity.minimum = 0;
    formItems.quantity.increment = selected[entityName].costtype === CostType.Travel ? 0.25 : 1;
    formItems.quantity.upDownVisible = formItems.quantity.isEnabled;
    formItems.quantity.decimalPlaces = 2;

    formItems.description.maxLength =
        (isTechActivity && entityForm.iFrameOptions && entityForm.iFrameOptions.setComplete) ? 51 : 32767;
    formItems.managercomment.isEnabled = false;

    // Create Form Items
    createEntryTypeFormItem().then(function () {
        if (!entityForm.entity.isNew && setupOptions.UseManagerApproval)
            createTransactionStatusFormItem().then(loadFormItems_TransactionType, MobileCRM.bridge.alert);
        else
            loadFormItems_TransactionType();
    }, MobileCRM.bridge.alert);
}

function createEntryTypeFormItem() {
    var deferred = $.Deferred();
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var detailView = entityForm.getDetailView(entityName);
        var entryTypeItem = detailView.getItemByName("entryType");
        var prefix = entityForm.entity.properties.transactiontype === "UNBILLED" ? "Unbilled " : "";

        if (entryTypeItem) {
            entryTypeItem.value = selected[entityName].costtype;
            entryTypeItem.isEnabled = entityForm.entity.isNew && !isTechActivity && !isTransferTravel;
            return deferred.resolve();
        }
        else {
            entryTypeItem = new MobileCRM.UI.DetailViewItems.ComboBoxItem("entryType", "Entry Type");
            var listDataSource = {};
            if (setupOptions.UseLabor)
                listDataSource[prefix + "Labor"] = CostType.Labor;
            if (setupOptions.UseExpense)
                listDataSource[prefix + "Expense"] = CostType.Expense;
            if (setupOptions.UseTravel)
                listDataSource[prefix + "Travel"] = CostType.Travel;

            entryTypeItem.listDataSource = listDataSource;
            entryTypeItem.value = selected[entityName].costtype;
            entryTypeItem.isEnabled = entityForm.entity.isNew && !isTechActivity && !isTransferTravel;
            detailView.insertItem(entryTypeItem, 0);
            return deferred.resolve();
        }
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function createAppointmentTextFormItem() {
    var deferred = $.Deferred();
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var detailView = entityForm.getDetailView(entityName);
        var apptTextFormItem = detailView.getItemByName("appointmentText");

        var apptText = entityForm.entity.properties.gpjobnumber ? entityForm.entity.properties.gpjobnumber :
            selected.appointment ? selected.appointment.primaryName : "";
        apptText += entityForm.entity.properties.gpjobnumber && entityForm.entity.properties.gpappointmentid ?
            ":" + entityForm.entity.properties.gpappointmentid : "";

        var formItemLabel = entityForm.entity.properties.gpjobnumber && !entityForm.entity.properties.gpappointmentid ?
            MobileCRM.Localization.get(entityForm.entity.properties.transactiontype === "SERVICE" ? SCHEMA.servicecall.name : SCHEMA.job.name) :
            MobileCRM.Localization.get(SCHEMA.appointment.name);

        if (apptTextFormItem) {
            apptTextFormItem.value = apptText;
            apptTextFormItem.label = formItemLabel;
            return deferred.resolve();
        }
        else {
            apptTextFormItem = new MobileCRM.UI.DetailViewItems.TextBoxItem("appointmentText", "Appointment");
            apptTextFormItem.value = apptText;
            apptTextFormItem.label = formItemLabel;
            apptTextFormItem.isEnabled = false;
            detailView.insertItem(apptTextFormItem, detailView.getItemIndex("appointmentid"));
            return deferred.resolve();
        }
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function createAppointmentStatusFormItem() {
    var deferred = $.Deferred();
    fetchAppointmentStatus().then(function (apptStatusData) {
        MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
            var detailView = entityForm.getDetailView(entityName);
            var apptStatusFormItem = detailView.getItemByName("appointmentstatusid");

            if (apptStatusFormItem)
                detailView.removeItem(detailView.getItemIndex("appointmentstatusid"));

            var isComplete = false;
            if (apptStatusData.COMPLETE && apptStatusData.COMPLETE !== selected.appoinmentstatusid) {
                // remove complete as an option
                isComplete = true;

            }
            apptStatusFormItem = new MobileCRM.UI.DetailViewItems.ComboBoxItem("appointmentstatusid", "Appointment Status");
            apptStatusFormItem.listDataSource = apptStatusData;
            apptStatusFormItem.value = selected.appointmentstatusid;
            apptStatusFormItem.isEnabled = !isComplete;

            detailView.insertItem(apptStatusFormItem, detailView.getItemIndex("appointmentid") + 1);
            return deferred.resolve();
        }, MobileCRM.bridge.alert);
    }, MobileCRM.bridge.alert);
    return deferred.promise();
}
function createTransactionStatusFormItem() {
    var deferred = $.Deferred();
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var detailView = entityForm.getDetailView(entityName);
        var statusFormItem = detailView.getItemByName("transactionStatus");

        if (statusFormItem) {
            statusFormItem.value = TransactionStatus[selected[entityName].transactionstatus];
            statusFormItem.isEnabled = false;
            return deferred.resolve();
        }
        else {
            statusFormItem = new MobileCRM.UI.DetailViewItems.TextBoxItem("transactionStatus", "Status");
            statusFormItem.value = TransactionStatus[selected[entityName].transactionstatus];
            statusFormItem.numberOfLines = 1;
            statusFormItem.isEnabled = false;
            detailView.insertItem(statusFormItem, detailView.getItemIndex('managercomment') + 1);
            return deferred.resolve();
        }
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

//============== LOAD DATA ================
function loadCurrentEmployee() {
    var deferred = $.Deferred();
    fetchCurrentEmployee().then(function (employee) {
        MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
            entityForm.entity.properties.employeeid = employee;
            selected.employee = employee.properties;

            var employeeItem = entityForm.getDetailView(entityName).getItemByName('employeeid');
            employeeItem.validate = false;
            employeeItem.errorMessage = null;

            return deferred.resolve();
        }, function (err) { return deferred.reject(err); });
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchCurrentEmployee() {
    var deferred = $.Deferred();

    getEmployeeID(function (gpemployeeid) {
        var entity = new MobileCRM.FetchXml.Entity(SCHEMA.employee.name);
        entity.addAttributes();
        entity.addFilter().where('gpemployeeid', 'eq', gpemployeeid);

        var fetch = new MobileCRM.FetchXml.Fetch(entity);
        fetch.execute("DynamicEntities", function (res) {
            if (res[0])
                return deferred.resolve(res[0]);
            else
                return deferred.reject("Unable to load Current Employee");
        }, function (err) { return deferred.reject(err); });
    });
    return deferred.promise();
}

function loadAppointmentData() {
    var deferred = $.Deferred();
    if (!selected.appointment)
        return deferred.reject("Unable to load Appointment Details");

    MobileCRM.DynamicEntity.loadById(SCHEMA.appointment.name, selected.appointment.id, function (apptEntity) {
        selected.appointment = apptEntity.properties;
        selected.appointmentstatusid = apptEntity.properties.appointmentstatusid.id;

        MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
            entityForm.entity.properties.gpappointmentid = selected.appointment.gpappointmentid;

            if (selected.appointment.gpappointmenttype === 1) {
                entityForm.entity.properties.gpjobnumber = selected.appointment.gpservicecallid;
                entityForm.entity.properties.name =
                    entityForm.entity.properties.transactiontype + " : " + entityForm.entity.properties.gpjobnumber;
            }
            else if (selected.appointment.gpappointmenttype === 2) {
                entityForm.entity.properties.gpjobnumber = selected.appointment.gpactivityid;
                entityForm.entity.properties.name = "TECH ACTIVITY : " + selected.appointment.gpappointmentid;
            }
            else if (selected.appointment.gpappointmenttype === 3) {
                entityForm.entity.properties.gpjobnumber = selected.appointment.gpjobnumber;
                entityForm.entity.properties.name = "JOB : " + selected.appointment.gpjobnumber;
            }
            return deferred.resolve();
        }, function (err) { return deferred.reject(err); });

    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchAppointmentStatus() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.appointmentstatus.name);
    entity.addAttribute('id');
    entity.addAttribute('name');
    entity.orderBy('name');

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        var apptStatusData = {};
        $(res).each(function (index, status) {
            if ((status.name === "DEFAULT" && selected.appointmentstatusid === status.id) ||
                (status.name === "COMPLETE" && status.id === selected.appointmentstatusid) ||
                (status.name !== "DEFAULT" && status.name !== "COMPLETE"))
                apptStatusData[status.name] = status.id;
        });

        return deferred.resolve(apptStatusData);

    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

function fetchPayCode() {
    var deferred = $.Deferred();
    if (!selected.employee) {
        // Clear out paycode
        var fetch = "<fetch version='1.0'><entity name='paycode'><filter type='and'>" +
            "<condition attribute='id' operator='null' value='null' />" +
            "</filter></entity></fetch>";

        addFetchFilter("paycodeid", "paycode", fetch, entityName);
        return deferred.resolve();
    }
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var paycodetypeOperator = parseInt(entityForm.entity.properties.costtype) === 1 ? "ne" : "eq";
        var billtypeValue = entityForm.entity.properties.transactiontype === "UNBILLED" ? 1 : 2

        var fetch = "<fetch version='1.0'><entity name='paycode'><filter type='and'>" +
            "<condition attribute='employeeid' operator='eq' value='" + selected.employee.id + "' />" +
            "<condition attribute='paycodetype' operator='" + paycodetypeOperator + "' value='5' />" +
            "<condition attribute='billtype' operator='ne' value='" + billtypeValue + "' />" +
            "</filter></entity></fetch>";

        addFetchFilter("paycodeid", "paycode", fetch, entityName);
        return deferred.resolve();
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function setDefaultBilledPayCode() {
    if (selected[entityName].paycodeid && selected[entityName].paycodeid.id !== '00000000-0000-0000-0000-000000000000')
        return; // Already has pay code, do not load default value

    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var paycodeName = null;
        switch (parseInt(entityForm.entity.properties.costtype)) {
            case CostType.Labor:
                paycodeName = SETUPOPTION.DefaultBilledHourlyPayCode;
                break;
            case CostType.Expense:
                paycodeName = SETUPOPTION.DefaultBilledExpensePayCode;
                break;
            case CostType.Travel:
                paycodeName = SETUPOPTION.DefaultBilledTravelPayCode;
                break;
        }

        fetchDefaultPayCode(paycodeName).then(function (defaultValue) {
            if (defaultValue && selected.employee) {
                var entity = new MobileCRM.FetchXml.Entity(SCHEMA.paycode.name);
                entity.addAttribute('id');

                entity.addFilter().where('employeeid', 'eq', selected.employee.id);
                entity.addFilter().where('gppaycodeid', 'eq', defaultValue);
                entity.filter.type = 'and';

                var fetch = new MobileCRM.FetchXml.Fetch(entity);
                fetch.execute("JSON", function (res) {
                    if (res[0])
                        MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
                            var formItem = entityForm.getDetailView(entityName).getItemByName("paycodeid");
                            formItem.value = new MobileCRM.DynamicEntity("paycode", res[0].id);
                        }, MobileCRM.bridge.alert);

                }, MobileCRM.bridge.alert);
            }
        }, MobileCRM.bridge.alert);
    }, MobileCRM.bridge.alert);
}
function setDefaultUnbilledPayCode() {
    if (selected[entityName].paycodeid && selected[entityName].paycodeid.id !== '00000000-0000-0000-0000-000000000000')
        return; // Already has pay code, do not load default value

    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var paycodeName = null;
        switch (parseInt(entityForm.entity.properties.costtype)) {
            case CostType.Labor:
                paycodeName = SETUPOPTION.DefaultUnbilledHourlyPayCode;
                break;
            case CostType.Expense:
                paycodeName = SETUPOPTION.DefaultUnbilledExpensePayCode;
                break;
            case CostType.Travel:
                paycodeName = SETUPOPTION.DefaultUnbilledTravelPayCode;
                break;
        }

        fetchDefaultPayCode(paycodeName).then(function (defaultValue) {
            if (defaultValue && selected.employee) {
                var entity = new MobileCRM.FetchXml.Entity(SCHEMA.paycode.name);
                entity.addAttribute('id');

                entity.addFilter().where('employeeid', 'eq', selected.employee.id);
                entity.addFilter().where('gppaycodeid', 'eq', defaultValue);
                entity.filter.type = 'and';

                var fetch = new MobileCRM.FetchXml.Fetch(entity);
                fetch.execute("JSON", function (res) {
                    if (res[0])
                        MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
                            var formItem = entityForm.getDetailView(entityName).getItemByName("paycodeid");
                            formItem.value = new MobileCRM.DynamicEntity("paycode", res[0].id);
                        }, MobileCRM.bridge.alert);
                }, MobileCRM.bridge.alert);
            }
        }, MobileCRM.bridge.alert);
    }, MobileCRM.bridge.alert);
}
function fetchDefaultPayCode(name) {
    var deferred = $.Deferred();
    if (!name)
        return deferred.reject("Unable to fetch default paycode: Missing Name");

    fetchSystemUser().then(function (systemuser) {
        fetchSetupOptionUser(name, systemuser.id).then(function (optionvalue) {
            return deferred.resolve(optionvalue ? optionvalue : setupOptions[name]);
        }, function (err) { return deferred.reject(err); });
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchSystemUser() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.systemuser.name);
    entity.addAttribute('id');

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return res[0] ? deferred.resolve(res[0]) : deferred.reject("System User Not Found");
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchSetupOptionUser(name, systemuserID) {
    var deferred = $.Deferred();
    if (!name)
        return deferred.reject("Unable to fetch setupoptionuser: Missing Name");
    if (!systemuserID)
        return deferred.reject("Unable to fetch setupoptionuser: Missing System User ID");

    var entity = new MobileCRM.FetchXml.Entity('setupoptionuser');
    entity.addAttribute('optionvalue');
    entity.orderBy('modifiedon', true); // Need last modified optionvalue

    entity.addFilter().where('name', 'eq', name);
    entity.addFilter().where('ownerid', 'eq', systemuserID);
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res[0] ? res[0].optionvalue : null);
    }, function (err) { return deferred.reject("Unable to fetch setupoptionuser: " + err); });
    return deferred.promise();
}

function setMinMaxDates() {
    var deferred = $.Deferred();
    // Determine date min/max values (same or previous work week)
    weekEndInt = -1;
    switch (setupOptions.DefaultWeekday) {
        case "SUNDAY": weekEndInt = 0; break;
        case "MONDAY": weekEndInt = 1; break;
        case "TUESDAY": weekEndInt = 2; break;
        case "WEDNESDAY": weekEndInt = 3; break;
        case "THURSDAY": weekEndInt = 4; break;
        case "FRIDAY": weekEndInt = 5; break;
        default: weekEndInt = 6;
    }
    currentDate = (new Date()).getDate();
    currentWeekDay = (new Date()).getDay();    // Sunday = 0
    today = ((currentWeekDay - weekEndInt) + 7 + 1) % 7;

    diffToEnd = (7 + 1 - today) % 7;
    diffToBegin = 13 - diffToEnd;

    // Set Date
    minDate = (new Date()).setDate(currentDate - diffToBegin);
    maxDate = (new Date()).setDate(currentDate + diffToEnd);
    // Set Hours
    minDate = (new Date(minDate)).setHours(0, 0, 0, 0);
    maxDate = (new Date(maxDate)).setHours(23, 59, 0, 0);

    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var detailView = entityForm.getDetailView(entityName);

        if (hasTimelog) {
            var gptimeinItem = detailView.getItemByName("gptimein");
            gptimeinItem.minimum = new Date(minDate);
            gptimeinItem.maximum = new Date(maxDate);

            var gptimeoutItem = detailView.getItemByName("gptimeout");
            gptimeoutItem.minimum = new Date(minDate);
            gptimeoutItem.maximum = new Date(maxDate);
            return deferred.resolve();
        }
        else {
            var transactiondateItem = detailView.getItemByName("transactiondate");
            transactiondateItem.minimum = new Date(minDate);
            transactiondateItem.maximum = new Date(maxDate);

            var lessThanMin = transactiondateItem.value < transactiondateItem.minimum;
            var greaterThanMax = transactiondateItem.value > transactiondateItem.maximum;
            if (lessThanMin || greaterThanMax) {
                transactiondateItem.errorMessage = transactiondateItem.label + dateOutOfRangeMsg;
            }
            return deferred.resolve();
        }
    }, function (err) { return deferred.reject("Set Min/Max Dates Error: " + err); });
    return deferred.promise();
}

function setHoursUnits() {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        if (entityForm.entity.isNew) {
            entityForm.entity.properties.hoursunits = selected.appointment && selected.appointment.estimatehours ? parseFloat(selected.appointment.estimatehours) : 0;
        }
    }, MobileCRM.bridge.alert);
}

function fetchTransferTimeLog(travelLaborexpenseID) {
    var deferred = $.Deferred();
    if (!travelLaborexpenseID) {
        return deferred.reject("Fetch Transfer TimeLog Error: Missing Travel Time Entry Details");
    }

    try {
        var entity = new MobileCRM.FetchXml.Entity(SCHEMA.timelog.name);
        entity.addAttribute(SCHEMA.timelog.Properties.id);

        entity.addFilter().where(SCHEMA.timelog.Properties.laborexpenseid, 'eq', travelLaborexpenseID);
        entity.addFilter().startsWith(SCHEMA.timelog.Properties.name, "Travel");
        entity.filter.type = 'and';

        var fetch = new MobileCRM.FetchXml.Fetch(entity);
        fetch.execute("JSON", function (res) {
            if (res.length === 1) {
                return deferred.resolve(res[0].id);
            }
            else {
                return deferred.reject("Fetch Transfer Time Log Error: Fetch returned " + res.length + " results");
            }
        }, function (err) {
            return deferred.reject("Fetch Transfer TimeLog Error: " + err);
        });
    }
    catch (e) {
        return deferred.reject("Fetch Transfer TimeLog Error: " + e);
    }
    return deferred.promise();
}

//============== FORM ITEM FUNCTIONS ================
function formValueChanged(entityForm) {
    var detailView = entityForm.getDetailView(entityName);

    switch (entityForm.context.changedItem) {
        case "entryType":
            entryTypeChanged(parseInt(detailView.getItemByName("entryType").value));
            break;
        case "employeeid":
            selected.employee = entityForm.entity.properties.employeeid;
            entityForm.entity.properties.paycodeid = null;
            if (entityForm.entity.properties.transactiontype === "UNBILLED")
                fetchPayCode().then(setDefaultUnbilledPayCode, MobileCRM.bridge.alert);
            else
                fetchPayCode().then(setDefaultBilledPayCode, MobileCRM.bridge.alert);
            break;
        case "^BtnWorkCrew":
            btnWorkCrewClicked();
            detailView.getItemByName("^BtnWorkCrew").clickText = "Work Crew";
            break;
        case "appointmentstatusid":
            selected.appointmentstatusid = detailView.getItemByName("appointmentstatusid").value;
            entityForm.isDirty = true;
            break;
        case "gptimein":
        case "gptimeout":
            // Time must be between current or previous work week
            // Round Time To Interval
            var time = validateTime(detailView.getItemByName(entityForm.context.changedItem));
            entityForm.entity.properties[entityForm.context.changedItem] = time;

            // Update Hours
            var laborHrs = roundHoursToInterval(
                ((entityForm.entity.properties.gptimeout - entityForm.entity.properties.gptimein) / 1000) / 3600
            );
            entityForm.entity.properties.hoursunits = laborHrs;

            detailView.getItemByName(entityForm.context.changedItem).errorMessage = null;
            detailView.getItemByName('hoursunits').errorMessage = null;
            break;
        case "transactiondate":
            var time = validateTime(detailView.getItemByName(entityForm.context.changedItem));
            if (!hasTimelog) {
                entityForm.entity.properties.transactiondate = new Date(time.setHours(12, 0, 0));
            }

            detailView.getItemByName(entityForm.context.changedItem).errorMessage = null;
            break;
        case "hoursunits":
            if (hasTimelog) {
                // Round Hours to Interval
                var laborHrs = roundHoursToInterval(detailView.getItemByName(entityForm.context.changedItem).value);
                entityForm.entity.properties.hoursunits = laborHrs;

                // Update Time Out
                var timeIn = new Date(entityForm.entity.properties.gptimein);
                var timeOut = timeIn.setMinutes(timeIn.getMinutes() + laborHrs * 60);
                entityForm.entity.properties.gptimeout = new Date(timeOut);
                detailView.getItemByName('gptimeout').errorMessage = null;
                detailView.getItemByName('hoursunits').errorMessage = null;
            }
        case "cost":
        case "quantity":
            var formItem = detailView.getItemByName(entityForm.context.changedItem);
            formItem.validate = formItem.isVisible;
            formItem.errorMessage = formItem.validate && formItem.value === 0 ? formItem.label + locAlert.FmtFieldNotZero : '';
            break;
        case "jobcostcodeid":
            if (entityForm.entity.properties.jobcostcodeid) {
                setCostCodeAlias(entityForm.entity.properties.jobcostcodeid.id);
            }
            break;
    }
}
function entryTypeChanged(entryType) {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var detailView = entityForm.getDetailView(entityName);
        entityForm.entity.properties.costtype = entryType;
        entityForm.entity.properties.paycodeid = null;
        entityForm.form.caption = FormCaption[entryType];

        var hoursunitsItem = detailView.getItemByName('hoursunits');
        var costItem = detailView.getItemByName('cost');
        var quantityItem = detailView.getItemByName('quantity');

        // Reset entity values
        hoursunitsItem.value = 0;
        costItem.value = 0;
        quantityItem.value = 0;

        // Update form items
        if (entryType !== CostType.Labor) {
            quantityItem.label = QuantityLabel[entryType];
            quantityItem.increment = entryType === CostType.Travel ? 0.25 : 1;
        }

        hoursunitsItem.isVisible = !hasTimelog && entryType === CostType.Labor;
        costItem.isVisible = entryType === CostType.Expense;
        quantityItem.isVisible = entryType !== CostType.Labor;

        $([hoursunitsItem, costItem, quantityItem]).each(function (i, item) {
            item.validate = item.isVisible;
            item.errorMessage = item.isVisible && item.value === 0 ? item.label + locAlert.FmtFieldNotZero : '';
        });

        entryTypeChanged_TransactionType(entityForm, entryType);
    }, MobileCRM.bridge.alert);
}

function validateTime(formItem) {
    var lessThanMin = formItem.value < formItem.minimum;
    var greaterThanMax = formItem.value > formItem.maximum;

    if (lessThanMin || greaterThanMax) {
        formItem.value = lessThanMin ? formItem.minimum : formItem.maximum;
        MobileCRM.UI.MessageBox.sayText(
            formItem.label + dateOutOfRangeMsg, function () { });
        return formItem.value;
    }
    else if (hasTimelog) {
        var date = formItem.value;
        var minuteStep = setupOptions.TimeLogRoundingInterval ? parseFloat(setupOptions.TimeLogRoundingInterval) : 15;
        date.setMinutes(Math.round(date.getMinutes() / minuteStep) * minuteStep);
        return date;
    }
    else
        return formItem.value;
}
function roundHoursToInterval(hours) {
    var minuteStep = setupOptions.TimeLogRoundingInterval ? parseFloat(setupOptions.TimeLogRoundingInterval) : 15;
    var minuteInterval = (hours * 60) / minuteStep;
    var remainder = minuteInterval - parseInt(minuteInterval);

    if (remainder > 0)
        hours = parseInt((remainder < 0.5 ? minuteInterval : minuteInterval + 1)) * minuteStep / 60;

    return hours > 24 ? 24 : (hours < 0 ? 0 : hours);
}

function btnWorkCrewClicked() {
    loseFormFocus().then(function () {
        validateForm().then(function (errorMsg) {
            if (errorMsg)
                MobileCRM.bridge.alert(errorMsg);
            else
                showWorkCrewLookup();
        });
    });
}
function validateForm() {
    var deferred = $.Deferred();
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var detailView = entityForm.getDetailView(entityName);
        detailView.getItemByName('appointmentText').isEnabled = false;   // Need to disable after loseFormFocus()
        var validationItems = ['costcodeid', 'jobcostcodeid', 'paycodeid', 'hoursunits', 'cost', 'quantity'];

        $(validationItems).each(function (index, item) {
            var formItem = detailView.getItemByName(item);
            if (index <= 2 && formItem && formItem.errorMessage) {  // Mising Value
                return deferred.resolve(formItem.errorMessage);
            }
            else if (formItem && formItem.isVisible && formItem.value === 0) { // Check Zero Value                
                formItem.errorMessage = formItem.label + locAlert.FmtFieldNotZero;
                return deferred.resolve(formItem.errorMessage);
            }
        });

        return deferred.resolve();
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function loseFormFocus() {
    var deferred = $.Deferred();
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var detailView = entityForm.getDetailView(entityName);
        detailView.getItemByName('appointmentText').isEnabled = true;
        detailView.startEditItem(detailView.getItemIndex('appointmentText'));
        // Re-disable form item in validateForm()
        return deferred.resolve();
    }, MobileCRM.bridge.alert);
    return deferred.promise();
}

function showWorkCrewLookup() {
    var lookupForm = new MobileCRM.UI.LookupForm();
    var fetch = "<fetch><entity name='workcrew'/></fetch>";
    lookupForm.addEntityFilter("workcrew", fetch);
    lookupForm.allowNull = false;
    lookupForm.addView("workcrew", "Default");
    lookupForm.show(workCrewSelected, MobileCRM.bridge.alert, null);
}
function workCrewSelected(workCrew) {
    selected.workcrew = workCrew;
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        MobileCRM.DynamicEntity.loadById('paycode', entityForm.entity.properties.paycodeid.id, function (paycode) {
            MobileCRM.UI.IFrameForm.show("Work Crew Employees",
                "file://entity/workcrewemployee/workcrewemployee-list.html", false,
                options = {
                    laborexpenseID: entityForm.entity.id,
                    workCrewID: selected.workcrew.id,
                    selectedEmployeeID: selected.employee.id,
                    gppaycodeid: paycode.properties.gppaycodeid
                }
            );
        }, MobileCRM.bridge.alert);
    }, MobileCRM.bridge.alert);
}
function saveWorkCrew(employeeList) {
    createWorkCrewEntity()
        .then(function (workcrewProperties) {
            $(employeeList).each(function (i, workcrewEmployee) {
                var entity = new MobileCRM.DynamicEntity('laborexpense');

                entity.properties.workcrewid = workcrewProperties.workcrewid;
                entity.properties.name = workcrewProperties.name;
                entity.properties.transactiontype = workcrewProperties.transactiontype;
                entity.properties.costtype = workcrewProperties.costtype;
                entity.properties.transactionstatus = 1;

                entity.properties.appointmentid = workcrewProperties.appointmentid;
                entity.properties.gpappointmentid = workcrewProperties.gpappointmentid;
                entity.properties.gpjobnumber = workcrewProperties.gpjobnumber;

                entity.properties.transactiondate = workcrewProperties.transactiondate;
                entity.properties.hoursunits = workcrewProperties.hoursunits;
                entity.properties.cost = workcrewProperties.cost;
                entity.properties.quantity = workcrewProperties.quantity;

                entity.properties.equipmentid = workcrewProperties.equipmentid;
                entity.properties.gpequipmentid = workcrewProperties.gpequipmentid;

                entity.properties.costcodeid = workcrewProperties.costcodeid;
                entity.properties.jobcostcodeid = workcrewProperties.jobcostcodeid;
                entity.properties.costcodealias = workcrewProperties.costcodealias;

                entity.properties.description = workcrewProperties.description;

                entity.properties.employeeid = new MobileCRM.DynamicEntity('employee', workcrewEmployee.employeeid.id);
                entity.properties.paycodeid = new MobileCRM.DynamicEntity('paycode', workcrewEmployee['paycode.id']);

                entity.save(function (err) {
                    if (err)
                        MobileCRM.bridge.alert(err);
                    else if (i === employeeList.length - 1)
                        updateAppointment();
                });
            });
        }, MobileCRM.bridge.alert);
}

//============== TOOLBAR FUNCTIONS ================
function btnSaveClicked(entityForm) {
    try {
        saveHandler = entityForm.suspendSave();
        loading = MobileCRM.UI.EntityForm.showPleaseWait(MobileCRM.Localization.get("Msg.Loading"))
        MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
            var detailView = entityForm.getDetailView(entityName);
            var entityProps = entityForm.entity.properties;

            if (!setupOptions.UseManagerApproval && isRejected)
                setCleanAndClose();

            // Validate values are > 0            
            if (entityProps.costtype === CostType.Labor && entityProps.hoursunits === 0)
                alertOnSave(detailView.getItemByName("hoursunits").label + locAlert.FmtFieldNotZero);
            else if (entityProps.costtype === CostType.Expense && entityProps.cost === 0)
                alertOnSave(detailView.getItemByName("cost").label + locAlert.FmtFieldNotZero);
            else if ((entityProps.costtype === CostType.Expense && entityProps.quantity === 0) ||
                (entityProps.costtype === CostType.Travel && entityProps.quantity === 0))
                alertOnSave(detailView.getItemByName("quantity").label + locAlert.FmtFieldNotZero);

            // Validate TimeLog Details                
            else if (hasTimelog && entityProps.gptimein > entityProps.gptimeout) {
                var msg = "Time Out must be after Time In";
                detailView.getItemByName('gptimeout').errorMessage = msg;
                alertOnSave(msg);
            }
            else if (hasTimelog && !setupOptions.TimeLogAllowTimeOverlap) {
                checkTimeOverlap(entityProps.gptimein, entityProps.gptimeout);
            }

            // Validate Appointment 
            else if (entityProps.appointmentid && entityProps.appointmentid.id === '00000000-0000-0000-0000-000000000000') {
                MobileCRM.DynamicEntity.loadById(entityName, entityProps.id, function (laborexpense) {
                    laborexpense.properties.appointmentid = null;
                    laborexpense.save(function (err) {
                        if (err) {
                            alertOnSave(err);
                        }
                        else {
                            continueSaveExecution();
                        }
                    });
                }, function (err) {
                    alertOnSave(err);
                });
            }

            // Continue
            else
                continueSaveExecution();
        }, MobileCRM.bridge.alert);
    }
    catch (e) { MobileCRM.bridge.alert("Save Error: " + e); }
}
function continueSaveExecution() {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        if (entityForm.entity.isNew)
            createEntity(entityForm);
        else if (isRejected)
            updateRejectedEntity(entityForm);
        else
            updateEntity(entityForm);
    }, MobileCRM.bridge.alert);
}

function checkTimeOverlap(timein, timeout) {
    fetchTimeOverlapTimeLogs(timein, timeout).then(function (timelogs) {
        if (timelogs.length > 0) {
            var filteredData = new DevExpress.data.DataSource({
                store: timelogs,
                filter: [
                    ['gptimein', '>', timein],
                    'or'
                    ['gptimeout', '<', timeout],
                    'or',
                    [
                        ['gptimein', '<', timein],
                        'and',
                        ['gptimeout', '>', timeout]
                    ]
                ],
                paginate: false
            });
            filteredData.load().done(function (overlapData) {
                if (overlapData.length > 0)
                    alertOnSave("Time Overlap Not Allowed");
                else
                    continueSaveExecution();
            });
        }
        else
            continueSaveExecution();
    }, alertOnSave);
}
function fetchTimeOverlapTimeLogs(timein, timeout) {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.timelog.name);
    entity.addAttribute('gptimein');
    entity.addAttribute('gptimeout');

    entity.addFilter().where('laborexpenseid', 'ne', selected[entityName].id);
    entity.addFilter().where('gptimein', 'le', timeout);
    entity.addFilter().where('gptimeout', 'ge', timein);
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        res.forEach(function (item) {
            item.gptimein = new Date(item.gptimein);
            item.gptimeout = new Date(item.gptimeout);
        });

        return deferred.resolve(res);
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

function btnDeleteClicked(entityForm) {
    var confirmPopup = new MobileCRM.UI.MessageBox(MobileCRM.Localization.get("Alert.ConfirmDelete"));
    confirmPopup.multiLine = true;
    confirmPopup.items = ["Yes", "No"];
    confirmPopup.show(function (button) {
        if (button === "Yes") {
            deleteCorrespondingAttachments(selected.laborexpense.id).then(function () {
                if (entityForm.entity.isNew) {
                    if (entityForm.entity.properties.transactiontype === "UNBILLED") {
                        checkResetApptStatus();
                    }
                    else {
                        setCleanAndClose();
                    }
                }
                else {
                    MobileCRM.DynamicEntity.deleteById("laborexpense", selected[entityName].id, function () {
                        if (hasTimelog)
                            deleteCorrespondingTimelog().then(function () {
                                if (entityForm.entity.properties.transactiontype === "UNBILLED")
                                    checkResetApptStatus();
                                else
                                    setCleanAndClose();
                            }, MobileCRM.bridge.alert);
                        else {
                            if (entityForm.entity.properties.transactiontype === "UNBILLED") {
                                checkResetApptStatus();
                            }
                            else {
                                setCleanAndClose();
                            }
                        }
                    }, alertError);
                }
            }, alertError);
        }
        else
            return;
    });
}
function deleteCorrespondingTimelog() {
    var deferred = $.Deferred();

    fetchCorrespondingTimelogID().then(function (timelogID) {
        if (timelogID)
            MobileCRM.DynamicEntity.deleteById(SCHEMA.timelog.name, timelogID, function () {
                return deferred.resolve();
            }, function (err) { return deferred.reject(err); });
        else
            return deferred.resolve();
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchCorrespondingTimelogID() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.timelog.name);
    entity.addAttribute('id');
    entity.addFilter().where('laborexpenseid', 'eq', selected[entityName].id);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res[0] ? res[0].id : null);
    }, function (err) { return deferred.reject(err); })
    return deferred.promise();
}

//============== FORM EXECUTIONS ================
function error_saveLaborexpense(err) {
    if (err) {
        if (err.toLowerCase().indexOf("entity not found") > -1 && isTransferTravel) {
            // Entity is only on device
            this.save(error_saveTransferLaborexpense, false);
        }
        else {
            alertOnSave(err);
        }
    }
    else if (isTransferTravel) {
        this.save(error_saveTransferLaborexpense, false);
    }
    else if (hasTimelog)
        updateTimeLog(this.properties);
    else if (selected.appointment)
        updateAppointment();
    else
        setCleanAndClose();
}
function error_saveTransferLaborexpense(err) {
    if (err) {
        alertOnSave(err);
    }
    else if (hasTimelog)
        updateTimeLog(this.properties);
    else if (selected.appointment)
        updateAppointment();
    else
        setCleanAndClose();
}

function updateTimeLog(entityProps) {
    fetchCorrespondingTimelogID().then(function (timelogID) {
        if (timelogID) {
            MobileCRM.DynamicEntity.loadById(SCHEMA.timelog.name, timelogID, function (timelog) {
                timelog.properties.gptimein = new Date(entityProps.gptimein);
                timelog.properties.gptimeout = new Date(entityProps.gptimeout);
                timelog.properties.laborhours = entityProps.hoursunits;

                if (entityProps.costcodeid)
                    timelog.properties.costcodeid = entityProps.costcodeid;
                if (entityProps.jobcostcodeid)
                    timelog.properties.jobcostcodeid = entityProps.jobcostcodeid;
                if (entityProps.costcodealias)
                    timelog.properties.costcodealias = entityProps.costcodealias;
                timelog.properties.paycodeid = entityProps.paycodeid;
                timelog.properties.description = entityProps.description;

                if (isTransferTravel) {
                    if (entityProps.appointmentid && selected.appointment) {
                        timelog.properties.gpappointmentid = entityProps.gpappointmentid;
                        timelog.properties.gpservicecallid = entityProps.gpjobnumber;
                        timelog.properties.appointmentid = entityProps.appointmentid;

                        switch (entityProps.transactiontype) {
                            case "SERVICE":
                                timelog.properties.appointmenttype = 1;
                                timelog.properties.jobcostcodeid = null;
                                timelog.properties.costcodealias = null;
                                break;
                            case "JOB COST":
                                timelog.properties.appointmenttype = 3;
                                timelog.properties.costcodeid = null;
                                break;
                            case "UNBILLED":
                                timelog.properties.appointmenttype = 2;
                                timelog.properties.jobcostcodeid = null;
                                timelog.properties.costcodealias = null;
                                break;
                        }
                    }
                    else {  // Delete Timelog, no appointment to relate to
                        MobileCRM.DynamicEntity.deleteById(SCHEMA.timelog.name, timelogID, err_saveTimelog, alertOnSave);
                        return;
                    }
                }

                timelog.save(err_saveTimelog);
            }, alertOnSave);
        }
        else {
            alertOnSave("Update TimeLog Error: Missing TimeLog ID");
        }
    }, alertOnSave);
}
function err_saveTimelog(err) {
    if (err)
        alertOnSave(err);
    else if (selected.appointment)
        updateAppointment();
    else
        setCleanAndClose();
}

function updateRejectedEntity(entityForm) {
    // Rejected Icon = \u26A0
    entityForm.entity.properties.name = entityForm.entity.properties.name.replace("\u26A0 ", '');
    entityForm.entity.properties.transactionstatus = 1;
    entityForm.entity.properties.managercomment = null;

    if (hasTimelog)
        entityForm.entity.properties.transactiondate = new Date(entityForm.entity.properties.gptimein);

    entityForm.entity.save(function (err) {
        if (err)
            alertOnSave(err);
        else {
            MobileCRM.bridge.raiseGlobalEvent("ResubmitRejectedTimesheet");
            setCleanAndClose();
        }
    });
}

function alertOnSave(msg) {
    loading.close();
    if (typeof saveHandler !== 'undefined')
        saveHandler.resumeSave(msg);
    else
        MobileCRM.bridge.alert(msg);
}