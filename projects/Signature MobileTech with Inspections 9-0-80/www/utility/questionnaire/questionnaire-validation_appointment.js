//============== OFFLINE DATA ================
var inspectionData, templateDataWarning, templateDataRequired, assignedEquipment;
//============== FETCH DATA ================
var entityAttributes = [
    SCHEMA.resco_questionnaire.Properties.resco_questionnaireid,
    SCHEMA.resco_questionnaire.Properties.resco_name,
    SCHEMA.resco_questionnaire.Properties.equipmentid
];

function loadValidationInspections() {
    //============== EVENT HANDLERS ================
    MobileCRM.UI.EntityForm.onSelectedViewChanged(function (entityForm) {
        if (entityForm.context.selectedView == "Inspections") {
            loadInspectionValidationOptions();
        }
    });

    loadLookupOptions();
}

//============== LOAD OPTIONS ================
function loadLookupOptions() {
    if (selected.appointment) {
        switch (parseInt(selected.appointment.gpappointmenttype)) {
            case 1:
                MobileCRM.DynamicEntity.loadById(SCHEMA.servicecall.name, selected.appointment.servicecallid.id, function (call) {
                    selected.servicecall = call.properties;

                    loadInspectionValidationOptions();
                }, alertInspectionError);
                break;
            case 3:
                MobileCRM.DynamicEntity.loadById(SCHEMA.job.name, selected.appointment.jobid.id, function (job) {
                    selected.job = job.properties;

                    loadInspectionValidationOptions();
                }, alertInspectionError);
                break;
            default:
                alertInspectionError("Load Inspections List Options Error: Invalid appointment type of " + selected.appointment.gpappointmenttype);
        }
    }
    else {
        alertInspectionError("Load Inspections List Options Error: Missing Appointment Details");
    }
}
function loadInspectionValidationOptions() {
    loading_Inspections = MobileCRM.UI.Form.showPleaseWait("Loading Inspections");
    fetchAppointmentInspections()
        .then(loadInspectionLinks, alertInspectionError)
        .then(function () {
            loading_Inspections.close();
        }, alertInspectionError);
}

//============== LOAD DATA ================
function fetchAppointmentInspections(onlyIncludeCompleted) {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.resco_questionnaire.name);
    $(entityAttributes).each(function (index, attribute) {
        entity.addAttribute(attribute);
    });

    entity.addFilter().where(SCHEMA.resco_questionnaire.Properties.resco_regardingid, 'eq', selected.appointment.id);
    entity.addFilter().where(SCHEMA.resco_questionnaire.Properties.resco_istemplate, 'eq', false);
    // Inspection validation only applicable to template dependent Inspections
    entity.addFilter().where(SCHEMA.resco_questionnaire.Properties.resco_templatedependent, 'eq', true);

    if (onlyIncludeCompleted) {
        entity.addFilter().where(SCHEMA.resco_questionnaire.Properties.resco_completionstatus, 'not-null');
    }

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        inspectionData = res;
        return deferred.resolve();
    }, function (err) {
        return deferred.reject("Fetch List Entity Data Error: " + err);
    });
    return deferred.promise();
}

function loadInspectionLinks() {
    var deferred = $.Deferred();
    var itemsDeferred = [];

    if (typeof links !== 'undefined') {
        if (selected.servicecall) {
            if (links.equipment) {
                itemsDeferred.push(loadEquipmentInspections());
            }
            if (links.servicecall) {
                itemsDeferred.push(addInspectionBasedOnLinks(links.servicecall, selected.servicecall));
            }
        }
        else if (selected.job) {
            if (links.job) {
                itemsDeferred.push(addInspectionBasedOnLinks(links.job, selected.job));
            }
        }
        else {
            return deferred.resolve();
        }
    }
    else {
        MobileCRM.bridge.log("Check Inspections Validation: No inspection links defined");
        return deferred.resolve();
    }

    $.when.apply($, itemsDeferred).then(function () {
        return deferred.resolve();
    }, function (err) {
        return deferred.reject(err);
    });
    return deferred.promise();
}

function loadEquipmentInspections() {
    var deferred = $.Deferred();

    fetchAssignedEquipment_Inspections().then(function () {
        var itemsDeferred = [];
        $(assignedEquipment).each(function (_, equipment) {
            itemsDeferred.push(addInspectionBasedOnLinks(links.equipment, equipment, true));
        });

        $.when.apply($, itemsDeferred).then(function () {
            return deferred.resolve();
        }, function (err) {
            return deferred.reject(err);
        });
    }, function (err) {
        return deferred.reject(err);
    });
    return deferred.promise();
}

