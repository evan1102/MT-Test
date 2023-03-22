//============== INITIAL SETTINGS ================
var subTaskFormPopup, subTaskForm, subTaskFormScrollView, subTaskDataStore;
var subTaskList, subTaskListItems, selectedSubTask;
//============== FETCH DATA ================
var subTaskListSearchItems = [
    SCHEMA.subtask.Properties.gptaskcode,
    SCHEMA.subtask.Properties.description,
    SCHEMA.subtask.Properties.gpsubtaskcode,
    SCHEMA.task.Properties.taskstatusid
];
var subTaskListItemTemplate = function (data, index, element) {
    var item = { taskid: data.id, item: index }
    if (findSubTaskIndex(item).length === 0) {
        subTaskItemIndexing.push(item);
    }
    var statusColor = data.taskstatusid ? (data.taskstatusid.primaryName === completeStatus ? "green" : "black") : "black";
    element.append(
        $('<div>').append(
            $('<div>').append(
                $('<div>').append(data.gpsubtaskcode).css('font-size', 'large'),
                $('<div>').append(data.description)
            ),
            $('<div>').append(
                $('<div>').append(data.gptaskcode).css('float', 'left'),
                $('<div id="' + data.id + '_status">').append(data.taskstatusid ? data.taskstatusid.primaryName : "")
                    .css({ 'float': 'right', 'color': statusColor, 'font-weight': statusColor === "black" ? 'normal' : 'bold' })
            )
        )
    );
}
function findSubTaskIndex(task) {
    return $.grep(subTaskItemIndexing, function (t, i) {
        return t.taskid === task.taskid &&
            t.item === task.item;
    });
};

//============== TOOLBARS ================
var subTaskListToolbarItems = [
    {
        location: "before",
        widget: "dxSelectBox",
        options: {
            valueExpr: "id",
            displayExpr: "text",
            width: 175,
            onValueChanged: filterSubTaskList
        }
    },
    {
        location: "after",
        locateInMenu: "auto",
        widget: "dxButton",
        options: {
            type: "normal",
            icon: "repeat",
            onClick: openSubTasksInList,
            stylingMode: 'text'
        }
    },
    {
        location: "after",
        locateInMenu: "auto",
        widget: "dxButton",
        options: {
            type: "normal",
            icon: "check",
            onClick: completeSubTasksInList,
            stylingMode: 'text'
        }
    }
];
function createSubTaskToolbar() {
    subTaskListToolbarItems[0].options.items = listFilters;
    subTaskListToolbarItems[0].options.value = listFilters[0].id;

    $('#subTaskToolbar').dxToolbar({
        items: subTaskListToolbarItems
    }).dxToolbar("instance");
}

//============== LIST ACTION ITEMS ================
var subTaskActionItems = [
    { text: "More", onClick: viewSubTaskEntity },
    { text: "Reopen", onClick: changeSubTaskStatus },
    { text: "Complete", onClick: changeSubTaskStatus }
];
function buildSubTaskActionItems(subTask) {
    subTaskActionSheet = (new ActionSheetFactory()).createItem(subTaskActionItems, "#subTaskActionSheet");

    var dynamicActionItems = [subTaskActionItems[0]];   // 0.More

    if (subTask.taskstatusid.primaryName === completeStatus) {
        dynamicActionItems.push(subTaskActionItems[1]); // 1.Reopen
    }
    else {
        dynamicActionItems.push(subTaskActionItems[2]); // 2.Complete
    }

    dynamicActionItems.push(subTaskActionItems[3]); // 3.Cancel

    subTaskActionSheet.option({
        title: MobileCRM.Localization.get(SCHEMA.subtask.name) + ": " + subTask.name,
        items: dynamicActionItems,
        visible: true
    });
}

