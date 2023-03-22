//============== TOOLBAR ITEMS ================
var taskFormToolbarItems = [
    {
        location: "after",
        widget: "dxButton",
        options: {
            type: "normal",
            icon: 'chevronleft',
            onClick: taskFormPreviousClicked
        }
    },
    {
        location: "after",
        widget: "dxButton",
        options: {
            type: "normal",
            icon: 'chevronright',
            onClick: taskFormNextClicked
        }
    }
];

var subTaskFormToolbarItems = [
    {
        location: "after",
        widget: "dxButton",
        options: {
            type: "normal",
            icon: 'chevronleft',
            onClick: subTaskFormPreviousClicked
        }
    },
    {
        location: "after",
        widget: "dxButton",
        options: {
            type: "normal",
            icon: 'chevronright',
            onClick: subTaskFormNextClicked
        }
    }
];

//============== FORM ITEMS ================
function getTaskFormItems(taskId, statuses, setupOptions) {
    var deferred = $.Deferred();

    var taskFormItems = [
        {
            name: SCHEMA.task.Properties.id,
            dataField: SCHEMA.task.Properties.id,
            visible: false
        },
        {
            name: SCHEMA.task.Properties.gpsublocationid,
            dataField: SCHEMA.task.Properties.gpsublocationid,
            editorOptions: { readOnly: true },
            label: { text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.gpsublocationid) }
        },
        {
            id: SCHEMA.task.Properties.equipmentid,
            dataField: SCHEMA.task.Properties.equipmentid,
            editorOptions: { readOnly: true },
            label: { text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.equipmentid) }
        },
        {
            id: SCHEMA.task.Properties.equipmentid,
            dataField: SCHEMA.task.Properties.gptasklistid,
            editorOptions: { readOnly: true },
            label: { text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.gptasklistid) }
        },
        {
            id: SCHEMA.task.Properties.gptaskcode,
            dataField: SCHEMA.task.Properties.gptaskcode,
            editorOptions: { readOnly: true },
            label: { text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.gptaskcode) }
        },
        {
            id: SCHEMA.task.Properties.description,
            dataField: SCHEMA.task.Properties.description,
            editorType: "dxTextArea",
            editorOptions: { readOnly: true, height: "100px" },
            label: { text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.description) }
        },
        {
            id: SCHEMA.task.Properties.comment,
            dataField: SCHEMA.task.Properties.comment,
            editorType: "dxTextArea",
            editorOptions: { maxLength: 121 },
            label: { text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.comment) }
        },
        {
            id: SCHEMA.task.Properties.estimatehours,
            dataField: SCHEMA.task.Properties.estimatehours,
            editorOptions: {
                readOnly: true,
                visible: !setupOptions.HideTaskEstimateHours
            },
            label: {
                text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.estimatehours),
                visible: !setupOptions.HideTaskEstimateHours
            }
        },
        {
            id: "taskstatusid.id",
            dataField: "taskstatusid.id",
            editorType: "dxSelectBox",
            editorOptions: {
                dataSource: statuses,
                displayExpr: "primaryName",
                valueExpr: "id",
                onSelectionChanged: taskFormStatusSelected
            },
            label: { text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.taskstatusid) }
        },
        {
            id: SCHEMA.task.Properties.completiondate,
            dataField: SCHEMA.task.Properties.completiondate,
            editorType: "dxDateBox",
            editorOptions: {
                width: '100%',
                onFocusIn: dateBoxFocusIn,
                onInitialized: dateBoxInitialized
            },
            label: { text: MobileCRM.Localization.get(SCHEMA.task.name + "." + SCHEMA.task.Properties.completiondate) }
        }
    ];

    // ----- Task Response Form Items -----
    var taskResponseEntity = new MobileCRM.FetchXml.Entity(SCHEMA.taskresponse.name);
    taskResponseEntity.addAttributes();
    taskResponseEntity.filter = new MobileCRM.FetchXml.Filter();
    taskResponseEntity.filter.where(SCHEMA.taskresponse.Properties.taskid, 'eq', taskId);
    taskResponseEntity.orderBy(SCHEMA.taskresponse.Properties.linenumber, false);

    var fetch = new MobileCRM.FetchXml.Fetch(taskResponseEntity);
    fetch.execute("JSON", function (result) {
        $.each(result, function (i, taskResponse) {
            var item = null;
            var lblResponse = MobileCRM.Localization.get(SCHEMA.taskresponse.name);

            switch (parseInt(taskResponse.responsetype)) {
                case 1: // string
                    item = {
                        id: taskResponse.id,
                        name: "tr_" + taskResponse.id,
                        dataField: "tr_" + taskResponse.id,
                        label: { text: taskResponse.responselabel ? taskResponse.responselabel : lblResponse },
                        editorType: "dxTextArea",
                        editorOptions: { height: 100, showClearButton: true, maxLength: 101 }
                    }
                    break;
                case 2: // numeric decimal
                    item = {
                        id: taskResponse.id,
                        name: "tr_" + taskResponse.id,
                        dataField: "tr_" + taskResponse.id,
                        editorType: "dxNumberBox",
                        editorOptions: {
                            showSpinButtons: true,
                            useLargeSpinButtons: true,
                            step: .25,
                            showClearButton: true,
                            onValueChanged: function (e) {
                                e.component.option('value', parseFloat(e.value).toFixed(5));
                            },
                            onContentReady: function (e) {
                                // Display keyboard with negative sign "-"
                                var inputElm = e.element[0].getElementsByClassName('dx-texteditor-input')[0];
                                inputElm.setAttribute('inputmode', 'text');
                            }
                        },
                        label: { text: taskResponse.responselabel ? taskResponse.responselabel : lblResponse }
                    }
                    break;
                case 3: // integer
                    item = {
                        id: taskResponse.id,
                        name: "tr_" + taskResponse.id,
                        dataField: "tr_" + taskResponse.id,
                        editorType: "dxNumberBox",
                        editorOptions: {
                            showSpinButtons: true,
                            useLargeSpinButtons: true,
                            step: 1,
                            showClearButton: true,
                            onInput: function (e) {
                                var inputElm = e.element[0].getElementsByClassName('dx-texteditor-input')[0];
                                inputElm.value = parseInt(inputElm.value);
                            },
                            valueChangeEvent: "keyup"
                        },
                        label: { text: taskResponse.responselabel ? taskResponse.responselabel : lblResponse }
                    }
                    break;
                case 4: // yes/no ddl
                    item = {
                        id: taskResponse.id,
                        name: "tr_" + taskResponse.id,
                        dataField: "tr_" + taskResponse.id,
                        editorType: "dxSelectBox",
                        editorOptions: {
                            showClearButton: true,
                            items: [
                                { id: 0, text: "None" },
                                { id: 2, text: "Yes" },
                                { id: 1, text: "No" }
                            ],
                            displayExpr: "text",
                            valueExpr: "id",
                            onValueChanged: function (e) {
                                yesNoResponseChanged(e, taskResponse.canskip);
                            }
                        },
                        label: { text: taskResponse.responselabel ? taskResponse.responselabel : lblResponse }
                    }
                    break;
                case 5: // List response
                    item = {
                        id: taskResponse.id,
                        name: "tr_" + taskResponse.id,
                        dataField: "tr_" + taskResponse.id,
                        editorType: "dxSelectBox",
                        editorOptions: {
                            showClearButton: true,
                            displayExpr: "responsevalue",
                            valueExpr: "responsevalue",
                            items: [] // gets populated at runtime
                        },
                        label: { text: taskResponse.responselabel ? taskResponse.responselabel : lblResponse }
                    }
                    break;
                case 6: //text response
                    item = {
                        id: taskResponse.id,
                        name: "tr_" + taskResponse.id,
                        dataField: "tr_" + taskResponse.id,
                        label: { text: taskResponse.responselabel ? taskResponse.responselabel : lblResponse },
                        editorType: "dxTextArea",
                        editorOptions: { height: 100, showClearButton: true }
                    }
                    break;
                case 7: // repair ddl
                    item = {
                        id: taskResponse.id,
                        name: "tr_" + taskResponse.id,
                        dataField: "tr_" + taskResponse.id,
                        editorType: "dxSelectBox",
                        editorOptions: {
                            showClearButton: true,
                            items: [
                                { id: 0, text: "None" },
                                { id: 1, text: "Billable" },
                                { id: 2, text: "No" },
                                { id: 3, text: "Yes" }
                            ],
                            displayExpr: "text",
                            valueExpr: "id"
                        },
                        label: { text: taskResponse.responselabel ? taskResponse.responselabel : lblResponse }
                    }
                    break;
                case 8:
                    item = {
                        id: taskResponse.id,
                        name: "tr_" + taskResponse.id,
                        dataField: "tr_" + taskResponse.id,
                        editorType: "dxDateBox",
                        label: { text: taskResponse.responselabel ? taskResponse.responselabel : lblResponse },
                        editorOptions: {
                            onFocusIn: dateBoxFocusIn,
                            onInitialized: dateBoxInitialized
                        }
                    }
                    break;
            }

            if (item !== null) {
                if (taskResponse.isrequired && taskResponse.isrequired === "True") {
                    item.validationRules = [{
                        type: "required",
                        message: "Response is required"
                    }]
                }
                taskFormItems.push(item);
            }
        });
        return deferred.resolve(taskFormItems);
    }, function (error) {
        MobileCRM.bridge.alert(error);
        return deferred.resolve(taskFormItems);
    }, null);

    return deferred.promise();
}

