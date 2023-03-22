//============== LIST EXECUTIONS ================
// ----- ACTION ITEM: More -----
function viewEntity() {
    if (!selected.equipment) {
        alertError("Open Equipment Form Error: Missing Equipment ID");
        return;
    }

    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        MobileCRM.UI.FormManager.showEditDialog(entityName, selected.equipment.id, null,
            { iFrameOptions: { callingObject: entityForm.entity } }
        );
    }, function (err) { // No EntityForm, from Dashboard
        MobileCRM.UI.FormManager.showEditDialog(entityName, selected.equipment.id);
    });
}

// ----- ACTION ITEM: Create Service Call -----
function createServiceCall() {
    createBobHealthCheckRequest().then(function (bobDataId) {
        if (bobDataId) {
            loadEquipmentFaults(bobDataId);
        }
        else {// Equipment doesn't have fault data
            showNewServiceCallForm();
        }
    }, alertError);
}
function showNewServiceCallForm(description) {
    if (typeof loading !== 'undefined') {
        loading.close();
    }

    MobileCRM.UI.IFrameForm.show(MobileCRM.Localization.get("newcall"),
        "file:///entity/servicecall/servicecall-form_new.html", false,
        option = {
            locationid: selected.location ? selected.location.id : selected.equipment.properties['location.id'],
            equipmentid: selected.equipment.id,
            description: description ? description : ""
        }
    );
}

function loadEquipmentFaults(bobDataId) {
    fetchEquipmentFaults(bobDataId).then(function (res) {
        if (res.length === 1) {
            var activeFaults = new DevExpress.data.DataSource({
                store: JSON.parse(res[0].jsonresponse),
                filter: ['Status', '=', true],
                sort: [{ selector: 'Priority', desc: true }, 'Name'],
                paginate: false
            });

            activeFaults.load().done(function (data) {
                if (data.length < 1) {  // No Active Faults
                    showNewServiceCallForm();
                }
                else if (data.length === 1) {   // One Active Fault
                    createCallDescription(data[0]).then(showNewServiceCallForm);
                }
                else {  // Multiple Active Faults
                    loading.close();
                    faultSelectPopup.show();
                    faultSelectList.option({
                        dataSource: data,
                        onItemClick: function (e) {
                            faultSelectPopup.hide();
                            createCallDescription(e.itemData).then(showNewServiceCallForm);
                        }
                    });
                }

            });
        }
        else {
            alertError("Fetch Equipment Fault Details Error: Returned " + res.length + " Results");
        }
    }, alertError);
}
function createCallDescription(rule) {
    var deferred = $.Deferred();
    try {
        var description = MobileCRM.Localization.get("bobdata.Call.ruleName") + ": " + rule.Name;
        if (rule.Description) {
            description += "\n" + MobileCRM.Localization.get("bobdata.Call.description") + ": " + rule.Description;
        }
        description += "\n" + MobileCRM.Localization.get("bobdata.Call.target") + ": " + (rule.SnapshotRoute ? rule.SnapshotRoute : selected.equipment.name);
        if (rule.IssueTypes) {
            $(rule.IssueTypes).each(function (i, issueType) {
                if (i === 0) {
                    description += "\n" + MobileCRM.Localization.get("bobdata.Call.issueType") + ": " + issueType;
                }
                else {
                    description += ", " + issueType;
                }
            });
        }
        if (rule.SystemEffect) {
            description += "\n\n" + MobileCRM.Localization.get("bobdata.Call.systemEffect") + ":\n" + rule.SystemEffect;
        }
        if (rule.Recommendation) {
            description += "\n\n" + MobileCRM.Localization.get("bobdata.Call.recommendation") + ":\n" + rule.Recommendation;
        }

        return deferred.resolve(description);
    }
    catch (e) {
        alertError("Create Call Description Error: " + e);
    }
    return deferred.promise();
}

// ----- ACTION ITEM: Create Service Request -----
function showServiceRequestPopup() {
    createBobHealthCheckRequest().then(loadServiceRequestForm, alertError);
}
function loadServiceRequestForm(bobDataId) {
    if (!bobDataId) {
        alertError("Load Service Request Form Error: Missing BOB data details");
    }
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.bobdata.name);
    entity.addAttribute(SCHEMA.bobdata.Properties.jsonresponse);
    entity.addFilter().where(SCHEMA.bobdata.Properties.id, 'eq', bobDataId);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.executeOnline("JSON", function (res) {
        if (res.length === 1) {
            var faults = new DevExpress.data.DataSource({
                store: JSON.parse(res[0].jsonresponse),
                sort: [{ selector: 'Priority', desc: true }, 'Name'],
                paginate: false
            });

            faults.load().done(function (data) {
                loading.close();
                requestPopup.show();
                requestForm.resetValues();
                selected.fault = null;
                requestForm.itemOption('fault', 'isRequired', true);
                requestForm.getEditor('fault').option('dataSource', data);

                if (data[0].SnapshotRoute) {
                    var routeDetails = data[0].SnapshotRoute.split("/");
                    requestForm.getEditor('client').option('value', routeDetails[1]);
                    requestForm.getEditor('site').option('value', routeDetails[2]);
                    requestForm.getEditor('equipment').option('value', routeDetails[3]);
                }
                else {
                    requestForm.getEditor('client').option('value', selected.equipment.gpcustomernumber);
                    requestForm.getEditor('site').option('value', selected.equipment.gplocationnumber);
                    requestForm.getEditor('equipment').option('value', selected.equipment.name);
                }
            });
        }
        else {
            alertError("Fetch Equipment Fault Details Error: Returned " + res.length + " Results");
        }
    }, alertError);
}

