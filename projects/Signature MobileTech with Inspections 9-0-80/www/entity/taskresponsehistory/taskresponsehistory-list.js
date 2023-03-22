//============== INITIAL SETTINGS ================
var historyEntityName = SCHEMA.taskresponsehistory.name;
var historySortDesc = true, historySortSelector = SCHEMA.taskresponsehistory.Properties.gpservicecallid;
var isOnline = false, historyListData = null;
var isCollapsed = false;
//============== FETCH DATA ================
var historyGroupTemplate = function (data, _, element) {
    var tech = data.items[0].gptechnicianid;
    element.append(
        $("<span>").append(data.key + " : " + (tech ? tech : '')),
        $("<span>").append(formatDate(data.items[0].completiondate)).css({
            "float": "right",
            "padding-right": "10px"
        })
    );
};
var historyItemTemplate = function (data, i, element) {
    var responseValue = '';
    switch (parseInt(data.responsetype)) {
        case 1: // string response
        case 5: // list string     
            responseValue = data.stringresponse;
            break;
        case 2: // numeric response
            var value = data.numericresponse;
            if ((value || parseInt(value) === 0) && value !== "NaN") {
                responseValue = parseFloat(value);
            }
            break;
        case 3: // integer response
            var value = data.integerresponse;
            if ((value || parseInt(value) === 0) && value !== "NaN") {
                responseValue = parseInt(value);
            }
            break;
        case 4: // yes/no response
            var value = data.integerresponse;
            if ((value || parseInt(value) === 0) && value !== "NaN") {
                switch (parseInt(value)) {
                    case 0: responseValue = "None"; break;
                    case 1: responseValue = "No"; break;
                    case 2: responseValue = "Yes"; break;
                    default: responseValue = "Error: Value not found"; break;
                }
            }
            break;
        case 6: //  text string
            responseValue = data.textresponse;
            break;
        case 7: // repair response
            var value = data.integerresponse;
            if ((value || parseInt(value) === 0) && value !== "NaN") {
                switch (parseInt(value)) {
                    case 0: responseValue = "None"; break;
                    case 1: responseValue = "Billable"; break;
                    case 2: responseValue = "No"; break;
                    case 3: responseValue = "Yes"; break;
                    default: responseValue = "Error: value not found"; break;
                }
            }
            break;
        case 8: // date
            var dateValue = data.dateresponse ? new Date(data.dateresponse) : new Date(1900, 1, 1);
            responseValue = formatDate(dateValue);
            break;
        default:
            alertError("Response Display Error: Unknown response type " + data.responsetype);
    }
    element.append(
        $("<span>").append(
            $("<i>").append(data.responselabel ? data.responselabel + ": " : ""),
            $("<span>").append(responseValue)
        ).css('white-space', 'normal')
    );
};

//============== TOOLBAR ITEMS ================
var historyToolbarItems = [ToolbarItemType.btnExpandCollapse, ToolbarItemType.btnRefresh];

function loadTaskResponseHistory(taskId) {
    //============== TOOLBARS ================
    historyToolbar = $("#historyToolbar").dxToolbar({
        items: (new ToolbarFactory()).addItems(historyToolbarItems)
    }).dxToolbar("instance");

    //============== List ================
    historyList = $("#historyList").dxList({
        grouped: true,
        collapsibleGroups: true,
        groupTemplate: historyGroupTemplate,
        itemTemplate: historyItemTemplate
    }).dxList("instance");

    try {
        loadHistoryListOptions();
    }
    catch (e) {
        alertError("Load Task History Error: " + e);
    }
}

//============== LOAD OPTIONS ================
function loadHistoryListOptions() {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        selected.location = entityForm.entity.properties.locationid;

        if (!selected.location) {
            alertError("Response History Error: Missing location details");
            return;
        }

        fetchSystemUser().then(function (user) {
            selected.systemuser = user;
            fetchHistoryListEntityData();
        }, alertError);
    }, alertError);
}

function fetchSystemUser() {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.systemuser.name);
    entity.addAttribute(SCHEMA.systemuser.Properties.id);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        if (res[0])
            return deferred.resolve(res[0]);
        else
            return deferred.reject("Unable to fetch system user");
    }, function (err) { return deferred.reject("Fetch System User Error: " + err); });
    return deferred.promise();
}

//============== LOAD DATA ================
function fetchHistoryListEntityData(isOnline) {
    var entity = new MobileCRM.FetchXml.Entity(historyEntityName);
    entity.addAttributes();
    entity.orderBy(historySortSelector, historySortDesc);

    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.createdby, 'eq', selected.systemuser.id);
    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.locationid, 'eq', selected.location.id);
    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.gptaskcode, 'eq', selected.task.gptaskcode);
    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.gptasklinenumber, 'eq', selected.task.gptasklinenumber);

    if (selected.task.gpsublocationid) {
        entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.gpsublocationid, 'eq', selected.task.gpsublocationid);
    }
    if (selected.task.equipmentid) {
        entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.equipmentid, 'eq', selected.task.equipmentid.id);
    }

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute(isOnline ? "Online.JSON" : "JSON", function (res) {
        if (isOnline) {
            if (res.length < 1) {
                sayLocalization("Alert.NoHistoryTaskResponse");
            }
            else {
                showToast(MobileCRM.Localization.get("Alert.HistoryUpdated"), 'success');
                createLocalData(res);
            }
        }

        historyListData = new DevExpress.data.DataSource({
            store: {
                type: 'array',
                key: 'id',
                data: res
            },
            sort: [{ selector: historySortSelector, desc: historySortDesc }, SCHEMA.taskresponsehistory.Properties.linenumber],
            group: SCHEMA.taskresponsehistory.Properties.gpservicecallid,
            paginate: false
        });
        historyList.option('dataSource', historyListData);
        loading.close();
    }, alertError);
}

