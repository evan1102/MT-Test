const TaskValidationLevel = {
    Optional: '0',
    Warning: '1',
    Required: '2'
};
const TaskValidation = {
    TaskCompletion: 'Complete Tasks',
    TaskResponse: 'Complete Task Responses',
};

// ----- Form Validation -----
function validateAppointmentInformation() {
    if (setupOptions.TaskValidationLevel === TaskValidationLevel.Optional) {
        sayLocalization("Alert.TaskValidationPassed");
    }
    else {
        var itemsDeferred = [
            checkTaskCompletion(),
            checkTaskResponses()
        ];

        $.when.apply($, itemsDeferred).then(combineValidationItems, MobileCRM.bridge.alert)
            .then(function (trackedValidationFields) {

                if (trackedValidationFields[TaskValidationLevel.Required].length > 0) {
                    showValidationPrompt(TaskValidationLevel.Required, trackedValidationFields[TaskValidationLevel.Required]);
                }
                else if (trackedValidationFields[TaskValidationLevel.Warning].length > 0) {
                    showValidationPrompt(TaskValidationLevel.Warning, trackedValidationFields[TaskValidationLevel.Warning]);
                }
                else {
                    sayLocalization("Alert.TaskValidationPassed");
                }
            }, MobileCRM.bridge.alert);
    }
}

// --- Service Call Items: Task Completion ---
function checkTaskCompletion() {
    var deferred = $.Deferred();
    if (setupOptions.TaskValidationLevel === TaskValidationLevel.Optional)
        return deferred.resolve({});

    fetchDefaultOpenStatusId()
        .then(fetchOpenTasks, function (err) { return deferred.reject(err); })
        .then(function (openTasks) {
            var validationItems = {};
            if (openTasks.length > 0)
                validationItems[setupOptions.TaskValidationLevel] = [TaskValidation.TaskCompletion];

            return deferred.resolve(validationItems);
        }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function fetchDefaultOpenStatusId() {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.taskstatus.name);
    entity.addAttribute('id');
    entity.addFilter().where('name', 'eq', setupOptions.DefaultTaskStatus ? setupOptions.DefaultTaskStatus : "OPEN");

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        if (res[0])
            return deferred.resolve(res[0].id);
        else
            return deferred.reject("Default Open Task Status Not Found");

    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function fetchOpenTasks(openStatusID) {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.task.name);
    entity.addAttribute('id');
    entity.addFilter().where('recordlevel', 'eq', 4);
    entity.addFilter().where('servicecallid', 'eq', selected.servicecall.id);
    entity.addFilter().where('taskstatusid', 'eq', openStatusID);
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (res) { return deferred.resolve(res); },
        function (err) { return deferred.reject(err); }
    );
    return deferred.promise();
}