function getSubTaskFormItems(statuses, setupOptions) {
    var deferred = $.Deferred();

    $(function () {
        var taskFormItems = [
            {
                name: SCHEMA.subtask.Properties.id,
                dataField: SCHEMA.subtask.Properties.id,
                visible: false
            },
            {
                name: SCHEMA.subtask.Properties.gpsublocationid,
                dataField: SCHEMA.subtask.Properties.gpsublocationid,
                editorOptions: { readOnly: true },
                label: { text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.gpsublocationid) }
            },
            {
                id: SCHEMA.subtask.Properties.equipmentid,
                dataField: SCHEMA.subtask.Properties.equipmentid,
                editorOptions: { readOnly: true },
                label: { text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.equipmentid) }
            },
            {
                id: SCHEMA.subtask.Properties.equipmentid,
                dataField: SCHEMA.subtask.Properties.gptasklistid,
                editorOptions: { readOnly: true },
                label: { text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.gptasklistid) }
            },
            {
                id: SCHEMA.subtask.Properties.gptaskcode,
                dataField: SCHEMA.subtask.Properties.gptaskcode,
                editorOptions: { readOnly: true },
                label: { text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.gptaskcode) }
            },
            {
                id: SCHEMA.subtask.Properties.gpsubtaskcode,
                dataField: SCHEMA.subtask.Properties.gpsubtaskcode,
                editorOptions: { readOnly: true },
                label: { text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.gpsubtaskcode) }
            },
            {
                id: SCHEMA.subtask.Properties.description,
                dataField: SCHEMA.subtask.Properties.description,
                editorType: "dxTextArea",
                editorOptions: { readOnly: true, height: "100px" },
                label: { text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.description) }
            },
            {
                id: SCHEMA.subtask.Properties.estimatehours,
                dataField: SCHEMA.subtask.Properties.estimatehours,
                editorOptions: {
                    readOnly: true,
                    visible: !setupOptions.HideTaskEstimateHours
                },
                label: {
                    text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.estimatehours),
                    visible: !setupOptions.HideTaskEstimateHours
                }
            },
            {
                id: "taskstatusid.id",
                dataField: "taskstatusid.id",
                editorType: "dxSelectBox",
                editorOptions: {
                    dataSource: statuses,
                    displayExpr: "primaryName",
                    valueExpr: "id",
                    onSelectionChanged: subTaskFormStatusSelected
                },
                label: { text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.taskstatusid) }
            },
            {
                id: SCHEMA.subtask.Properties.completiondate,
                dataField: SCHEMA.subtask.Properties.completiondate,
                editorType: "dxDateBox",
                editorOptions: {
                    width: '100%',
                    onFocusIn: dateBoxFocusIn,
                    onInitialized: dateBoxInitialized
                },
                label: { text: MobileCRM.Localization.get(SCHEMA.subtask.name + "." + SCHEMA.subtask.Properties.completiondate) }
            }
        ]

        return deferred.resolve(taskFormItems);
    })
    return deferred.promise();
}

