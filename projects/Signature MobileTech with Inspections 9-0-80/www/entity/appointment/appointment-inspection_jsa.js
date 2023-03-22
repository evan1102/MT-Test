function checkUseInspections() {
    var deferred = $.Deferred();
    MobileCRM.Application.checkUserRoles(["Inspector"], function (roleCount) {
        if (roleCount !== 1) {
            return deferred.resolve(false);
        }
        else {
            MobileCRM.Metadata.requestObject(function (metadata) {
                if (MobileCRM.Metadata.getEntity(SCHEMA.resco_questionnaire.name)) {
                    fetchSetupOptionUser("UseLegacyJSA").then(function (res) {
                        if (res.length <= 1) {
                            var UseLegacyJSA = res[0] ? JSON.parse(res[0].optionvalue) : true;
                            return deferred.resolve(!UseLegacyJSA);
                        }
                        else {
                            // Cleanup duplicate setupoptionuser values
                            var duplicateCheck = new DevExpress.data.DataSource({
                                store: res,
                                sort: { selector: SCHEMA.setupoptionuser.Properties.modifiedon, desc: true },
                                paginate: false
                            });
                            duplicateCheck.load().done(function (data) {
                                var itemsDeferred = [];
                                var UseLegacyJSA = true;

                                $(data).each(function (i) {
                                    if (i === 0) {  // Keep the last modified value
                                        UseLegacyJSA = JSON.parse(data[i].optionvalue);
                                    }
                                    else {
                                        itemsDeferred.push(deleteSetupOptionUser(data[i].id));
                                    }

                                    $.when.apply($, itemsDeferred).then(function () {
                                        return deferred.resolve(!UseLegacyJSA);
                                    }, function (err) {
                                        return deferred.reject("Cleanup Duplicate Setupoptionuser Values Error: " + err);
                                    });
                                });
                            });
                        }
                    }, alertError);
                }
                else {
                    return deferred.resolve(false);
                }
            }, function (err) {
                return deferred.reject("Request Metadata Error: " + err);
            });
        }
    }, alertError);
    return deferred.promise();
}

function deleteSetupOptionUser(entityID) {
    var deferred = $.Deferred();
    MobileCRM.DynamicEntity.deleteById(SCHEMA.setupoptionuser.name, entityID,
        function () { return deferred.resolve(); },
        function (err) { return deferred.reject("Delete Entity Error: " + err); }
    );
    return deferred.promise();
}

