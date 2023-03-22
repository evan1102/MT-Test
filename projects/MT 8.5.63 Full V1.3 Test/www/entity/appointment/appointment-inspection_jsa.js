function checkUseInspections() {
    var deferred = $.Deferred();
    MobileCRM.Application.checkUserRoles(["Inspector"], function (roleCount) {
        if (roleCount !== 1) {
            return deferred.resolve(false);
        }
        else {
            var entity = new MobileCRM.FetchXml.Entity(SCHEMA.resco_questionnaire.name);
            entity.addAttribute(SCHEMA.resco_questionnaire.Properties.resco_name);
            var fetch = new MobileCRM.FetchXml.Fetch(entity);
            fetch.execute("JSON",
                function (res) {
                    fetchSetupOptionUser("UseLegacyJSA").then(function (res) {
                        var UseLegacyJSA = res[0] ? JSON.parse(res[0].optionvalue) : true;
                        return deferred.resolve(!UseLegacyJSA);
                    }, alertError);
                },
                function (err) { return deferred.resolve(false); }
            );
        }
    }, alertError);
    return deferred.promise();
}

function showJSAQuestionnaire(appt) {
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.resco_questionnaire.name);
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

    var combinedFilter = new MobileCRM.FetchXml.Filter();
    combinedFilter.filters.push(regardingFilter, templateFilter);
    combinedFilter.type = 'or';
    entity.filter.filters.push(combinedFilter);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        if (res.length === 1) {
            if (res[0].resco_istemplate === "True") {
                MobileCRM.DynamicEntity.loadById(SCHEMA.resco_questionnaire.name, res[0].resco_questionnaireid, function (q) {
                    var options = JSON.parse(q.properties.resco_options);
                    options.resco_regardingid = { id: appt.id, entityName: entityName };
                    q.properties.resco_options = JSON.stringify(options);

                    q.save(function (err) {
                        if (err) {
                            alertError(err);
                        }
                        else {
                            tryOpenJSA(this.id, appt);
                        }
                    })
                }, alertError);
            }
            else {
                tryOpenJSA(res[0].resco_questionnaireid, appt);
            }
        }
        else if (res.length === 2) {
            $(res).each(function (i, questionnaire) {
                if (questionnaire.resco_istemplate === "False") {
                    tryOpenJSA(questionnaire.resco_questionnaireid, appt);
                }
            });
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