//============== ACCORDION ================
function buildAccordionItemsList(showSubTasks, showTaskMaterial, hasNote) {
    var lblTask = MobileCRM.Localization.get(SCHEMA.task.name);
    accordionItems = [];
    accordionItems.push({
        id: 0,
        tabName: lblTask + " " + MobileCRM.Localization.get("DetailView.Details"),
        scrollViewID: 'taskScrollView'
    });
    if (setupOptions.UseTaskMaterials && showTaskMaterial) {
        accordionItems.push({
            id: 1,
            tabName: MobileCRM.Localization.getPlural(SCHEMA.taskmaterial.name),
            scrollViewID: 'taskMaterialScrollView'
        });
    }
    if (showSubTasks) {
        accordionItems.push({
            id: 2,
            tabName: MobileCRM.Localization.getPlural(SCHEMA.subtask.name),
            scrollViewID: 'subTaskScrollView'
        });
    }
    accordionItems.push({
        id: 3,
        tabName: lblTask + " " + MobileCRM.Localization.getPlural('attachment'),
        scrollViewID: 'taskAttachmentScrollView'
    });
    if (hasNote) {
        accordionItems.push({
            id: 4,
            tabName: lblTask + " " + MobileCRM.Localization.get('note'),
            scrollViewID: 'taskNoteScrollView'
        });
    }
    if (selected.servicecall && selected.servicecall.properties.gpcalltype === "MCC") {
        accordionItems.push({
            id: 5,
            tabName: MobileCRM.Localization.get(SCHEMA.taskresponsehistory.name),
            scrollViewID: 'responseHistoryScrollView'
        });
    }
}

