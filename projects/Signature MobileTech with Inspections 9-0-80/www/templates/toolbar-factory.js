//============== ENUM ================
const ToolbarItemType = {
    btnBack: "btnBack",
    btnClear: "btnClear",       // function needed: btnClearClicked
    btnRefresh: "btnRefresh",     // function needed: btnRefreshClicked    
    btnRevert: "btnRevert",     // function needed: btnRevertClicked
    btnDiscard: "btnDiscard",   // function needed: btnDiscardClicked
    btnExpandCollapse: "btnExpandCollapse", // variable needed: isCollapsed
    btnFilter: "btnFilter",     // function needed: btnFilterClicked (only if not list)
    btnMenu: "btnMenu",         // function needed: btnMenuClicked
    btnNew: "btnNew",           // function needed: btnNewClicked
    btnReport: "btnReport",     // function needed: btnReportClicked
    btnSummary: "btnSummary",   // function needed: btnSummaryClicked
    btnSave: "btnSave",         // function needed: btnSaveClicked
    btnSort: "btnSort",         // function needed: btnSortClicked, variable needed: sortDesc,
    btnGetGPS: "btnGetGps",     // function needed: btnGetGpsClicked
    checkBox: "checkBox",       // function needed: checkBoxValueChanged
    selectSort: "selectSort",   // function needed: sortSelected
    selectView: "selectView",   // function needed: viewSelected
    switchMode: "switchMode",   // function needed: switchModeChanged, variable needed: isOnline
    title: "title"
}

//============== FACTORY ================
function ToolbarFactory() {
    this.createItem = function (itemType) {
        var toolbarItem;
        switch (itemType) {
            case ToolbarItemType.btnBack: toolbarItem = createBtnBack(); break;
            case ToolbarItemType.btnClear: toolbarItem = createBtnClear(); break;
            case ToolbarItemType.btnRefresh: toolbarItem = createBtnRefresh(); break;
            case ToolbarItemType.btnRevert: toolbarItem = createBtnRevert(); break;
            case ToolbarItemType.btnDiscard: toolbarItem = createBtnDiscard(); break;
            case ToolbarItemType.btnExpandCollapse: toolbarItem = createBtnExpandCollapse(); break;
            case ToolbarItemType.btnFilter: toolbarItem = createBtnFilter(); break;
            case ToolbarItemType.btnMenu: toolbarItem = createBtnMenu(); break;
            case ToolbarItemType.btnNew: toolbarItem = createBtnNew(); break;
            case ToolbarItemType.btnReport: toolbarItem = createBtnReport(); break;
            case ToolbarItemType.btnSummary: toolbarItem = createBtnSummary(); break;
            case ToolbarItemType.btnSave: toolbarItem = createBtnSave(); break;
            case ToolbarItemType.btnSort: toolbarItem = createBtnSort(); break;
            case ToolbarItemType.btnGetGPS: toolbarItem = createBtnGetGps(); break;
            case ToolbarItemType.checkBox: toolbarItem = createToolbarCheckBox(); break;
            case ToolbarItemType.selectSort: toolbarItem = createSelectSort(); break;
            case ToolbarItemType.selectView: toolbarItem = createSelectView(); break;
            case ToolbarItemType.switchMode: toolbarItem = createSwitchMode(); break;
            case ToolbarItemType.title: toolbarItem = createTitle(); break;
        }
        return toolbarItem;
    }

    this.addItems = function (itemArr) {
        var toolbarItems = [];
        for (var i in itemArr) {
            toolbarItems.push(this.createItem(itemArr[i]));
        }

        return toolbarItems;
    }
}