//============== LIST ================
function loadSubTasks() {
    subTaskList = $('#subTaskList').dxList({
        searchEnabled: true,
        searchExpr: subTaskListSearchItems,
        itemTemplate: subTaskListItemTemplate,
        keyExpr: SCHEMA.subtask.Properties.id,
        selectionMode: 'single',
        dataSource: subTaskDataStore,
        onItemClick: function (e) {
            selectedSubTask = e.itemData;
            buildSubTaskActionItems(e.itemData);
        },
        onSelectionChanged: function (e) {
            var items = subTaskList.option('selectedItem');
            if (items) {
                var key = items.id;
                $.each(subTaskItemIndexing, function (index, item) {
                    if (item.taskid === key) {
                        subTaskItemIndex = { item: item.item };
                        return false;
                    }
                })
                setNextPreviousSubTask(subTaskItemIndex);
            }
            else {
                // hit a group header which has no item. Use the previous item to get the
                setNextPreviousSubTask(subTaskItemIndex);
            }
        },
        pageLoadMode: 'scrollBottom'
    }).dxList('instance');

    createSubTaskToolbar();
}
function setNextPreviousSubTask(itemIndex) {
    // Set the previous task
    if (itemIndex.item === 0) {
        // first task is selected. no previous task exists
        previousSubTask = null;
    }
    else {
        // reduce item by 1
        previousSubTask = { item: itemIndex.item - 1 };
    }

    // set the next task
    if (itemIndex.item === subTaskList.option('items').length - 1) {
        // last item is selected
        nextSubTask = null;
    }
    else {
        // next index
        nextSubTask = { item: itemIndex.item + 1 };
    }
}

//============== TOOLBAR FUNCTIONS ================
function filterSubTaskList(args) {
    var index = args.value;
    var statusNeeded = index === 0 ? '' : index === 1 ? openStatus : completeStatus;
    if (index === 0) {
        subTaskList.option('searchValue', null);
    }
    else {
        var promise = getStatus(statusNeeded);
        promise.then(function (status) {
            subTaskList.option('searchValue', status.primaryName);
        }, function (error) {
            MobileCRM.bridge.alert(error);
        });
    }
}

function openSubTasksInList() {
    var popup = new MobileCRM.UI.MessageBox(MobileCRM.Localization.get("Alert.OpenSubTasksInList"));
    popup.multiLine = true;
    popup.items = [
        MobileCRM.Localization.get("enum.Yes"),
        MobileCRM.Localization.get("enum.No")
    ];
    popup.show(
        function (button) {
            if (button === MobileCRM.Localization.get("enum.Yes")) {
                var selectedTask = subTaskList.option('selectedItem');
                var promise = getStatus(openStatus);
                promise.then(function (status) {
                    var saving = MobileCRM.UI.Form.showPleaseWait("Opening tasks");
                    var savePromise = setStatusOnSelectedSubTasks(status);
                    savePromise.then(function (result) {
                        subTaskList.repaint();
                        if (selectedTask !== null) {
                            subTaskList.scrollToItem(selectedTask);
                        }
                        saving.close();
                    },
                        function (error) {
                            MobileCRM.bridge.alert(error);
                            saving.close();
                        }
                    )
                }, function (error) {
                    MobileCRM.bridge.alert(error);
                });
            }
        }
    );
}

function completeSubTasksInList() {
    var popup = new MobileCRM.UI.MessageBox(MobileCRM.Localization.get("Alert.CompleteSubTasksInList"));
    popup.multiLine = true;
    popup.items = [
        MobileCRM.Localization.get("enum.Yes"),
        MobileCRM.Localization.get("enum.No")
    ];
    popup.show(
        function (button) {
            if (button === MobileCRM.Localization.get("enum.Yes")) {
                var selectedTask = subTaskList.option('selectedItem');
                var promise = getStatus(completeStatus);
                promise.then(function (status) {
                    var saving = MobileCRM.UI.Form.showPleaseWait("Completing tasks");
                    var savePromise = setStatusOnSelectedSubTasks(status);
                    savePromise.then(function (result) {
                        subTaskList.repaint();
                        if (selectedTask !== null) {
                            subTaskList.scrollToItem(selectedTask);
                        }
                        saving.close();
                    },
                        function (error) {
                            MobileCRM.bridge.alert(error);
                            saving.close();
                        }
                    )
                }, function (error) {
                    MobileCRM.bridge.alert(error);
                });
            }
        }
    );
}