function faultItemClicked(e) {
    selected.fault = e.itemData;
    var priorityInt = parseInt(selected.fault.Priority);
    var priorityValue = priorityInt === 0 ? "Low" : (priorityInt === 1 ? "Medium" : "High");
    requestForm.getEditor('priority').option('value', priorityValue);
    requestForm.getEditor('issuetypes').option('value', selected.fault.IssueTypes ? selected.fault.IssueTypes.toString() : "");
    createRequestDescription(selected.fault).then(function (description) {
        requestForm.getEditor('description').option('value', description);
    }, alertError);
}
function createRequestDescription(rule) {
    var deferred = $.Deferred();
    try {
        var description = "";
        if (rule.Description) {
            description += rule.Description + "\n\n";
        }
        if (rule.SystemEffect) {
            description += MobileCRM.Localization.get("bobdata.Call.systemEffect") + ": " + rule.SystemEffect
        }
        if (rule.Recommendation) {
            description += "\n\n" + MobileCRM.Localization.get("bobdata.Call.recommendation") + ":\n" + rule.Recommendation;
        }

        return deferred.resolve(description);
    }
    catch (e) {
        return deferred.reject("Create Request Description Error: " + e);
    }
    return deferred.promise();
}
function btnCreateRequestClicked() {
    loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Msg.Loading"));
    requestForm.validate();
    var formData = requestForm.option('formData');

    if (!formData.fault) {
        loading.close();
        var toastMsg = MobileCRM.Localization.get(formItemOptions.fault.validationMsg);
        showToast(toastMsg.format("Fault"), 'error');
    }
    else {
        var requestData = selected.fault;
        requestData.priority = formData.Priority;
        requestData.description = formData.Description;
        createServiceRequest(requestData);
    }
}

// ----- ACTION ITEM: View Fault Details  -----
function showFaultDetailPopup() {
    createBobHealthCheckRequest().then(function (bobDataId) {
        if (bobDataId) {
            fetchEquipmentFaults(bobDataId)
                .then(loadFaultDetails, alertError);
        }
        else {
            alertError("No faults for selected equipment");
        }
    }, alertError);
}
function loadFaultDetails(faultRes) {
    var faultData = JSON.parse(faultRes[0].jsonresponse);
    $(faultData).each(function (i, fault) {
        var inFault = fault.Status ? JSON.parse(fault.Status) : false;
        fault.statusName = inFault ? "InFault" : "OK"
    });

    if (typeof loading !== 'undefined') {
        loading.close();
    }

    faultDetailPopup.option("toolbarItems", [
        { text: MobileCRM.Localization.get("bobdata.Title.FaultDetails"), location: "before" },
        {
            widget: "dxButton", location: "after", options: {
                text: "Expand All",
                icon: "spindown",
                type: "default",
                stylingMode: "text",
                onClick: function (e) {
                    var currentlyCollapsed = this.option("text") === "Expand All" ? true : false;
                    this.option("text", currentlyCollapsed ? "Collapse All" : "Expand All");
                    this.option("icon", currentlyCollapsed ? "spinup" : "spindown");
                    btnExpandCollapseClicked_FaultDetails(currentlyCollapsed);
                }
            }
        }
    ]);
    btnExpandCollapseClicked_FaultDetails(false);
    faultDetailPopup.show();
    faultDetailList.option('dataSource', new DevExpress.data.DataSource({
        store: faultData,
        sort: [{ selector: 'Status', desc: true }, { selector: 'Priority', desc: true }, 'Name'],
        paginate: false,
        group: "Name"
    }));
}

function createServiceCallFromFault(faultData) {
    loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Msg.Loading"));
    createCallDescription(faultData).then(showNewServiceCallForm);
    faultDetailPopup.hide();
}
function createServiceRequestFromFault(faultData) {
    loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Msg.Loading"));
    var priorityInt = parseInt(faultData.Priority);
    var priorityValue = priorityInt === 0 ? "Low" : (priorityInt === 1 ? "Medium" : "High");

    var requestData = faultData;
    requestData.priority = priorityValue;
    requestData.description = faultData.Description;
    createServiceRequest(requestData);
}

