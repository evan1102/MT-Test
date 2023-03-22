//============== INITIAL SETTINGS ================
var taskMaterialDataStore, taskMaterialList;
//============== FETCH DATA ================
var taskMaterialSearchItems = [
    SCHEMA.taskmaterial.Properties.name,
    SCHEMA.taskmaterial.Properties.itemdescription,
    SCHEMA.taskmaterial.Properties.isrequired,
    SCHEMA.taskmaterial.Properties.quantity
];

var taskMaterialListItemTemplate = function (data, index, element) {
    // For Function See File entity\taskmaterial\task-material.js
    createTaskMaterialTemplate(data, index, element, 0);
};

//============== LIST ================
function loadTaskMaterials() {
    var taskId = selected[entityName].id;
    // For Function See File entity\taskmaterial\task-material.js
    var promise = getTaskMaterials(taskId);
    promise.then(function (materials) {
        taskMaterialDataStore = new DevExpress.data.DataSource({
            store: {
                type: "array",
                key: "id",
                data: materials
            },
            paginate: false
        });

        taskMaterialList = $('#taskMaterialList').dxList({
            searchEnabled: true,
            searchExpr: taskMaterialSearchItems,
            itemTemplate: taskMaterialListItemTemplate,
            keyExpr: SCHEMA.taskmaterial.Properties.id,
            selectionMode: 'single',
            dataSource: taskMaterialDataStore,
            onItemClick: taskMaterialListItemClicked,
            pageLoadMode: 'scrollBottom'
        }).dxList('instance');
    }, function (error) {
        MobileCRM.bridge.alert(error);
    })
}

//============== LIST ITEM FUNCTIONS ================
function taskMaterialListItemClicked(e) {
    if (callingObjectName === SCHEMA.appointment.name) {
        var label = MobileCRM.Localization.get(SCHEMA.taskmaterial.name);

        taskMaterialActionSheet.option({
            title: label + ": " + e.itemData.name,
            items: taskMaterialActionItems,
            visible: true
        });
    }
}
function addTaskMaterial(e) {
    var taskMaterialId = taskMaterialList.option('selectedItem').id;
    // For Function See File entity\taskmaterial\task-material.js
    addMaterialToInventory(taskMaterialId);
}