function setStatusOnSelectedSubTasks(status) {
    var deferred = $.Deferred();

    $(function () {
        var counter = 0;
        var taskList = [];
        var tasks = subTaskList.option('items');

        tasks.forEach(function (item, index, array) {
            taskList.push(item);
        });
        taskList.forEach(function (task, index, array) {
            MobileCRM.DynamicEntity.loadById(SCHEMA.subtask.name,
                task.id,
                function (entity) {
                    var completionDate = new Date();
                    if (status.primaryName !== completeStatus) {
                        completionDate = null;
                    }

                    if (entity.properties.taskstatusid !== status) {
                        entity.properties.taskstatusid = status;
                        entity.properties.completiondate = completionDate;

                        entity.save(function (error) {
                            if (error) {
                                MobileCRM.bridge.alert(error);
                            }
                            else {
                                // Update the list to show the new status
                                var store = subTaskDataStore.store();
                                store.update(task.id, { taskstatusid: status, completiondate: completionDate }).done(function (dataObj, key) {
                                }).fail(function (error) {
                                    MobileCRM.bridge.alert(error);
                                })
                            }
                            counter++;
                            if (counter === array.length - 1) {
                                subTaskList.repaint();
                                return deferred.resolve(true);
                            }
                        })
                    }
                    else {
                        counter++;
                        if (counter === array.length - 1) {
                            subTaskList.repaint();
                            return deferred.resolve(true);
                        }
                    }

                },
                MobileCRM.bridge.alert
            )
        });
    });
    return deferred.promise();
}

//============== LIST EXECUTIONS ================
// -------------- SUB TASK FORM --------------
function viewSubTaskEntity() {
    showSubTask(subTaskList.option('selectedItem'));
}
function showSubTask(entity) {
    MobileCRM.bridge.getWindowSize(function (obj) {
        if (subTaskFormPopup === undefined) {
            var popupOptions = {
                width: '99%',
                height: '99%',
                showTitle: true,
                showCloseButton: true,
                title: entity.name,
                visible: false,
                toolbarItems: subTaskFormToolbarItems,
                contentTemplate: function () {
                    return "<div id='subTaskFormScrollView'><div id='subTaskForm'></div></div>";
                },
                onShowing: function (e) {
                    var scrollHeight = document.getElementById('subTaskFormPopup').offsetParent ?
                        document.getElementById('subTaskFormPopup').offsetParent.clientHeight - 50 : 0;
                    subTaskFormScrollView = $('#subTaskFormScrollView').dxScrollView({
                        showScrollbar: "onScroll",
                        width: '100%',
                        height: scrollHeight
                    }).dxScrollView('instance');
                },
                onHiding: function (e) {
                    var promise = saveSubTask();
                    promise.then(function (result) {
                    }, function (error) {
                        MobileCRM.bridge.alert(error);
                    })
                }
            }
            subTaskFormPopup = $("#subTaskFormPopup").dxPopup(popupOptions).dxPopup('instance');
            subTaskFormPopup.show();
            loadSubTaskForm(entity);
        }
        else {
            subTaskFormPopup.option('title', entity.name);
            loadSubTaskForm(entity);
            if (subTaskFormPopup.option('visible') === false) {
                subTaskFormPopup.show();
            }
        }
    }, MobileCRM.bridge.alert);
}
function loadSubTaskForm(entity) {
    var taskStatusEntity = new MobileCRM.FetchXml.Entity(SCHEMA.taskstatus.name);
    taskStatusEntity.addAttribute(SCHEMA.taskstatus.Properties.id);
    taskStatusEntity.addAttribute(SCHEMA.taskstatus.Properties.name);

    var fetch = new MobileCRM.FetchXml.Fetch(taskStatusEntity);
    fetch.execute("DynamicEntities", function (statuses) {
        var promise = getSubTaskFormItems(statuses, setupOptions);
        promise.then(function (formItems) {
            subTaskForm = $('#subTaskForm').dxForm({
                items: formItems,
                labelLocation: "top",
                formData: entity,
            }).dxForm('instance');
        })
    }, MobileCRM.bridge.alert, null)
}
function saveSubTask() {
    var deferred = $.Deferred();
    var formData = subTaskForm.option('formData');
    MobileCRM.DynamicEntity.loadById(SCHEMA.subtask.name,
        formData.id,
        function (task) {
            var completionDate = null;
            if (formData.completiondate) {
                completionDate = new Date(formData.completiondate);
            }
            task.properties.taskstatusid = formData.taskstatusid;
            task.properties.completiondate = completionDate;
            task.save(function (error) {
                if (error) {
                    return deferred.reject(error);
                }
                else {
                    var store = subTaskDataStore.store();
                    store.update(selectedSubTask.id, { taskstatusid: task.properties.taskstatusid, completiondate: completionDate })
                        .done(function (dataObj, key) {
                            subTaskList.scrollToItem(selectedItemElement);
                            subTaskList.repaint();
                            return deferred.resolve(true);
                        }).fail(function (error) {
                            return deferred.reject(error);
                        })
                }
            })
        },
        function (error) {
            MobileCRM.bridge.alert(error);
            return deferred.reject(error);
        }
    )
    return deferred.promise();
}