function loadTaskNote(taskId) {
    fetchTaskNote(taskId).then(function (note) {
        if (note) {
            var taskNoteScrollView = $("#taskNoteScrollView").dxScrollView("instance");
            var height = taskNoteScrollView ? taskNoteScrollView.option("height") - 10 : "50vh";

            $("#taskNote").dxTextArea({
                value: note.notetext,
                height: height,
                readOnly: true
            });
        }
    }, alertError);
}
function fetchTaskNote(taskId) {
    var deferred = $.Deferred();
    try {
        var entity = new MobileCRM.FetchXml.Entity(SCHEMA.annotation.name);
        entity.addAttribute(SCHEMA.annotation.Properties.notetext);
        entity.addFilter().where(SCHEMA.annotation.Properties.isdocument, 'eq', false);
        entity.addFilter().where(SCHEMA.annotation.Properties.gpnotetype, 'eq', 'T');
        entity.addFilter().where(SCHEMA.annotation.Properties.objectid, 'eq', taskId);
        entity.addFilter().where(SCHEMA.annotation.Properties.subject, 'eq', "Maintenance Task");

        var fetch = new MobileCRM.FetchXml.Fetch(entity);
        fetch.execute("JSON", function (res) {
            if (res.length > 1) {
                return deferred.reject("Error: Fetch Task Note returned " + res.length + " results.");
            }
            else {
                return deferred.resolve(res[0] ? res[0] : null);
            }
        }, function (err) {
            return deferred.reject("Fetch Task Note Error: " + err);
        });
    }
    catch (e) {
        return deferred.reject("Fetch Task Note Error: " + e);
    }

    return deferred.promise();
}