// --- Service Call Items: Task Responses ---
function checkTaskResponses() {
    var deferred = $.Deferred();

    // Check if there are any open task responses
    fetchAllTasks().then(function (tasks) {
        var itemsDeferred = [];
        var hasOpenResponses = false;
        $(tasks).each(function (i, task) {
            try {
                itemsDeferred.push(isMissingTaskResponse(task).then(function (openResponses) {
                    if (openResponses) {
                        hasOpenResponses = true;
                    }
                }));
            }
            catch (e) { return deferred.reject(e); }
        });

        $.when.apply($, itemsDeferred).then(function () {
            var validationItems = {};
            if (hasOpenResponses)
                validationItems[TaskValidationLevel.Required] = [TaskValidation.TaskResponse];

            return deferred.resolve(validationItems);
        }, alertError);
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}

function checkOpenRequiredResponses(task) {
    var deferred = $.Deferred();
    if (!task)
        return deferred.reject("Unable to check task responses: Missing task details");

    if (task.taskhierarchy !== undefined) {
        // Check within task hierarchy for missing required task responses 
        checkOpenRequiredResponsesForHierarchy(task).then(function (openResponses) {
            return deferred.resolve(openResponses);
        }, function (err) { return deferred.reject(err); });
    }
    else {
        // Just check if this task is missing required task responses
        isMissingTaskResponse(task).then(function (openResponses) {
            return deferred.resolve(openResponses);
        }, function (err) { return deferred.reject(err); });
    }
    return deferred.promise();
}
function checkOpenRequiredResponsesForHierarchy(selectedTask) {
    var deferred = $.Deferred();

    fetchAllTasksInHierarchy(selectedTask).then(function (tasks) {
        if (tasks.length === 0) {
            return deferred.reject("Check Responses Error: Unable to fetch tasks in hierarchy");
        }
        var itemsDeferred = [];
        var hasOpenResponses = false;
        $(tasks).each(function (i, task) {
            try {
                itemsDeferred.push(isMissingTaskResponse(task).then(function (openResponses) {
                    if (openResponses) {
                        hasOpenResponses = true;
                    }
                }, function (err) { deferred.reject(err); }));

                $.when.apply($, itemsDeferred).then(function () {
                    return deferred.resolve(hasOpenResponses ? "missingChildResponse" : false);
                });
            }
            catch (e) {
                return deferred.reject(e);
            }
        });
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}

function fetchAllTasks() {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.task.name);
    entity.addAttributes();
    entity.orderBy(SCHEMA.task.Properties.gptasklinenumber, false);
    entity.addFilter().where(SCHEMA.task.Properties.servicecallid, 'eq', selected.servicecall.id);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (res) { return deferred.resolve(res); },
        function (err) { return deferred.reject(err); }
    );
    return deferred.promise();
}
function fetchRequiredTaskResponses(taskID) {
    var deferred = $.Deferred();
    if (!taskID) return deferred.reject("Missing Task ID");

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.taskresponse.name);
    entity.addAttribute('responsetype');
    entity.addAttribute('stringresponse');
    entity.addAttribute('numericresponse');
    entity.addAttribute('integerresponse');
    entity.addAttribute('textresponse');
    entity.addAttribute('dateresponse');
    entity.orderBy('linenumber', false);

    entity.addFilter().where('taskid', 'eq', taskID);
    entity.addFilter().where('isrequired', 'eq', 1);
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (res) { return deferred.resolve(res); },
        function (err) { return deferred.reject(err); }
    );
    return deferred.promise();
}
function fetchAllTasksInHierarchy(task) {
    var deferred = $.Deferred();
    if (!task) return deferred.reject("Missing Task");

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.task.name);
    entity.addAttributes();
    entity.orderBy(SCHEMA.task.Properties.taskhierarchy, false);

    entity.addFilter().where(SCHEMA.task.Properties.gpservicecallid, 'eq', task.gpservicecallid);
    entity.addFilter().where(SCHEMA.task.Properties.gptasklinenumber, 'ge', task.gptasklinenumber);
    if (task.gptasklistid) {
        entity.addFilter().where(SCHEMA.task.Properties.gptasklistid, 'eq', task.gptasklistid);
    }
    else {
        entity.addFilter().where(SCHEMA.task.Properties.gptasklistid, 'null');
    }
    if (task.gpsublocationid) {
        entity.addFilter().where(SCHEMA.task.Properties.gpsublocationid, 'eq', task.gpsublocationid);
    }
    else {
        entity.addFilter().where(SCHEMA.task.Properties.gpsublocationid, 'null');
    }
    if (task.gpequipmentid) {
        entity.addFilter().where(SCHEMA.task.Properties.gpequipmentid, 'eq', task.gpequipmentid);
    }
    else {
        entity.addFilter().where(SCHEMA.task.Properties.gpequipmentid, 'null');
    }
    entity.addFilter().startsWith(SCHEMA.task.Properties.taskhierarchy, task.taskhierarchy);
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (res) { return deferred.resolve(res); },
        function (err) { return deferred.reject(err); }
    );
    return deferred.promise();
}