//============== CREATE ================
function createBtnBack() {
    return {
        name: ToolbarItemType.btnBack,
        location: 'before',
        locateInMenu: 'never',
        widget: 'dxButton',
        options: {
            icon: 'back',
            stylingMode: 'text',
            onClick: btnBackClicked
        }
    }
}
function createBtnClear() {
    return {
        name: ToolbarItemType.btnClear,
        location: 'after',
        locateInMenu: 'auto',
        widget: 'dxButton',
        options: {
            icon: 'clear',
            stylingMode: 'text',
            onClick: btnClearClicked
        }
    };
}
function createBtnRefresh() {
    return {
        name: ToolbarItemType.btnRefresh,
        location: 'after',
        locateInMenu: 'auto',
        widget: 'dxButton',
        options: {
            icon: 'refresh',
            stylingMode: 'text',
            onClick: btnRefreshClicked
        }
    };
}
function createBtnRevert() {
    return {
        name: ToolbarItemType.btnRevert,
        location: 'after',
        locateInMenu: 'auto',
        widget: 'dxButton',
        options: {
            icon: 'revert',
            stylingMode: 'text',
            onClick: btnRevertClicked
        }
    };
}
function createBtnDiscard() {
    return {
        name: ToolbarItemType.btnDiscard,
        location: 'after',
        locateInMenu: 'never',
        widget: 'dxButton',
        options: {
            icon: 'undo',
            stylingMode: 'text',
            onClick: btnDiscardClicked
        }
    };
}
function createBtnExpandCollapse() {
    if (isCollapsed === 'undefined')
        isCollapsed = true;

    var expandAll = MobileCRM.Localization.get("Action.ExpandAll");
    var collapseAll = MobileCRM.Localization.get("Action.CollapseAll");
    return {
        name: ToolbarItemType.btnExpandCollapse,
        location: 'before',
        locateInMenu: 'never',
        widget: 'dxButton',
        options: {
            text: isCollapsed ? expandAll : collapseAll,
            icon: isCollapsed ? "spindown" : "spinup",
            stylingMode: "text",
            type: "default",
            onClick: function () {
                var currentlyCollapsed = this.option("text") === expandAll ? true : false;
                this.option("text", currentlyCollapsed ? collapseAll : expandAll);
                this.option("icon", currentlyCollapsed ? "spinup" : "spindown");
                btnExpandCollapseClicked(currentlyCollapsed);
            }
        }
    }
}
function createBtnFilter() {
    return {
        name: ToolbarItemType.btnFilter,
        location: 'after',
        locateInMenu: 'never',
        widget: 'dxButton',
        options: {
            icon: 'filter',
            stylingMode: 'text',
            onClick: btnFilterClicked
        }
    };
}
function createBtnMenu() {
    return {
        name: ToolbarItemType.btnMenu,
        location: 'after',
        locateInMenu: 'never',
        widget: 'dxButton',
        options: {
            icon: 'menu',
            stylingMode: 'text',
            onClick: btnMenuClicked
        }
    };
}
function createBtnNew() {
    return {
        name: ToolbarItemType.btnNew,
        location: 'after',
        widget: 'dxButton',
        locateInMenu: 'never',
        options: {
            icon: "plus",
            stylingMode: 'text',
            onClick: btnNewClicked
        }
    };
}
function createBtnReport() {
    return {
        name: ToolbarItemType.btnReport,
        location: 'after',
        locateInMenu: 'never',
        widget: 'dxButton',
        options: {
            icon: 'export',
            stylingMode: 'text',
            onClick: btnReportClicked
        }
    };
}
function createBtnSummary() {
    return {
        name: ToolbarItemType.btnSummary,
        location: 'after',
        locateInMenu: 'never',
        widget: 'dxButton',
        options: {
            icon: 'chart',
            stylingMode: 'text',
            onClick: btnSummaryClicked
        }
    };
}
function createBtnSave() {
    return {
        name: ToolbarItemType.btnSave,
        location: 'after',
        locateInMenu: 'auto',
        widget: 'dxButton',
        options: {
            icon: 'save',
            stylingMode: 'text',
            onClick: btnSaveClicked
        }
    }
}
function createBtnSort() {
    if (typeof sortDesc === 'undefined')
        sortDesc = true;
    return {
        name: ToolbarItemType.btnSort,
        location: 'before',
        locateInMenu: 'never',
        widget: 'dxButton',
        options: {
            icon: sortDesc ? 'arrowdown' : 'arrowup',
            rtlEnabled: true,
            stylingMode: 'text',
            onClick: function () {
                sortDesc = !sortDesc;
                this.option("icon", sortDesc ? "arrowdown" : "arrowup");
                btnSortClicked();
            }
        }
    };
}
function createBtnGetGps() {
    return {
        name: ToolbarItemType.btnGetGPS,
        location: 'after',
        locateInMenu: 'auto',
        widget: 'dxButton',
        options: {
            icon: 'globe',
            stylingMode: 'text',
            onClick: btnGetGpsClicked
        }
    }
}
function createToolbarCheckBox() {
    return {
        name: ToolbarItemType.checkBox,
        location: 'before',
        locateInMenu: 'never',
        widget: 'dxCheckBox',
        options: {
            value: false,
            onValueChanged: checkBoxValueChanged
        }
    }
}
function createSelectSort() {
    return {
        name: ToolbarItemType.selectSort,
        location: 'before',
        locateInMenu: 'never',
        widget: 'dxSelectBox',
        options: {
            displayExpr: function (item) {
                if (item)
                    return item.display;
                else
                    return "Sort By";
            },
            itemTemplate: function (data, _, element) {
                return data.display;
            },
            onSelectionChanged: function (e) {
                sortSelector = e.selectedItem.attribute;
                sortSelected();
            },
            searchEnabled: false,
            stylingMode: 'underlined',
            placeholder: 'Sort By',
            valueExpr: 'attribute',
            width: 'auto'
        }
    }
}
function createSelectView() {
    return {
        name: ToolbarItemType.selectView,
        location: 'center',
        locateInMenu: 'never',
        widget: 'dxSelectBox',
        options: {
            onSelectionChanged: viewSelected
        }
    };
}
function createSwitchMode() {
    if (typeof isOnline === 'undefined')
        isOnline = false;
    return {
        name: ToolbarItemType.switchMode,
        location: 'center',
        locateInMenu: 'never',
        widget: 'dxSwitch',
        options: {
            switchedOffText: MobileCRM.Localization.get("Action.DeviceMode"),
            switchedOnText: MobileCRM.Localization.get("Action.ServerMode"),
            width: "auto",
            onValueChanged: switchModeChanged,
            value: isOnline
        },
        visible: false
    };
}
function createTitle() {
    return {
        name: ToolbarItemType.title,
        location: 'center',
        locateInMenu: 'never',
        html: "<b><div id='toolbarTitle' /></b>"
    };
}