function showJSAQuestionnaire(appt) {
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.resco_questionnaire.name);
    entity.orderBy(SCHEMA.resco_questionnaire.Properties.modifiedon, true);
    entity.addAttribute(SCHEMA.resco_questionnaire.Properties.resco_questionnaireid);
    entity.addAttribute(SCHEMA.resco_questionnaire.Properties.resco_istemplate);
    entity.addAttribute(SCHEMA.resco_questionnaire.Properties.modifiedon);
    entity.addFilter().where(SCHEMA.resco_questionnaire.Properties.resco_name, 'eq', jsaName);

    // Check if JSA has already been started for this appointment,
    // otherwise fetch JSA Questionnaire Template ID
    var regardingFilter = new MobileCRM.FetchXml.Filter();
    regardingFilter.where(SCHEMA.resco_questionnaire.Properties.resco_regardingid, 'eq', appt.id);

    var templateFilter = new MobileCRM.FetchXml.Filter();
    templateFilter.where(SCHEMA.resco_questionnaire.Properties.resco_istemplate, 'eq', 1);
    templateFilter.where(SCHEMA.resco_questionnaire.Properties.resco_archivedon, 'null');
    templateFilter.type = 'and';

    var combinedFilter = new MobileCRM.FetchXml.Filter();
    combinedFilter.filters.push(regardingFilter, templateFilter);
    combinedFilter.type = 'or';
    entity.filter.filters.push(combinedFilter);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        if (res.length === 1) {
            if (res[0].resco_istemplate === "True") {
                createNewInspectionFromTemplate(res[0].resco_questionnaireid, appt).then(function (inspectionId) {
                    tryOpenJSA(inspectionId, appt);
                }, alertError);
            }
            else {
                tryOpenJSA(res[0].resco_questionnaireid, appt);
            }
        }
        else if (res.length === 2) {
            var hasInProgressInspection = false;
            $(res).each(function (i, questionnaire) {
                if (questionnaire.resco_istemplate === "False") {
                    hasInProgressInspection = true;
                    tryOpenJSA(questionnaire.resco_questionnaireid, appt);
                }
            });
            if (!hasInProgressInspection) {
                createNewInspectionFromTemplate(res[0].resco_questionnaireid, appt).then(function (inspectionId) {
                    tryOpenJSA(inspectionId, appt);
                }, alertError);
            }
        }
        else if (res.length > 2) {
            // Need to delete duplicate JSA, keep entity with latest modifiedon date
            var latestQuestionnaire = null;
            var duplicates = [];

            $(res).each(function (i, questionnaire) {
                if (questionnaire.resco_istemplate === "False") {
                    if (!latestQuestionnaire) {
                        latestQuestionnaire = questionnaire;
                    }
                    else {
                        var latestDate = new Date(latestQuestionnaire.modifiedon);
                        var compareDate = new Date(questionnaire.modifiedon);

                        if (compareDate > latestDate) {
                            duplicates.push(latestQuestionnaire);
                            latestQuestionnaire = questionnaire;
                        }
                        else {
                            duplicates.push(questionnaire);
                        }
                    }
                }
            });

            if (latestQuestionnaire) {
                tryOpenJSA(latestQuestionnaire.resco_questionnaireid, appt);
            }

            $(duplicates).each(function (i, questionnaire) {
                MobileCRM.DynamicEntity.deleteById(SCHEMA.resco_questionnaire.name, questionnaire.resco_questionnaireid, function () {
                    deleteRelatedQuestions(questionnaire.resco_questionnaireid);
                    deleteRelatedQuestionGroups(questionnaire.resco_questionnaireid);
                }, alertError);
            });
        }
        else {
            alertError("Complete Appointment Error:\nUnable to Load JSA Questionnaire Template");
        }
    }, alertError);
}