function fetchAssignedEquipment_Inspections() {
    var deferred = $.Deferred();
    if (!selected.appointment || !selected.appointment.servicecallid) {
        return deferred.reject("Fetch Assigned Equipment Error: Missing Service Call Details");
    }

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.task.name);
    entity.addAttribute(SCHEMA.task.Properties.equipmentid);

    entity.addFilter().where(SCHEMA.task.Properties.servicecallid, 'eq', selected.appointment.servicecallid.id);
    entity.addFilter().where(SCHEMA.task.Properties.equipmentid, 'not-null');

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        var itemsDeferred = [];
        var equipmentIds = [];
        assignedEquipment = [];

        $(res).each(function (_, task) {
            if (equipmentIds.indexOf(task.equipmentid.id) < 0) {
                equipmentIds.push(task.equipmentid.id);
                itemsDeferred.push(loadAssignedEquipmentDetails(task.equipmentid.id));
            }
        });

        $.when.apply($, itemsDeferred).then(function () {
            return deferred.resolve();
        }, function (err) {
            return deferred.reject(err);
        });
    }, function (err) {
        return deferred.reject("Fetch Assigned Equipment Error: " + err);
    });
    return deferred.promise();
}
function loadAssignedEquipmentDetails(equipmentId) {
    var deferred = $.Deferred();
    if (!equipmentId) {
        return deferred.reject("Load Assigned Equipment Details Error: Missing Equipment ID");
    }

    MobileCRM.DynamicEntity.loadById(SCHEMA.equipment.name, equipmentId, function (equip) {
        assignedEquipment.push(equip.properties);
        return deferred.resolve();
    }, function (err) {
        return deferred.reject("Load Equipment By Id Error: " + err);
    });
    return deferred.promise();
}

function addInspectionBasedOnLinks(templateLinks, relatedEntity, isEquipment) {
    var deferred = $.Deferred();
    if (!templateLinks) {
        return deferred.reject("Add Inspection Based on Links Error: Missing Template Links");
    }
    if (!relatedEntity) {
        return deferred.reject("Add Inspection Based on Links Error: Missing Related Entity Details");
    }

    var itemsDeferred = [];

    // Add Inspections at the base level (service/job/equipment)
    $(templateLinks.REQUIRED).each(function (_, inspectionName) {
        var inspectionArray = $.grep(inspectionData, function (inspection) {
            if (isEquipment) {
                return (inspection.resco_name === inspectionName) && inspection.equipmentid &&
                    (inspection.equipmentid.id === relatedEntity.id)
            }
            else {
                return inspection.resco_name === inspectionName
            }
        });

        if (inspectionArray.length < 1) {
            itemsDeferred.push(createInspection(inspectionName, isEquipment ? relatedEntity : null));
        }
    });
    $(templateLinks.WARNING).each(function (_, inspectionName) {
        var inspectionArray = $.grep(inspectionData, function (inspection) {
            if (isEquipment) {
                return (inspection.resco_name === inspectionName) && inspection.equipmentid &&
                    (inspection.equipmentid.id === relatedEntity.id)
            }
            else {
                return inspection.resco_name === inspectionName
            }
        });

        if (inspectionArray.length < 1) {
            itemsDeferred.push(createInspection(inspectionName, isEquipment ? relatedEntity : null));
        }
    });

    // Add Inspections at the entity field level
    for (var field in templateLinks) {  // Loop through Service/Job/Equipment Fields
        if (field !== "REQUIRED" && field !== "WARNING") {
            for (var j in templateLinks[field]) { // Loop through array of Service/Job Field Objects
                $(templateLinks[field][j]).each(function (_, fieldObject) {
                    var isLookupField = field.indexOf("_name") > -1;
                    var lookupField = field.substring(0, field.indexOf("_name"));

                    if ((isLookupField && relatedEntity[lookupField] && relatedEntity[lookupField].primaryName === fieldObject.value) ||
                        relatedEntity[field] === fieldObject.value) {

                        $(fieldObject.inspections["WARNING"]).each(function (_, inspectionName) {
                            var inspArr = $.grep(inspectionData, function (inspection) {
                                if (isEquipment) {
                                    return (inspection.resco_name === inspectionName) && inspection.equipmentid &&
                                        (inspection.equipmentid.id === relatedEntity.id)
                                }
                                else {
                                    return inspection.resco_name === inspectionName
                                }
                            });

                            if (inspArr.length < 1) {
                                itemsDeferred.push(createInspection(inspectionName, isEquipment ? relatedEntity : null));
                            }
                        });

                        $(fieldObject.inspections["REQUIRED"]).each(function (_, inspectionName) {
                            var inspArr = $.grep(inspectionData, function (inspection) {
                                if (isEquipment) {
                                    return (inspection.resco_name === inspectionName) && inspection.equipmentid &&
                                        (inspection.equipmentid.id === relatedEntity.id)
                                }
                                else {
                                    return inspection.resco_name === inspectionName
                                }
                            });

                            if (inspArr.length < 1) {
                                itemsDeferred.push(createInspection(inspectionName, isEquipment ? relatedEntity : null));
                            }
                        });
                    }
                });
            }
        }

    }

    $.when.apply($, itemsDeferred).then(function () {
        return deferred.resolve();
    }, function (err) {
        return deferred.reject(err);
    })
    return deferred.promise();
}

