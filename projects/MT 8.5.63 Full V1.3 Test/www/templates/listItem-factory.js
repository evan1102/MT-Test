//============== ACTION SHEET FACTORY ================
function ActionSheetFactory() {
    this.createItem = function (actionItems, divID) {
        actionSheet = $(divID).dxActionSheet({
            showCancelButton: false,
            itemTemplate: function (itemData, itemIndex, itemElement) {
                var linkContainer = $("<div class='action-sheet-button'>").css('font-size', 'large');
                linkContainer.append(
                    $("<div>").dxButton({
                        text: MobileCRM.Localization.get("Action." + itemData.text),
                        type: 'default',
                        stylingMode: itemData.mode,
                        onClick: itemData.onClick
                    }).css('font-size', 'x-large')
                );
                itemElement.append(linkContainer);
            }
        }).dxActionSheet("instance");

        actionItems.push(
            { text: "Cancel", type: 'default', mode: 'outlined', onClick: function () { actionSheet.hide(); } }
        );

        actionSheet.option("dataSource", actionItems);

        return actionSheet;
    }
}

//============== LIST FACTORY ================
function ListFactory() {
    this.createItem = function (divID, entityName, attrArray) {
        mainList = $(divID).dxList({
            searchEnabled: true,
            selectionMode: 'single',
            onItemClick: function (e) {
                selected[entityName] = e.itemData;
                listItemClicked(e);
            },
            pageLoadMode: 'scrollBottom'
        }).dxList("instance");

        $(attrArray).each(function (i, attr) {
            mainList.option(attr.name, attr.value);
        });

        return mainList;
    }
}

//============== LIST FUNCTIONS ================
function loadListData(list, listData) {
    if (typeof sortDesc === 'undefined')
        sortDesc = false;
    var sortArray = typeof sortSelector !== 'undefined' ?
        [{ selector: sortSelector, desc: sortDesc }] : "";

    list.option("dataSource", new DevExpress.data.DataSource({
        store: {
            type: "array",
            key: "id",
            data: listData
        },
        sort: sortArray,
        filter: typeof filterArray !== 'undefined' ? filterArray : null
    }));

    if (typeof loading !== 'undefined')
        loading.close();
}
function loadGroupedListData(list, listData) {
    if (typeof sortDesc === 'undefined')
        sortDesc = false;
    var sortArray = typeof sortSelector !== 'undefined' ?
        [{ selector: sortSelector, desc: sortDesc }] : "";
    var dataSource = list.getDataSource();
    if (dataSource) {
        var listGroup = dataSource.group();
        var listSort = dataSource.sort();
        if (listSort.length > 1) {
            $(listSort).each(function (i, sortItem) {
                if (sortItem.selector && sortItem.selector === sortSelector)
                    return;
                sortArray.push(sortItem);
            });
        }
    }

    list.option("dataSource", new DevExpress.data.DataSource({
        store: {
            type: "array",
            key: "id",
            data: listData
        },
        group: listGroup,
        sort: sortArray,
        filter: typeof filterArray !== 'undefined' ? filterArray : null
    }));

    if (typeof loading !== 'undefined')
        loading.close();
}
function addBarcodeSearch(list) {
    $("#mainList .dx-texteditor-buttons-container").append(
        $("<span class='dx-barcode-button-area'>").append(
            $("<img>").attr({ 'src': '../../images/barcode.png', 'onclick': 'barcodeClicked()' })
                .css({ 'width': '30px', 'height': '30px', 'margin': '2px' })
        ).css({ 'width': '34px', 'height': '34px' })
    );
}
function barcodeClicked() {
    MobileCRM.Platform.scanBarCode(function (res) {
        if (!res || res.length <= 0)
            showToast("Barcode doesn't contain any data", "error");
        else if (typeof barcodeScanned === 'function')
            barcodeScanned(res[0]); // Use this function if need to override search list
        else
            mainList.option("searchValue", res[0]);
    }, function (err) {
        if (err.toString().toLowerCase() === "failed") {
            // This occurs when you cancel or back out of scanning
            if (typeof loading !== 'undefined')
                loading.close();
            return;
        }
        else if (err.toString().toLowerCase() === 'unsupported') {
            alertError("Barcode Scanning is not supported on current platform");
        }
        else
            alertError(err);
    }, null);
}

