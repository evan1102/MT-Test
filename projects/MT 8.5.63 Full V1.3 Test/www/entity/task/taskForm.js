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
                        editorOptions: { height: 100, showClearButton: true }
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
                            valueExpr: "id"
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
function buildAccordionItemsList(showSubTasks, showTaskMaterial) {
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
}

//============== TOOLBAR FUNCTIONS ================
function taskFormPreviousClicked() {
    var taskForm = $('#taskForm').dxForm('instance');
    var result = taskForm.validate();
    if (result.isValid || taskForm.option('formData').taskstatusid.primaryName !== completeStatus) {
        loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Alert.SavingTask"));
        var promise = saveTask();
        promise.then(function (result) {
            loading.close();
            if (result) {
                getPreviousTask();
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
        if (parseInt($('#viewSelector').dxSelectBox('instance').option('value')) !== 2) {
            mainList.scrollToItem(previousTask);
            mainList.selectItem(previousTask);
            selected[entityName] = mainList.option('selectedItem').items[0];
        }
        else {
            mainList.scrollToItem(previousTask.item);
            mainList.selectItem(previousTask.item);
            selected[entityName] = mainList.option('selectedItem');
        }
        showTask(selected[entityName]);
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
        promise.then(function (result) {
            loading.close();
            if (result) {
                getNextTask();
            }
        }, alertError);
    }
    else {
        sayLocalization("Alert.RequiredInfoIsMissing");
    }
}
function getNextTask() {
    if (nextTask !== null) {
        formAccordion.option('selectedIndex', 0);
        if (parseInt($('#viewSelector').dxSelectBox('instance').option('value')) !== 2) {
            mainList.scrollToItem(nextTask);
            mainList.selectItem(nextTask);
            selected[entityName] = mainList.option('selectedItem').items[0];
        }
        else {
            mainList.scrollToItem(nextTask.item);
            mainList.selectItem(nextTask.item);
            selected[entityName] = mainList.option('selectedItem');
        }
        showTask(selected[entityName]);
    }
    else {
        // close the popup form
        $("#formPopup").dxPopup('instance').hide();
    }
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