// -------------- SUB TASK STATUS --------------
function changeSubTaskStatus() {
    var statusNeeded = selectedSubTask.taskstatusid.primaryName === completeStatus ? openStatus : completeStatus;
    var promise = getStatus(statusNeeded);
    promise.then(function (taskStatus) {
        var completionDate = new Date();
        if (taskStatus.primaryName !== completeStatus) {
            completionDate = null;
        }
        MobileCRM.DynamicEntity.loadById(SCHEMA.subtask.name,
            selectedSubTask.id,
            function (entity) {
                entity.properties.taskstatusid = taskStatus;
                entity.properties.completiondate = completionDate;
                entity.save(function (error) {
                    if (error) {
                        MobileCRM.bridge.alert(error);
                    }
                    else {
                        // Update the list to show the new status
                        var store = subTaskDataStore.store();
                        store.update(selectedSubTask.id, { taskstatusid: taskStatus, completiondate: completionDate }).done(function (dataObj, key) {
                            subTaskList.scrollToItem(selectedItemElement);
                            subTaskList.repaint();
                        }).fail(function (error) {
                            MobileCRM.bridge.alert(error);
                        })

                    }
                });
            },
            MobileCRM.bridge.alert,
            null)
    });
}

function setStatusOnAllSubTasks(status, task, completiondate) {
    var deferred = $.Deferred();
    if (!status || !task) {
        return deferred.reject("Set Sub Tasks Status Error: Missing Details");
    }

    getSubTasks(task.id).then(function (subtasks) {
        if (subtasks.length === 0) {
            return deferred.resolve();
        }

        var itemsDeferred = [];

        $(subtasks).each(function (i, subtask) {
            itemsDeferred.push(setStatusOnSubTask(status, subtask, completiondate));
        });

        $.when.apply($, itemsDeferred).then(
            function () { return deferred.resolve(); },
            function (err) { return deferred.reject(err); }
        );
    });

    return deferred.promise();
}
function getSubTasks(taskid) {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.subtask.name);
    entity.addAttributes();
    entity.orderBy(SCHEMA.subtask.Properties.gpsubtasklinenumber, false);

    entity.addFilter().where(SCHEMA.subtask.Properties.taskid, 'eq', taskid);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (subtasks) {
        subTaskListItems = subtasks;
        subTaskDataStore = new DevExpress.data.DataSource({
            store: {
                type: "array",
                key: "id",
                data: subTaskListItems
            },
            paginate: false
        });
        return deferred.resolve(subtasks);
    }, function (error) {
        subTaskListItems = [];
        MobileCRM.bridge.alert(error);
        return deferred.reject(error);
    }, null);

    return deferred.promise();
}
function setStatusOnSubTask(status, subtask, completiondate) {
    var deferred = $.Deferred();
    if (!status || !subtask) {
        return deferred.reject("Set Status on Sub Task Error: Missing Details");
    }

    MobileCRM.DynamicEntity.loadById(SCHEMA.subtask.name, subtask.id, function (entity) {
        entity.properties.taskstatusid = status;
        entity.properties.completiondate = status.primaryName === completeStatus ? completiondate : null;

        entity.save(function (error) {
            if (error) {
                return deferred.reject("Save Sub Task Error: " + error);
            }
            else {
                return deferred.resolve();
            }
        });
    }, function (err) {
        return deferred.reject("Set Status on Sub Task Error: " + err);
    });
    return deferred.promise();
}