//============== TOOLBAR FUNCTIONS ================
function taskFormPreviousClicked() {
    var taskForm = $('#taskForm').dxForm('instance');
    var result = taskForm.validate();
    if (result.isValid || taskForm.option('formData').taskstatusid.primaryName !== completeStatus) {
        loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Alert.SavingTask"));
        var promise = saveTask();
        promise.then(function (taskSaved) {
            if (selected.task.canSkipChildren || selected.task.canSkipChildren === false) {
                var status = selected.task.canSkipChildren ? skippedStatus : openStatus;
                setChildrenTasksStatus(status).then(function () {
                    loading.close();
                    if (taskSaved) {
                        getPreviousTask();
                    }
                }, alertError);
            }
            else {
                loading.close();
                if (taskSaved) {
                    getPreviousTask();
                }
            }
        }, alertError);
    }
    else {
        sayLocalization("Alert.RequiredInfoIsMissing");
    }
}
function getPreviousTask() {
    if (previousTask !== null) {
        formAccordion.option('selectedIndex', 0);

        // Select Previous Task and Check if it has a Parent Task that can Skip Children
        var isListGrouped = parseInt($('#viewSelector').dxSelectBox('instance').option('value')) !== 2;
        var totalGroupsDisplayed = mainList.option('items').length;  // Total Groups Currently Displaying
        if (isListGrouped && previousTask.group > totalGroupsDisplayed - 1) { // group is array index
            var listDataSource = mainList.getDataSource();
            var totalGroupsNoFilter = new DevExpress.data.DataSource({
                store: {
                    type: "array",
                    key: "id",
                    data: entityListData
                },
                paginate: false,
                group: listDataSource.group()
            });
            totalGroupsNoFilter.load().done(function (data) {
                var groupOffset = data.length - totalGroupsDisplayed;
                previousTask.group = previousTask.group - groupOffset;

                mainList.scrollToItem(previousTask);
                mainList.selectItem(previousTask);
                selected[entityName] = mainList.option('selectedItem').items[0];
            });
        }
        else {
            mainList.scrollToItem(isListGrouped ? previousTask : previousTask.item);
            mainList.selectItem(isListGrouped ? previousTask : previousTask.item);
            selected[entityName] = isListGrouped ? mainList.option('selectedItem').items[0] : mainList.option('selectedItem');
        }

        fetchParentOfSkippedTask(selected.task).then(function (parentTask) {
            if (parentTask) {
                var isListGrouped = parseInt($('#viewSelector').dxSelectBox('instance').option('value')) !== 2;

                $.each(itemIndexing, function (index, item) {
                    if (item.taskid === parentTask.id) {
                        itemIndex = isListGrouped ? { group: item.group, item: item.item } : { item: item.item };
                        return false;
                    }
                });

                selectItemAndShowTask(itemIndex);
            }
            else {
                showTask(selected[entityName]);
            }
        }, alertError);
    }
    else {
        // close the popup form
        $("#formPopup").dxPopup('instance').hide();
    }
}

function taskFormNextClicked() {
    var taskForm = $('#taskForm').dxForm('instance');
    var result = taskForm.validate();
    if (result.isValid || taskForm.option('formData').taskstatusid.primaryName !== completeStatus) {
        loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Alert.SavingTask"));
        var promise = saveTask();
        promise.then(function (taskSaved) {
            if (selected.task.canSkipChildren || selected.task.canSkipChildren === false) {
                var status = selected.task.canSkipChildren ? skippedStatus : openStatus;
                setChildrenTasksStatus(status).then(function () {
                    loading.close();
                    if (taskSaved) {
                        getNextTask();
                    }
                }, alertError);
            }
            else {
                loading.close();
                if (taskSaved) {
                    getNextTask();
                }
            }
        }, alertError);
    }
    else {
        sayLocalization("Alert.RequiredInfoIsMissing");
    }
}
function getNextTask() {
    if (nextTask !== null) {
        if (selected.task.canSkipChildren) {
            fetchTaskAfterSkippedTasks().then(function (task) {
                if (task) {
                    var isListGrouped = parseInt($('#viewSelector').dxSelectBox('instance').option('value')) !== 2;

                    $.each(itemIndexing, function (index, item) {
                        if (item.taskid === task.id) {
                            itemIndex = isListGrouped ? { group: item.group, item: item.item } : { item: item.item };
                            return false;
                        }
                    });

                    selectItemAndShowTask(itemIndex);
                }
                else {
                    // close the popup form
                    $("#formPopup").dxPopup('instance').hide();
                }
            }, alertError);
        }
        else {
            selectItemAndShowTask(nextTask);
        }
    }
    else {
        // close the popup form
        $("#formPopup").dxPopup('instance').hide();
    }
}