function btnExpandCollapseClicked_FaultDetails(currentlyCollapsed) {
    faultDetailList.option("onGroupRendered", function (e) {
        if (currentlyCollapsed)
            e.component.expandGroup(e.groupIndex);
        else
            e.component.collapseGroup(e.groupIndex);
    });
    faultDetailList.reload();
}


// ----- Common Functions -----
function createBobHealthCheckRequest() {
    var deferred = $.Deferred();

    if (selected.equipment) {
        if (selected.equipment.statusNo && parseInt(selected.equipment.statusNo) > -1) {
            loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Msg.Loading"));

            var entity = new MobileCRM.DynamicEntity(SCHEMA.bobdata.name);
            entity.properties.requesttype = DataType.healthchecksEquipment;
            entity.properties.requeststatus = RequestStatus.requested;
            entity.properties.jsonrequest = createEntityRequestString(selected.equipment);

            entity.save(function (err) {
                if (err) {
                    return deferred.reject("Health Check Save Error: " + err);
                }
                else {
                    return deferred.resolve(this.id);
                }
            }, true);
        }
        else {  // Equipment doesn't have fault data
            return deferred.resolve(null);
        }
    }
    else {
        return deferred.reject("Create Health Check Request Error: Unable to load location and equipment details");
    }
    return deferred.promise();
}
function createEntityRequestString(entity) {
    return JSON.stringify({
        id: entity.id,
        entityname: entity.entityname ? entity.entityname : SCHEMA.equipment.name,
        gpcustomernumber: entity.gpcustomernumber,
        gplocationnumber: entity.gplocationnumber ? entity.gplocationnumber : "",
        gpequipmentid: entity.gpequipmentid ? entity.gpequipmentid : ""
    });
}
function fetchEquipmentFaults(bobDataId) {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.bobdata.name);
    entity.addAttribute(SCHEMA.bobdata.Properties.jsonresponse);
    entity.addFilter().where(SCHEMA.bobdata.Properties.id, 'eq', bobDataId);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.executeOnline("JSON", function (res) {
        return deferred.resolve(res);
    }, function (err) {
        return deferred.reject("Fetch Equipment Faults Error: " + err);
    });
    return deferred.promise();
}

function createServiceRequest(requestData) {
    try {
        fetchSystemUser().then(function (systemuser) {
            var entity = new MobileCRM.DynamicEntity(SCHEMA.bobdata.name);
            entity.properties.requesttype = DataType.serviceRequest;
            entity.properties.requeststatus = RequestStatus.requested;
            entity.properties.jsonrequest = createRequestPayload(requestData, systemuser);
            entity.save(function (err) {
                if (err) {
                    alertError("Create Service Request Error: " + err);
                }
                else {
                    displayRequestDetails(this.id);
                    requestPopup.hide();
                    faultDetailPopup.hide();
                }
            }, true);
        }, alertError);
    }
    catch (e) {
        alertError("Create Request Error: " + e);
    }
}
function fetchSystemUser() {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.systemuser.name);
    entity.addAttributes();

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        if (res.length === 1) {
            return deferred.resolve(res[0]);
        }
        else {
            return deferred.reject("Fetch System User Error: Fetch returned " + res.length + " results.");
        }
    }, function (err) {
        return deferred.reject("Fetch System User Error: " + err);
    })
    return deferred.promise();
}
function createRequestPayload(requestData, systemuser) {
    try {
        var requestPayload = {
            clientId: requestData.ClientId,
            companyId: requestData.CompanyId,
            description: requestData.description,
            equipmentId: requestData.EquipmentId,
            issueTypes: requestData.IssueTypes,
            priority: requestData.priority,
            requesterEmail: systemuser.internalemailaddress,
            requesterName: systemuser.name,
            requesterPhone: "",
            siteId: requestData.SiteId,
            summary: requestData.Name,
            systemId: null
        };

        return JSON.stringify(requestPayload);
    }
    catch (e) { alertError("Create Request Payload Error: " + e); }
}
function displayRequestDetails(bobDataId) {
    try {
        var entity = new MobileCRM.FetchXml.Entity(SCHEMA.bobdata.name);
        entity.addAttribute(SCHEMA.bobdata.Properties.jsonresponse);
        entity.addFilter().where(SCHEMA.bobdata.Properties.id, 'eq', bobDataId);

        var fetch = new MobileCRM.FetchXml.Fetch(entity);
        fetch.executeOnline("JSON", function (res) {
            if (res.length === 1) {
                loading.close();
                var serviceRequest = JSON.parse(res[0].jsonresponse);
                var msg = MobileCRM.Localization.get("Alert.ServiceRequestCreated").format(serviceRequest.WorkOrder);
                MobileCRM.UI.MessageBox.sayText(msg, function () { });
            }
            else {
                alertError("Display Request Details Error: bobdata fetch returned " + res.length + " results.");
            }
        }, alertError);
    }
    catch (e) {
        alertError("Display Request Details Error: " + e);
    }
}