//============== INITIAL SETTINGS ================
var selectedTaskLookupId, taskAttachmentToolbar, taskAttachmentList, taskAttachmentDataStore;
var selectedAttachment, eventListenersLoaded = false;
//============== FETCH DATA ================
var taskAttachmentEntityAttributes = [
    SCHEMA.annotation.Properties.id,
    SCHEMA.annotation.Properties.objectid,
    SCHEMA.annotation.Properties.subject,
    SCHEMA.annotation.Properties.notetext,
    SCHEMA.annotation.Properties.filename,
    SCHEMA.annotation.Properties.createdon
];
var taskAttachmentListSearchItems = [
    SCHEMA.annotation.Properties.filename,
    SCHEMA.annotation.Properties.notetext
];
var taskAttachmentListItemTemplate = function (data, _, element) {
    element.append(
        $("<span>").append(data.notetext).css("font-size", "large"),
        $("<br>"),
        $("<span>").append(data.filename)
    );
};

//============== TOOLBAR ITEMS ================
var taskAttachmentMainToolbarItems = [
    {
        location: "after",
        widget: "dxButton",
        options: {
            type: "normal",
            icon: 'plus',
            onClick: btnNewAttachmentClicked,
            stylingMode: 'text'
        }
    }
];

function loadTaskAttachments(taskId) {
    loading = MobileCRM.UI.Form.showPleaseWait(MobileCRM.Localization.get("Msg.Loading"));
    selectedTaskLookupId = taskId;

    var promise = getTaskAttachments(taskId);
    promise.then(function (result) {

        //============== TOOLBARS ================
        taskAttachmentToolbar = $("#taskAttachmentToolbar").dxToolbar({
            items: taskAttachmentMainToolbarItems
        }).dxToolbar("instance");

        //============== LIST ================
        taskAttachmentList = $('#taskAttachmentList').dxList({
            searchEnabled: true,
            searchExpr: taskAttachmentListSearchItems,
            itemTemplate: taskAttachmentListItemTemplate,
            selectionMode: 'single',
            dataSource: taskAttachmentDataStore,
            onItemClick: taskAttachmentListItemClicked,
            pageLoadMode: 'scrollBottom'
        }).dxList('instance');

        if (!eventListenersLoaded) {
            loadEventListeners();
        }

        loading.close();
    }, alertError);
}

//============== EVENT HANDLERS ================
function loadEventListeners() {
    MobileCRM.bridge.onGlobalEvent("EntityFormClosed", function (closedForm) {
        if (closedForm.entity && closedForm.entity.entityName === SCHEMA.annotation.name)
            loadTaskAttachments(selectedTaskLookupId);
    }, true);

    eventListenersLoaded = true;
}

//============== LOAD DATA ================
function getTaskAttachments(taskId) {
    var deferred = $.Deferred();

    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.annotation.name);
    $(taskAttachmentEntityAttributes).each(function (index, attribute) {
        entity.addAttribute(attribute);
    });

    entity.filter = new MobileCRM.FetchXml.Filter();
    entity.filter.where(SCHEMA.annotation.Properties.objectid, 'eq', taskId);
    entity.filter.where(SCHEMA.annotation.Properties.isdocument, 'eq', true);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (data) {
        taskAttachmentDataStore = new DevExpress.data.DataSource({
            store: {
                type: "array",
                key: "id",
                data: data
            },
            paginate: false
        });
        return deferred.resolve(true);
    }, function (error) {
        return deferred.reject(error);
    }, null);

    return deferred.promise();
}

//============== TOOLBAR FUNCTIONS ================
function btnNewAttachmentClicked() {
    getTechnicianID(function (technicianId) {
        var promise = initializeData(technicianId);
        promise.then(function (data) {
            var target = new MobileCRM.Reference(SCHEMA.task.name, selected[SCHEMA.task.name].id);
            var relationship = new MobileCRM.Relationship(SCHEMA.annotation.Properties.objectid, target, null, null);

            MobileCRM.UI.FormManager.showNewDialog(SCHEMA.annotation.name, relationship, { "@initialize": data });
        });
    });
}
function initializeData(technicianId) {
    var deferred = $.Deferred();

    $(function () {
        var initialData = {}
        var modifieddate = new Date();

        initialData = {
            gpnotetype: 'T',
            gpcustomernumber: '',
            gplocationnumber: '',
            gpservicecallid: '',
            gpreferenceid: 0,
            documenttype: 22,
            subject: '',
            modifieddate: modifieddate,
            modifieduser: technicianId,
            gptechnicianid: technicianId,
            isdocument: true
        }
        return deferred.resolve(initialData);
    })
    return deferred.promise();
}

//============== LIST ITEM FUNCTIONS ================
function taskAttachmentListItemClicked(e) {
    selectedAttachment = e.itemData;
    MobileCRM.Configuration.requestObject(function (config) {
        var lastSyncDate = new Date(config.settings.lastSyncDate);
        var createdDate = new Date(selectedAttachment.createdon);
        if (lastSyncDate < createdDate) {
            var lblAttachment = MobileCRM.Localization.get("annotation.attachmentid");
            taskAttachmentActionSheet.option({
                title: lblAttachment + ": " + selectedAttachment.filename,
                visible: true
            });
        }
        else {
            viewAttachmentEntity();
        }
    }, MobileCRM.bridge.alert, null)

}

function viewAttachmentEntity() {
    MobileCRM.UI.FormManager.showEditDialog(SCHEMA.annotation.name, selectedAttachment.id);
}

function deleteTaskAttachment() {
    var confirmPopup = new MobileCRM.UI.MessageBox(MobileCRM.Localization.get("Alert.ConfirmDeleteAttachment"));
    confirmPopup.multiLine = true;
    confirmPopup.items = [
        MobileCRM.Localization.get("enum.Yes"),
        MobileCRM.Localization.get("enum.No")
    ];
    confirmPopup.show(function (btn) {
        if (btn === MobileCRM.Localization.get("enum.Yes")) {
            MobileCRM.DynamicEntity.deleteById(SCHEMA.annotation.name, selectedAttachment.id, function () {
                showToast(MobileCRM.Localization.get("Alert.AttachmentDeleted"), "success");
                loadTaskAttachments(selectedTaskLookupId);
            }, MobileCRM.bridge.alert);
        }
    });
}