function selectItemAndShowTask(task) {
    var isListGrouped = parseInt($('#viewSelector').dxSelectBox('instance').option('value')) !== 2;
    var isListFiltered = $("#sublocationSelector").dxSelectBox('instance').option('value') !== '0' ||
        $("#equipmentSelector").dxSelectBox('instance').option('value') !== '0';

    formAccordion.option('selectedIndex', 0);

    if (isListGrouped && isListFiltered) { // group is array index        
        var listDataSource = mainList.getDataSource();
        var data = new DevExpress.data.DataSource({
            store: {
                type: "array",
                key: "id",
                data: entityListData
            },
            paginate: false,
            group: listDataSource.group()
        });

        data.load().done(function (totalGroupsNoFilter) {
            var totalGroupsFiltered = mainList.option('items');  // Total Groups Currently Displaying
            var groupOffset = totalGroupsNoFilter.length - totalGroupsFiltered.length;
            task.group = task.group - groupOffset;
            task.group = task.group < 0 ? 0 : task.group;

            mainList.scrollToItem(task);
            mainList.selectItem(task);
            selected[entityName] = mainList.option('selectedItem').items[0];

            showTask(selected[entityName]);
        });
    }
    else {
        mainList.scrollToItem(isListGrouped ? task : task.item);
        mainList.selectItem(isListGrouped ? task : task.item);
        selected[entityName] = isListGrouped ? mainList.option('selectedItem').items[0] : mainList.option('selectedItem');

        showTask(selected[entityName]);
    }
}

function fetchTaskAfterSkippedTasks() {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.task.name);
    entity.addAttributes();
    entity.addFilter().where(SCHEMA.task.Properties.servicecallid, 'eq', selected.servicecall.id);
    entity.addFilter().where(SCHEMA.task.Properties.recordlevel, 'eq', 4);

    if (selected.task.gpsublocationid) {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gpsublocationid, 'eq', selected.task.gpsublocationid);
    }
    else {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gpsublocationid, 'null');
    }

    if (selected.task.gpequipmentid) {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gpequipmentid, 'eq', selected.task.gpequipmentid);
    }
    else {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gpequipmentid, 'null');
    }

    if (selected.task.gptasklistid) {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gptasklistid, 'eq', selected.task.gptasklistid);
    }
    else {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gptasklistid, 'null');
    }

    if (selected.task.taskhierarchy) {
        entity.addFilter().where(SCHEMA.task.Properties.taskhierarchy, 'gt', selected.task.taskhierarchy);
        entity.addFilter().where(SCHEMA.task.Properties.taskhierarchy, "not-like", selected.task.taskhierarchy + "%");
    }
    else {
        entity.addFilter().where(SCHEMA.task.Properties.gptasklinenumber, 'gt', selected.task.gptasklinenumber);
    }

    entity.orderBy(SCHEMA.task.Properties.gpservicecallid, false);
    entity.orderBy(SCHEMA.task.Properties.gpsublocationid, false);
    entity.orderBy(SCHEMA.task.Properties.gpequipmentid, false);
    entity.orderBy(SCHEMA.task.Properties.gptasklistid, false);
    entity.orderBy(SCHEMA.task.Properties.gptasklinenumber, false);
    entity.orderBy(SCHEMA.task.Properties.taskhierarchy, false);
    entity.orderBy(SCHEMA.task.Properties.recordlevel, false);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.count = 1;
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res[0] ? res[0] : null);
    }, function (err) {
        return deferred.reject("Fetch Task After Skipped Tasks Error: " + err);
    });

    return deferred.promise();
}
function fetchParentOfSkippedTask(task) {
    var deferred = $.Deferred();
    if (!task.taskhierarchy || task.taskhierarchy.length === 4) {
        // Task is not child of other Task, so cannot be skipped
        return deferred.resolve();
    }

    // Fetch Parent Task with has response type = 4, canskip = true, value = No
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.taskresponse.name);
    entity.addAttribute(SCHEMA.taskresponse.Properties.taskid);

    entity.addFilter().where(SCHEMA.taskresponse.Properties.gpservicecallid, 'eq', task.gpservicecallid);

    if (task.gpsublocationid) {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gpsublocationid, 'eq', task.gpsublocationid);
    }
    else {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gpsublocationid, 'null');
    }

    if (task.gpequipmentid) {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gpequipmentid, 'eq', task.gpequipmentid);
    }
    else {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gpequipmentid, 'null');
    }

    if (task.gptasklistid) {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gptasklistid, 'eq', task.gptasklistid);
    }
    else {
        entity.addFilter().where(SCHEMA.taskresponse.Properties.gptasklistid, 'null');
    }

    entity.addFilter().where(SCHEMA.taskresponse.Properties.responsetype, 'eq', 4); // Yes/No Response
    entity.addFilter().where(SCHEMA.taskresponse.Properties.canskip, 'eq', 1);
    entity.addFilter().where(SCHEMA.taskresponse.Properties.integerresponse, 'eq', 1);  // "No"

    var taskLink = entity.addLink(
        SCHEMA.task.name,
        SCHEMA.task.Properties.id,
        SCHEMA.taskresponse.Properties.taskid,
        "inner");
    taskLink.addAttribute(SCHEMA.task.Properties.taskhierarchy);
    taskLink.alias = SCHEMA.task.name;

    var parentHierarchy = task.taskhierarchy.substring(0, 4);
    taskLink.addFilter().startsWith(SCHEMA.task.Properties.taskhierarchy, parentHierarchy);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        var parentTaskId = null
        $(res).each(function (i, response) {
            if (task.taskhierarchy.indexOf(response['task.taskhierarchy']) === 0) {
                parentTaskId = response.taskid;
            }
        });
        return deferred.resolve(parentTaskId);
    }, function (err) {
        return deferred.reject("Check Skip Task Response Error: " + err);
    });

    return deferred.promise();
}