function isMissingTaskResponse(task) {
    var deferred = $.Deferred();
    if (!task) {
        return deferred.reject("Missing Task Response Error: Missing Task Details");
    }

    isTaskResponseSkippable(task).then(function (isSkippable) {
        if (isSkippable) {
            return deferred.resolve(false);
        }
        else {
            isMissingRequiredTaskResponse(task.id).then(function (openResponses) {
                return deferred.resolve(openResponses);
            }, function (err) { return deferred.reject(err); });
        }
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}

function isTaskResponseSkippable(task) {
    var deferred = $.Deferred();
    if (!task) {
        return deferred.reject("Is Task Response Skippable Error: Missing Task Details");
    }

    hasSkippableTaskResponses(task.id).then(function (skippableResponse) {
        if (skippableResponse) {
            return deferred.resolve(true);
        }

        fetchParentOfSkippedTask(task).then(function (parentTask) {
            if (parentTask) {
                return deferred.resolve(true);
            }
            else {
                return deferred.resolve(false);
            }
        }, function (err) { return deferred.reject(err); });
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function hasSkippableTaskResponses(taskID) {
    var deferred = $.Deferred();
    if (!taskID) return deferred.reject("Missing Task ID");

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.taskresponse.name);
    entity.addAttribute(SCHEMA.taskresponse.Properties.id);
    entity.addFilter().where(SCHEMA.taskresponse.Properties.responsetype, 'eq', 4); // Yes/No Response
    entity.addFilter().where(SCHEMA.taskresponse.Properties.canskip, 'eq', 1);
    entity.addFilter().where(SCHEMA.taskresponse.Properties.integerresponse, 'eq', 1); // 1: No - Skip child Task
    entity.addFilter().where(SCHEMA.taskresponse.Properties.taskid, 'eq', taskID);
    entity.filter.type = 'and';

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (res) { return deferred.resolve(res.length > 0); },
        function (err) { return deferred.reject(err); }
    );
    return deferred.promise();
}

function isMissingRequiredTaskResponse(taskID) {
    var deferred = $.Deferred();
    if (!taskID) return deferred.reject("Missing Task ID");
    var missingResponses = false;

    fetchRequiredTaskResponses(taskID).then(function (requiredResponses) {
        var itemsDeferred = [];
        $(requiredResponses).each(function (i, response) {
            itemsDeferred.push(
                isTaskResponseNeeded(response).then(function (isNeeded) {
                    if (isNeeded)
                        missingResponses = true;
                }, MobileCRM.bridge.alert)
            );
        });

        $.when.apply($, itemsDeferred).then(function () {
            return deferred.resolve(missingResponses);
        });
    }, function (err) { return deferred.reject(err); });

    return deferred.promise();
}
function isTaskResponseNeeded(response) {
    var deferred = $.Deferred();

    switch (parseInt(response.responsetype)) {
        case 1: case 5:     // String, List String
            return deferred.resolve(!response.stringresponse || $.trim(response.stringresponse) === "");
        case 2: case 3: case 4:    // Numeric Decimal, Integer, Yes No DDL
            if (!response.dateresponse) {
                return deferred.resolve(true);
            }
            else {
                var dateResponded = new Date(response.dateresponse);
                return deferred.resolve(dateResponded.getFullYear() <= 1900);
            }
        case 7:     // Repair DDL
            return deferred.resolve(!response.integerresponse || parseInt(response.integerresponse) === 0);
        case 6:     // Text
            return deferred.resolve(!response.textresponse || $.trim(response.textresponse) === "");
        case 8:     // Date
            return deferred.resolve(!response.dateresponse || (new Date(response.dateresponse)).getFullYear() <= 1901);
        default:
            return deferred.resolve(false);
    }

    return deferred.promise();
}

function combineValidationItems() {
    var deferred = $.Deferred();
    var combinedValidationFields = {};
    combinedValidationFields[TaskValidationLevel.Required] = [];
    combinedValidationFields[TaskValidationLevel.Warning] = [];

    $(arguments).each(function (i, e) {
        $(e[TaskValidationLevel.Required]).each(function (index, label) {
            combinedValidationFields[TaskValidationLevel.Required].push(label);
        });

        $(e[TaskValidationLevel.Warning]).each(function (index, label) {
            combinedValidationFields[TaskValidationLevel.Warning].push(label);
        });
    });

    return deferred.resolve(combinedValidationFields);
    return deferred.promise();
}
function showValidationPrompt(level, validationItems) {
    var msg = "Missing " + (level === TaskValidationLevel.Required ? "Required" : "Recommended");
    $(validationItems).each(function (i, item) {
        if (item === TaskValidation.TaskCompletion) {
            msg += i > 0 ? " and Task Completions" : " Task Completions";
        }
        if (item === TaskValidation.TaskResponse) {
            msg += i > 0 ? " and Task Responses" : " Task Responses";
        }
    });
    MobileCRM.UI.MessageBox.sayText(msg, function () { });
}