function createNewInspectionFromTemplate(templateId, appt) {
    var deferred = $.Deferred();
    if (!templateId) {
        return deferred.reject("Create New Inspection From Template Error: Missing template ID");
    }
    if (!appt) {
        return deferred.reject("Create New Inspection From Template Error: Missing appointment details");
    }
    try {
        fetchSystemUserName().then(function (inspectorName) {
            MobileCRM.DynamicEntity.loadById(SCHEMA.resco_questionnaire.name, templateId, function (template) {
                if (template.properties.resco_templatedependent) {
                    var entity = new MobileCRM.DynamicEntity(SCHEMA.resco_questionnaire.name);
                    entity.properties.resco_name = template.properties.resco_name;
                    entity.properties.resco_istemplate = false;
                    entity.properties.resco_serializedanswers = JSON.stringify({
                        "@q": {
                            "defanswers": 0,
                            "ds": "annotation"
                        },
                        "@root": {
                            "date": new Date(),
                            "inspector-name": inspectorName,
                            "resco_regardingid": "appointment;" + appt.id
                        },
                        "@ver": "m1.0",
                        "additional-hazard-assessments": [
                            {}
                        ],
                        "signature_1": [
                            {}
                        ]
                    });

                    entity.properties.resco_templateid = template;
                    entity.properties.resco_version = template.properties.resco_version ? template.properties.resco_version : 1;
                    entity.properties.resco_issnippet = false;
                    entity.properties.resco_regardingid = appt.id;
                    entity.properties.resco_regardingidname = SCHEMA.appointment.name;
                    entity.properties.resco_regardingidlabel = appt.properties ? appt.properties.name : appt.primaryName;
                    entity.properties.resco_reusefromprevious = template.properties.resco_reusefromprevious;
                    entity.properties.resco_versionname = template.properties.resco_versionname;
                    entity.properties.resco_templatedependent = template.properties.resco_templatedependent;
                    entity.properties.resco_featureversion = template.properties.resco_featureversion;

                    entity.save(function (err) {
                        if (err) {
                            return deferred.reject("Save new inspection from template error: " + err);
                        }
                        else {
                            return deferred.resolve(this.id);
                        }
                    });
                }
                else {
                    var options = JSON.parse(template.properties.resco_options);
                    options.resco_regardingid = { id: appt.id, entityName: entityName };
                    template.properties.resco_options = JSON.stringify(options);

                    template.save(function (err) {
                        if (err) {
                            return deferred.reject("Update Inspection Template Error: " + err);
                        }
                        else {
                            return deferred.resolve(this.id);
                        }
                    });
                }
            }, function (err) {
                return deferred.reject("Create new inspection error - load Template details: " + err);
            });
        }, alertError);
    }
    catch (e) {
        return deferred.reject("Create New Inspection from Template Error: " + e);
    }

    return deferred.promise();
}
function fetchSystemUserName() {
    var deferred = $.Deferred();
    try {
        var entity = new MobileCRM.FetchXml.Entity(SCHEMA.systemuser.name);
        entity.addAttribute(SCHEMA.systemuser.Properties.name);

        var fetch = new MobileCRM.FetchXml.Fetch(entity);
        fetch.execute("JSON", function (res) {
            return res.length === 1 ? deferred.resolve(res[0].name) : deferred.reject("System User Not Found");
        }, function (err) { return deferred.reject(err); });
    }
    catch (e) {
        return deferred.reject("Fetch System User " + e);
    }
    return deferred.promise();
}

function tryOpenJSA(id, appt) {
    loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Msg.Loading"));
    var otherFormOpen = false;

    MobileCRM.bridge.onGlobalEvent("OtherJSAOpen", function (args) {
        otherFormOpen = true;
    }, true);
    MobileCRM.bridge.raiseGlobalEvent("OpeningJSA", { resco_questionnaireid: id });

    setTimeout(function () {
        loading.close();

        if (otherFormOpen) {
            sayLocalization("Alert.SaveQuestionnaireFirst");
        }
        else {
            MobileCRM.Questionnaire.showForm(id, alertError, appt);
        }
    }, 3000);
}

function deleteRelatedQuestions(resco_questionnaireid) {
    if (!resco_questionnaireid) {
        alertError("Delete Related Question Error: Missing Questionnaire Details");
        return;
    }

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.resco_question.name);
    entity.addAttribute(SCHEMA.resco_question.Properties.resco_questionid);
    entity.addFilter().where(SCHEMA.resco_question.Properties.resco_questionnaireid, 'eq', resco_questionnaireid);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        $(res).each(function (i, questionGroup) {
            MobileCRM.DynamicEntity.deleteById(
                SCHEMA.resco_question.name,
                questionGroup.resco_questionid,
                function () { },
                function (err) {
                    alertError("Delete Question Group Error: " + err);
                }
            );
        });
    }, alertError);
}

function deleteRelatedQuestionGroups(resco_questionnaireid) {
    if (!resco_questionnaireid) {
        alertError("Delete Related Question Group Error: Missing Questionnaire Details");
        return;
    }

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.resco_questiongroup.name);
    entity.addAttribute(SCHEMA.resco_questiongroup.Properties.resco_questiongroupid);
    entity.addFilter().where(SCHEMA.resco_questiongroup.Properties.resco_questionnaireid, 'eq', resco_questionnaireid);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        $(res).each(function (i, questionGroup) {
            MobileCRM.DynamicEntity.deleteById(
                SCHEMA.resco_questiongroup.name,
                questionGroup.resco_questiongroupid,
                function () { },
                function (err) {
                    alertError("Delete Question Group Error: " + err);
                }
            );
        });
    }, alertError);
}