function setChildrenTasksStatus(statusName) {
    var deferred = $.Deferred();
    // Fetch Status ID by name
    getStatus(statusName).then(function (status) {
        // Fetch Children Tasks
        fetchChildrenTasks(selected.task).then(function (childrenTasks) {
            var itemsDeferred = [];
            $(childrenTasks).each(function (_, childTask) {
                if (childTask.taskstatusid.primaryName !== statusName) {
                    itemsDeferred.push(setStatusOnTask(status, childTask));
                }
            });

            $.when.apply($, itemsDeferred).then(function () {
                mainList.reload();
                return deferred.resolve();
            }, alertError);
        }, alertError);
    }, alertError);
    return deferred.promise();
}
function fetchChildrenTasks(task) {
    var deferred = $.Deferred();
    if (!task) {
        return deferred.reject("Fetch Children Tasks Error: Missing Task Details");
    }
    if (!task.taskhierarchy) {
        // No children tasks
        return deferred.resolve();
    }

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.task.name);
    entity.addAttributes();
    entity.addFilter().where(SCHEMA.task.Properties.servicecallid, 'eq', selected.servicecall.id);
    entity.addFilter().where(SCHEMA.task.Properties.recordlevel, 'eq', 4);

    if (selected.task.gpsublocationid) {
        entity.addFilter().where(SCHEMA.task.Properties.gpsublocationid, 'eq', selected.task.gpsublocationid);
    }
    else {
        entity.addFilter().where(SCHEMA.task.Properties.gpsublocationid, 'null');
    }

    if (selected.task.gpequipmentid) {
        entity.addFilter().where(SCHEMA.task.Properties.gpequipmentid, 'eq', selected.task.gpequipmentid);
    }
    else {
        entity.addFilter().where(SCHEMA.task.Properties.gpequipmentid, 'null');
    }

    if (selected.task.gptasklistid) {
        entity.addFilter().where(SCHEMA.task.Properties.gptasklistid, 'eq', selected.task.gptasklistid);
    }
    else {
        entity.addFilter().where(SCHEMA.task.Properties.gptasklistid, 'null');
    }

    entity.addFilter().startsWith(SCHEMA.task.Properties.taskhierarchy, selected.task.taskhierarchy);
    entity.addFilter().where(SCHEMA.task.Properties.taskhierarchy, 'gt', selected.task.taskhierarchy);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res);
    }, function (err) {
        return deferred.reject("Fetch Children Tasks Error: " + err);
    });
    return deferred.promise();
}