//============== LIST FILTERING ================
const FilterDataType = {
    boolean: "boolean",
    date: "date",
    datetime: "datetime",
    number: "number",
    object: "object",
    string: "string"
}
function FilterFactory() {
    this.createFilterPopup = function (list, listToolbar) {
        $("#filterPopup").append(
            $("<div>").append(
                $("<div>").attr("id", "filterBuilder")
            ).attr("id", "popupScrollview"),
            $("<br>"),
            $("<span>").append(
                $("<span>").attr("id", "btnClearFilter"),
                $("<span>").attr("id", "btnApplyFilter").css("margin-left", "15px")
            ).css("float", "right")
        );

        $("#popupScrollview").dxScrollView({
            height: '300px',
            width: '100%',
            direction: 'both'
        });
        filterBuilder = $("#filterBuilder").dxFilterBuilder({
            onEditorPreparing: function (e) {
                // Needed for Windows, to be able to enter numbers from keyboard
                if (e.editorName === "dxNumberBox")
                    e.editorOptions.mode = 'number';
            }
        }).dxFilterBuilder("instance");

        btnClearFilter = $("#btnClearFilter").dxButton({
            text: "Clear Filter",
            type: "danger",
            onClick: function () {
                filterBuilder.option("value", null);
                filterArray = null;
                MobileCRM.bridge.raiseGlobalEvent("ListFilterCreated", {
                    entityName: entityName,
                    filterArray: filterArray
                });
                loadFilteredList(list, listToolbar, false);
            }
        }).dxButton("instance");
        btnApplyFilter = $("#btnApplyFilter").dxButton({
            text: "Apply Filter",
            type: "success",
            onClick: function () {
                filterArray = filterBuilder.getFilterExpression();
                MobileCRM.bridge.raiseGlobalEvent("ListFilterCreated", {
                    entityName: entityName,
                    filterArray: filterArray
                });
                loadFilteredList(list, listToolbar, true);
            }
        }).dxButton("instance");

        filterPopup = $("#filterPopup").dxPopup({
            shading: true,
            shadingColor: "rgba(0,0,0,0.2)",
            title: "Filter Condition",
            fullScreen: true,
            showCloseButton: true,
            onShowing: function () {
                loadFilterLookups(list);
            }
        }).dxPopup("instance");

        MobileCRM.bridge.raiseGlobalEvent("ListFilterRequested", { entityName: entityName });
        MobileCRM.bridge.onGlobalEvent("FilterList", function (args) {
            if (args && args.entityName === entityName) {
                filterArray = args.filterArray;
                loadFilteredList(list, listToolbar, true).then(function () {
                    filterBuilder.option("value", args.filterArray);
                }, alertError);
            }
        }, true, entityName);
    }
}

//============== FILTERING FUNCTIONS ================
function btnFilterClicked() {
    filterPopup.show();
}
function loadFilterLookups(list) {
    // Load select box drop downs for Objects
    var filterFields = listFilterItems;
    var listData = list.getDataSource();

    $(filterFields).each(function (index, item) {
        if (item.dataType === FilterDataType.object) {
            listData.load().done(function (res) {
                var lookupData = [];

                $(res).each(function (i, data) {
                    if (lookupData.indexOf(data[item.dataField]) < 0)
                        lookupData.push(data[item.dataField]);
                });

                item.lookup = { dataSource: lookupData };
                item.dataType = null;
            });
        }

        if (!item.caption) {    // Load Localization Caption
            MobileCRM.Localization.initialize(function (localization) {
                item.caption = localization.get(entityName + "." + item.dataField);
            }, alertError);
        }
    });

    filterBuilder.option("fields", filterFields);
}
function loadFilteredList(list, toolbar, applyFilter) {
    var deferred = $.Deferred();
    // Update Toolbar Filter Text
    var stringFilter = JSON.stringify(filterArray);
    var label = "";

    for (var i in listFilterItems) {
        if (stringFilter.indexOf(listFilterItems[i].dataField) > -1) {
            if (label.length < 1)
                label = listFilterItems[i].caption;
            else {
                label = "Multiple";
                break;
            }

            // Filter: Date Formatting
            if (listFilterItems[i].dataType === FilterDataType.date) {
                formatDateFilter(filterArray, listFilterItems[i].dataField);
            }
        }
    }

    updateToolbarItem(toolbar, ToolbarItemType.btnFilter, 'options.text',
        applyFilter ? label : "");
    showToast(applyFilter ? "Filter Applied" : "Filter Cleared", "success");

    // Load Data
    var dataSource = list.getDataSource();
    if (dataSource) {
        dataSource.store().load().done(function (listData) {
            if (list.option('grouped'))
                loadGroupedListData(list, listData);
            else
                loadListData(list, listData);
            filterPopup.hide();
            return deferred.resolve();
        });
    }
    else {
        filterPopup.hide();
        return deferred.resolve();
    }
    return deferred.promise();
}
function formatDateFilter(arr, dataField) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === dataField) {
            if (arr[i + 2]) {
                arr[i + 2] = new Date(arr[i + 2]);
            }
        }
        else if ($.isArray(arr[i])) {
            formatDateFilter(arr[i], dataField);
        }
    }
}