function createInspection(inspectionName, equipment) {
    var deferred = $.Deferred();
    if (!inspectionName) {
        return deferred.reject("Create Inspection Error: Missing Inspection Name");
    }

    fetchInspectionTemplate(inspectionName).then(function (template) {
        if (!template) {
            return deferred.reject("Create Inspection Error: Fetch returned null template");
        }

        if (!template.resco_templatedependent) {
            // Inspection validation only applicable to template dependent Inspections
            return deferred.resolve();
        }
        else {
            var options = JSON.parse(template.resco_options);
            var version = options.storageConfig.ver;
            var serializedanswersObj = {
                "@q": {},
                "@ver": version
            };
            if (version.startsWith("f")) {
                serializedanswersObj["@root"] = {
                    "resco_regardingid": { "v": "appointment;" + selected.appointment.id }
                }
                if (equipment) {
                    serializedanswersObj["@root"][SCHEMA.resco_questionnaire.Properties.equipmentid] = {
                        "v": "equipment;" + equipment.id
                    }
                }
            }
            else if (version.startsWith("m")) {
                serializedanswersObj["@root"] = {
                    "resco_regardingid": "appointment;" + selected.appointment.id
                }
                if (equipment) {
                    serializedanswersObj["@root"][SCHEMA.resco_questionnaire.Properties.equipmentid] = "equipment;" + equipment.id;
                }
            }
            else {
                return deferred.reject("Create Inspection Error: Unknown Template Version - " + version);
            }

            var entity = new MobileCRM.DynamicEntity(
                SCHEMA.resco_questionnaire.name,
                null,
                template.resco_name,
                {
                    resco_name: template.resco_name,
                    resco_istemplate: false,
                    resco_issnippet: false,
                    resco_templateid: new MobileCRM.Reference(SCHEMA.resco_questionnaire.name, template.resco_questionnaireid),
                    equipmentid: equipment ? new MobileCRM.Reference(SCHEMA.equipment.name, equipment.id) : null,
                    resco_regardingid: selected.appointment.id,
                    resco_regardingidname: SCHEMA.appointment.name,
                    resco_regardingidlabel: selected.appointment.name,
                    resco_serializedanswers: JSON.stringify(serializedanswersObj),
                    resco_reusefromprevious: template.resco_reusefromprevious,
                    resco_versionname: template.resco_versionname,
                    resco_templatedependent: template.resco_templatedependent,
                    resco_featureversion: template.resco_featureversion,
                    resco_version: template.resco_version
                }
            );

            entity.save(function (err) {
                if (err) {
                    return deferred.reject("Create Inspection Error: " + err);
                }
                else {
                    return deferred.resolve();
                }
            });
        }
    }, function (err) {
        return deferred.reject(err);
    });
    return deferred.promise();
}

function fetchInspectionTemplate(name) {
    var deferred = $.Deferred();
    if (!name) {
        return deferred.reject("Fetch Inspection Template Error: Missing Inspection Name");
    }

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.resco_questionnaire.name);
    entity.addAttributes();

    entity.addFilter().where(SCHEMA.resco_questionnaire.Properties.resco_name, 'eq', name);
    entity.addFilter().where(SCHEMA.resco_questionnaire.Properties.resco_istemplate, 'eq', true);
    entity.addFilter().where(SCHEMA.resco_questionnaire.Properties.resco_archivedon, 'null');

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("DynamicEntities", function (res) {
        if (res.length === 1) {
            return deferred.resolve(res[0].properties);
        }
        else {
            return deferred.reject("Fetch Inspection Template Error: Fetch returned " + res.length + " results");
        }
    }, function (err) {
        return deferred.reject(err);
    });
    return deferred.promise();
}

function alertInspectionError(err) {
    if (typeof loading_Inspections !== 'undefined')
        loading_Inspections.close();
    if (err)
        MobileCRM.bridge.alert(err);
}