function subTaskFormPreviousClicked() {
    var taskForm = $('#taskForm').dxForm('instance');
    var result = taskForm.validate();
    if (result.isValid || taskForm.option('formData').taskstatusid.primaryName !== completeStatus) {
        loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Alert.SavingSubtask"));
        var promise = saveSubTask();
        promise.then(function (result) {
            loading.close();
            getPreviousSubTask();
        }, alertError);
    }
    else {
        sayLocalization("Alert.RequiredInfoIsMissing");
    }
}
function getPreviousSubTask() {
    if (previousSubTask !== null) {
        subTaskList.scrollToItem(previousSubTask.item);
        subTaskList.selectItem(previousSubTask.item);
        selectedSubTask = subTaskList.option('selectedItem');
        showSubTask(selectedSubTask);
    }
    else {
        // close the popup form
        subTaskFormPopup.hide();
    }
}

function subTaskFormNextClicked() {
    var taskForm = $('#taskForm').dxForm('instance');
    var result = taskForm.validate();
    if (result.isValid || taskForm.option('formData').taskstatusid.primaryName !== completeStatus) {
        loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Alert.SavingSubtask"));
        var promise = saveSubTask();
        promise.then(function (result) {
            loading.close();
            getNextSubTask();
        }, alertError);
    }
    else {
        sayLocalization("Alert.RequiredInfoIsMissing");
    }
}
function getNextSubTask() {
    if (nextSubTask !== null) {
        subTaskList.scrollToItem(nextSubTask.item);
        subTaskList.selectItem(nextSubTask.item);
        selectedSubTask = subTaskList.option('selectedItem');
        showSubTask(selectedSubTask);
    }
    else {
        // close the popup form
        subTaskFormPopup.hide();
    }
}

//============== FORM ITEM FUNCTIONS ================
function taskFormStatusSelected(e) {
    if (e.selectedItem.id !== $('#taskForm').dxForm('instance').option().formData.taskstatusid.id) {
        var completionDateEditor = $('#taskForm').dxForm('instance').getEditor('completiondate');
        $('#taskForm').dxForm('instance').updateData('taskstatusid', e.selectedItem);
        if (e.selectedItem.primaryName === completeStatus) {
            var completionDate = new Date();
            completionDateEditor.option('value', completionDate);
            $('#taskForm').dxForm('instance').updateData('completiondate', completionDate);
        }
        else {
            completionDateEditor.option('value', null);
            $('#taskForm').dxForm('instance').updateData('completiondate', null);
        }
    }
}

function subTaskFormStatusSelected(e) {
    if (e.selectedItem.id !== $('#subTaskForm').dxForm('instance').option().formData.taskstatusid.id) {
        var completionDateEditor = $('#subTaskForm').dxForm('instance').getEditor('completiondate');
        $('#subTaskForm').dxForm('instance').updateData('taskstatusid', e.selectedItem);
        if (e.selectedItem.primaryName === completeStatus) {
            var completionDate = new Date();
            completionDateEditor.option('value', completionDate);
            $('#subTaskForm').dxForm('instance').updateData('completiondate', completionDate);
        }
        else {
            completionDateEditor.option('value', null);
            $('#subTaskForm').dxForm('instance').updateData('completiondate', null);
        }
    }
}

function dateBoxInitialized(e) {
    MobileCRM.Configuration.requestObject(function (config) {
        if (config.settings.deviceInfo.indexOf('iOS') > -1) {
            e.component.option('showDropDownButton', false);
        }
    }, MobileCRM.bridge.alert);
}

function dateBoxFocusIn(e) {
    if (e.component.option('pickerType') === "calendar") {
        e.component.blur();
        if (!e.component.option('openOnFieldClick')) {
            e.component.option('openOnFieldClick', true);
            e.component.open();
        }
    }
}

function yesNoResponseChanged(e, canskip) {
    if (canskip === "True") {
        var responseItems = e.component.option('items');
        var selectedResponse = null;

        $(responseItems).each(function (i, response) {
            if (response.id === e.value) {
                selectedResponse = response;
            }
        });

        if (selectedResponse) {
            switch (selectedResponse.text) {
                case MobileCRM.Localization.get("enum.No"):
                    // Add skipping
                    selected.task.canSkipChildren = true;
                    break;
                default:
                    // Undo skipping
                    selected.task.canSkipChildren = false;
            }
        }
    }
}