//============== UPDATE ================
function getToolbarItemIndex(toolbar, itemName) {
    var toolbarItems = toolbar.option("items");
    for (var i in toolbarItems) {
        if (toolbarItems[i].name === itemName)
            return i;
    }
    return -1;
}
function hasToolbarItem(toolbar, itemName) {
    return getToolbarItemIndex(toolbar, itemName) >= 0;
}
function updateToolbarItem(toolbar, itemName, optionName, value) {
    var toolbarItemIndex = getToolbarItemIndex(toolbar, itemName);
    toolbar.option("items[" + toolbarItemIndex + "]." + optionName, value);
    toolbar.repaint();
}
function updateToobarItemOptions(toolbar, itemName, options) {
    var toolbarItemIndex = getToolbarItemIndex(toolbar, itemName);
    toolbar.option("items[" + toolbarItemIndex + "].options", options);
    toolbar.repaint();
}
function setToolbarTitle(titleText) {
    $("#toolbarTitle").text(titleText);
}
function checkIsMultiPanel(toolbar) {
    try {
        MobileCRM.Platform.requestObject(function (platform) {
            if (hasToolbarItem(toolbar, ToolbarItemType.btnBack))
                updateToolbarItem(toolbar, ToolbarItemType.btnBack, "visible", platform.isMultiPanel);
            if (!platform.isMultiPanel && hasToolbarItem(toolbar, ToolbarItemType.btnSave)) {
                updateToolbarItem(toolbar, ToolbarItemType.btnSave, "visible", false);
                if (MobileCRM.UI.IFrameForm._handlers.onSave.length < 1)
                    MobileCRM.UI.IFrameForm.onSave(function () { btnSaveClicked(); }, true);
            }
            if (typeof isOnline !== 'undefined')
                updateToolbarItem(toolbar, ToolbarItemType.switchMode, "options.value", isOnline);

        }, MobileCRM.bridge.alert);
    } catch (e) { } // Handle IE issues when cannot determine window size   
}