//============== VALIDATION ================
function checkInspections() {
    var deferred = $.Deferred();
    try {
        fetchAppointmentInspections(true).then(function () {
            var itemsDeferred = [];

            if (typeof links !== 'undefined') {
                if (selected.servicecall) {
                    if (links.equipment) {
                        itemsDeferred.push(validateEquipmentInspections(links.equipment));
                    }
                    if (links.servicecall) {
                        itemsDeferred.push(validateInspections(links.servicecall, selected.servicecall));
                    }
                }
                else if (selected.job) {
                    if (links.job) {
                        itemsDeferred.push(validateInspections(links.job, selected.job));
                    }
                }
                else {
                    return deferred.reject("Inspection Validation Error: Missing Call/Job Details");
                }
            }
            else {
                MobileCRM.bridge.log("Check Inspections Validation: No inspection links defined");
            }

            $.when.apply($, itemsDeferred)
                .then(combineValidationItems, function (err) { return deferred.reject(err); })
                .then(function (combinedItems) {
                    return deferred.resolve(combinedItems);
                }, function (err) { return deferred.reject(err); });
        }, function (err) {
            return deferred.reject(err);
        });
    }
    catch (e) {
        return deferred.reject("Check Inspections Error: " + e);
    }
    return deferred.promise();
}

function validateEquipmentInspections(templateLinks) {
    var deferred = $.Deferred();
    var itemsDeferred = [];

    fetchAssignedEquipment_Inspections().then(function () {
        $(assignedEquipment).each(function (_, equipment) {
            itemsDeferred.push(validateInspections(templateLinks, equipment, true));
        });

        $.when.apply($, itemsDeferred)
            .then(combineValidationItems, function (err) { return deferred.reject(err); })
            .then(function (combinedItems) {
                return deferred.resolve(combinedItems);
            }, function (err) { return deferred.reject(err); });
    }, function (err) {
        return deferred.reject(err);
    });
    return deferred.promise();
}

function validateInspections(templateLinks, relatedEntity, isEquipment) {
    var deferred = $.Deferred();
    if (!templateLinks) {
        return deferred.reject("Validate Inspections Error: Missing Template Links");
    }
    var validationItems = {};

    // Add Inspections at the base level (service/job/equipment)
    $(templateLinks.REQUIRED).each(function (_, inspectionName) {
        var inspectionArray = $.grep(inspectionData, function (inspection) {
            if (isEquipment) {
                return (inspection.resco_name === inspectionName) && inspection.equipmentid &&
                    (inspection.equipmentid.id === relatedEntity.id)
            }
            else {
                return inspection.resco_name === inspectionName
            }
        });

        if (inspectionArray.length < 1) {
            validationItems[ValidationLevel.Required] = [Validation.Inspection];
            return deferred.resolve(validationItems);
        }
    });
    $(templateLinks.WARNING).each(function (_, inspectionName) {
        var inspectionArray = $.grep(inspectionData, function (inspection) {
            if (isEquipment) {
                return (inspection.resco_name === inspectionName) && inspection.equipmentid &&
                    (inspection.equipmentid.id === relatedEntity.id)
            }
            else {
                return inspection.resco_name === inspectionName
            }
        });

        if (inspectionArray.length < 1) {
            validationItems[ValidationLevel.Warning] = [Validation.Inspection];
        }
    });

    // Add Inspections at the entity field level
    for (var field in templateLinks) {  // Loop through Service/Job/Equipment Fields
        if (field !== "REQUIRED" && field !== "WARNING") {
            for (var j in templateLinks[field]) { // Loop through array of Service/Job Field Objects
                $(templateLinks[field][j]).each(function (_, fieldObject) {
                    var isLookupField = field.indexOf("_name") > -1;
                    var lookupField = field.substring(0, field.indexOf("_name"));

                    if ((isLookupField && relatedEntity[lookupField] && relatedEntity[lookupField].primaryName === fieldObject.value) ||
                        relatedEntity[field] === fieldObject.value) {

                        $(fieldObject.inspections["REQUIRED"]).each(function (_, inspectionName) {
                            var inspArr = $.grep(inspectionData, function (inspection) {
                                if (isEquipment) {
                                    return (inspection.resco_name === inspectionName) && inspection.equipmentid &&
                                        (inspection.equipmentid.id === relatedEntity.id)
                                }
                                else {
                                    return inspection.resco_name === inspectionName
                                }
                            });

                            if (inspArr.length < 1) {
                                validationItems[ValidationLevel.Required] = [Validation.Inspection];
                                return deferred.resolve(validationItems);
                            }
                        });

                        $(fieldObject.inspections["WARNING"]).each(function (_, inspectionName) {
                            var inspArr = $.grep(inspectionData, function (inspection) {
                                if (isEquipment) {
                                    return (inspection.resco_name === inspectionName) && inspection.equipmentid &&
                                        (inspection.equipmentid.id === relatedEntity.id)
                                }
                                else {
                                    return inspection.resco_name === inspectionName
                                }
                            });

                            if (inspArr.length < 1) {
                                validationItems[ValidationLevel.Warning] = [Validation.Inspection];
                            }
                        });
                    }
                });
            }
        }

    }

    return deferred.resolve(validationItems);
    return deferred.promise();
}