//============== TOOLBAR FUNCTIONS ================
function btnExpandCollapseClicked(currentlyCollapsed) {
    historyList.option("onGroupRendered", function (e) {
        if (currentlyCollapsed) {
            e.component.expandGroup(e.groupIndex);
        }
        else {
            e.component.collapseGroup(e.groupIndex);
        }
    });
    historyList.repaint();
}

function btnRefreshClicked() {
    try {
        loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Msg.Loading"));
        connectionCheck(true, function () {
            sendDeleteRequest(selected.location.id).then(function () {
                getHistory().then(function () {
                    fetchHistoryListEntityData(true);
                }, alertError);
            }, alertError);
        });
    }
    catch (e) {
        alertError(e);
    }
}

function getHistory() {
    var deferred = $.Deferred();
    if (!selected.location) {
        return deferred.reject("Unable to Get History: Missing location details");
    }

    // Middle Tier Entity creation triggers History Plugin
    var entity = new MobileCRM.DynamicEntity(historyEntityName);
    entity.properties.locationid = new MobileCRM.Reference(SCHEMA.location.name, selected.location.id);
    entity.properties.equipmentid = selected.task.equipmentid;
    entity.properties.gpsublocationid = selected.task.gpsublocationid;
    entity.properties.gptasklistid = selected.task.gptasklistid;
    entity.properties.gptaskcode = selected.task.gptaskcode;
    entity.properties.gptasklinenumber = selected.task.gptasklinenumber;
    var saveOnline = true;

    entity.save(function (err) {
        if (err) {
            return deferred.reject("History Create Error:\n" + err);
        }
        else {
            return deferred.resolve();
        }
    }, saveOnline);
    return deferred.promise();
}

//============== LIST EXECUTIONS ================
function sendDeleteRequest(locationID) {
    // Delete any taskresponsehistory with this location on the device
    var deferred = $.Deferred();
    if (!locationID)
        return deferred.reject("Unable to Send Delete Request: Missing location ID");

    var entity = new MobileCRM.FetchXml.Entity(historyEntityName);
    entity.addAttribute(SCHEMA.taskresponsehistory.Properties.id);
    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.locationid, 'eq', locationID);
    if (selected.task.equipmentid) {
        entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.equipmentid, 'eq', selected.task.equipmentid.id);
    }
    else {
        entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.equipmentid, 'null');
    }

    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.gptaskcode, 'eq', selected.task.gptaskcode);
    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.gptasklinenumber, 'eq', selected.task.gptasklinenumber);
    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.gptasklistid, 'eq', selected.task.gptasklistid ? selected.task.gptasklistid : '');
    entity.addFilter().where(SCHEMA.taskresponsehistory.Properties.gpsublocationid, 'eq', selected.task.gpsublocationid ? selected.task.gpsublocationid : '');

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        var itemsDeferred = [];

        $(res).each(function (i, history) {
            itemsDeferred.push(deleteHistory(history));
        });

        $.when.apply($, itemsDeferred).then(function () {
            return deferred.resolve();
        }, function (err) { return deferred.reject(err); });
    }, function (err) { return deferred.reject("Fetch Delete Request Error: " + err); });
    return deferred.promise();
}
function deleteHistory(history) {
    var deferred = $.Deferred();
    if (!history)
        return deferred.reject("Unable to Delete Request: Missing history details");

    MobileCRM.DynamicEntity.deleteById(historyEntityName, history.id,
        function () { return deferred.resolve(); },
        function (err) { return deferred.reject("Delete By ID Error: " + err); }
    );
    return deferred.promise();
}

function createLocalData(data) {
    // Create local copies of history so it stays on the device until next sync
    $(data).each(function (i, history) {
        MobileCRM.DynamicEntity.loadById(SCHEMA.taskresponsehistory.name, history.id, function (res) { },
            function (err) {    // Entity is only on the server
                var entity = new MobileCRM.DynamicEntity(SCHEMA.taskresponsehistory.name);
                // Entity attributes needed for display
                entity.properties.name = history.name;
                entity.properties.completiondate = history.completiondate ? new Date(history.completiondate) : null;
                entity.properties.dateresponse = history.dateresponse ? new Date(history.dateresponse) : null;
                entity.properties.dateofcall = history.dateofcall ? new Date(history.dateofcall) : null;
                entity.properties.equipmentid = history.equipmentid ?
                    new MobileCRM.Reference(SCHEMA.equipment.name, history.equipmentid.id) : null;
                entity.properties.gprepairtaskcode = history.gprepairtaskcode;
                entity.properties.gpresponselistid = history.gpresponselistid;
                entity.properties.gpservicecallid = history.gpservicecallid;
                entity.properties.gpsublocationid = history.gpsublocationid;
                entity.properties.gptaskcode = history.gptaskcode;
                entity.properties.gptasklinenumber = history.gptasklinenumber;
                entity.properties.gptasklistid = history.gptasklistid;
                entity.properties.integerresponse = history.integerresponse;
                entity.properties.linenumber = history.linenumber;
                entity.properties.locationid = history.locationid ?
                    new MobileCRM.Reference(SCHEMA.location.name, history.locationid.id) : null;
                entity.properties.numericresponse = history.numericresponse;
                entity.properties.responselabel = history.responselabel;
                entity.properties.responsetype = history.responsetype;
                entity.properties.stringresponse = history.stringresponse;
                entity.properties.textresponse = history.textresponse;

                entity.save(function (err) {
                    if (err) {
                        MobileCRM.bridge.alert("Create Local Data Error:\n" + err);
                    }
                });
            }
        );
    });
}