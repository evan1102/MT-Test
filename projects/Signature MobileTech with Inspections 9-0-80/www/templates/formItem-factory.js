//============== ENUM ================
const EditorType = {
    // --- Standard Types ---
    dxTextBox: "dxTextBox",
    dxTextArea: "dxTextArea",
    dxSelectBox: "dxSelectBox",
    dxDateBox: "dxDateBox",
    dxCheckBox: "dxCheckBox",
    dxSwitch: "dxSwitch",
    dxRadioGroup: "dxRadioGroup",
    dxNumberBox: "dxNumberBox",
    // --- Custom Types ---
    phoneTextBox: "phoneTextBox",
    emailTextBox: "emailTextBox",
    hyperlinkTextBox: "hyperlinkTextBox",   // function needed: hyperlinkClicked
    lookupTextBox: "lookupTextBox",         // function needed: lookupBtnClicked
    barcodeSelectBox: "barcodeSelectBox",   // function needed: barcodeBtnClicked
    newSelectBox: "newSelectBox",           // function needed: newItemBtnClicked    
    addPhoneBtn: "addPhoneBtn",             // function needed: showPhoneFormItems
};
const SelectBoxBtn = {
    barcode: "barcode",
    new: "new"
};

//============== FACTORY ================
function FormItemFactory() {
    this.createItem = function (itemDetails) {
        var formItem;
        switch (itemDetails.editorType) {
            // --- Standard Types ---
            case EditorType.dxTextBox: formItem = createTextBox(); break;
            case EditorType.dxTextArea: formItem = createTextArea(); break;
            case EditorType.dxSelectBox: formItem = createSelectBox(); break;
            case EditorType.dxDateBox: formItem = createDateBox(); break;
            case EditorType.dxCheckBox: formItem = createCheckBox(); break;
            case EditorType.dxSwitch: formItem = createSwitch(); break;
            case EditorType.dxRadioGroup: formItem = createRadioGroup(); break;
            case EditorType.dxNumberBox: formItem = createNumberBox(); break;
            // --- Custom Types ---
            case EditorType.phoneTextBox:
                formItem = createPhoneTextBox();
                itemDetails.editorType = EditorType.dxTextBox;
                break;
            case EditorType.emailTextBox:
                formItem = createEmailTextBox();
                itemDetails.editorType = EditorType.dxTextBox;
                break;
            case EditorType.hyperlinkTextBox:
                formItem = createHyperlinkTextBox();
                itemDetails.editorType = EditorType.dxTextBox;
                break;
            case EditorType.lookupTextBox:
                formItem = createLookupTextBox();
                break;
            case EditorType.barcodeSelectBox:
                formItem = createCustomSelectBox(SelectBoxBtn.barcode);
                break;
            case EditorType.newSelectBox:
                formItem = createCustomSelectBox(SelectBoxBtn.new);
                break;
            case EditorType.addPhoneBtn:
                formItem = createAddPhoneBtn();
                break;
        }

        formItem.dataField = itemDetails.dataField;
        formItem.editorType = itemDetails.editorType;
        formItem.label = {
            text: itemDetails.label ? itemDetails.label : MobileCRM.Localization.get(entityName + "." + itemDetails.dataField),
            visible: itemDetails.labelVisible === undefined || itemDetails.labelVisible ? true : false,
            location: itemDetails.editorType === EditorType.dxCheckBox ||
                itemDetails.editorType === EditorType.dxSwitch ? "left" : "top"
        };

        return formItem;
    }

    this.addItems = function (itemArr) {
        var formItems = [];
        for (var i in itemArr) {
            formItems.push(this.createItem(itemArr[i]));
        }

        return formItems;
    }

    this.updateEditorOptions = function (formItems, editorOptions) {
        $(formItems).each(function (_, value) {
            var updatedEditorOptions = editorOptions[value.dataField];
            if (updatedEditorOptions) {
                for (var i in updatedEditorOptions) {
                    value.editorOptions[i] = updatedEditorOptions[i];
                }
            }
        });
        return formItems;
    }

    this.createAndUpdateItems = function (formItems, editorOptions) {
        var genericFormItems = this.addItems(formItems);
        var updatedFormItems = this.updateEditorOptions(genericFormItems, editorOptions);
        return updatedFormItems;
    }
}

//============== CREATE ================
// --- Standard Types ---
function createTextBox() {
    return {
        editorOptions: {
            onInput: MobileCRM.UI.IFrameForm.setDirty,
            // stylingMode: "underlined"
        }
    };
}
function createTextArea() {
    return {
        editorOptions: {
            height: 90,
            onInput: function (e) {
                MobileCRM.UI.IFrameForm.setDirty();
                var inputElm = e.element[0].getElementsByClassName('dx-texteditor-input')[0];
                e.component.option('value', inputElm.value);
            }
        }
    };
}
function createSelectBox() {
    return {
        editorOptions: {
            displayExpr: 'name',
            onItemClick: MobileCRM.UI.IFrameForm.setDirty,
            onOpened: enableSearch,
            searchEnabled: false,
            searchMode: "contains",
            valueExpr: 'id'
        }
    };
}
function createDateBox() {
    return {
        editorOptions: {
            pickerType: 'calendar',
            type: 'datetime',
            onFocusIn: function (e) {
                if (e.component.option('pickerType') === "calendar") {
                    e.component.blur();
                    if (!e.component.option('openOnFieldClick')) {
                        e.component.option('openOnFieldClick', true);
                        e.component.open();
                    }
                }
            }
        }
    };
}
function createCheckBox() {
    return {
        editorOptions: {
            onValueChanged: function (data) {
                this.option("text", data.value === true ? "Yes" : "No")
            },
            text: "No",
            value: false
        }
    };
}
function createSwitch() {
    return {
        editorOptions: {
            switchedOffText: "No",
            switchedOnText: "Yes"
        }
    }
}
function createRadioGroup() {
    return {
        editorOptions: {}
    }
}
function createNumberBox() {
    return {
        editorOptions: {
            format: "#,##0.00",
            min: 0,
            max: 1000000000.00,
            onInput: MobileCRM.UI.IFrameForm.setDirty,
            onValueChanged: MobileCRM.UI.IFrameForm.setDirty,
            showSpinButtons: true,
            useLargeSpinButtons: true,
            value: 0
        }
    };
}
// --- Custom Types ---
function createPhoneTextBox() {
    return {
        editorOptions: {
            maxLength: 24,
            onInput: maskPhoneSetIFrameDirty,
            onValueChanged: maskPhone,
            valueChangeEvent: "keyup"
        }
    };
}
function createEmailTextBox() {
    return {
        editorOptions: {
            onFocusOut: function (e) {
                e.component.option("value", e.component.option("value").trim());
            },
            onInput: MobileCRM.UI.IFrameForm.setDirty
        },
        validationRules: [{
            type: "email",
            message: "Email is invalid"
        }]
    };
}
function createHyperlinkTextBox() {
    createCssClass("hyperlink .dx-texteditor-input", [
        "color: #5174FA",
        "text-decoration: underline"
    ]);
    return {
        cssClass: "hyperlink",
        editorOptions: {
            readOnly: true,
            onFocusIn: function (e) {
                e.component.blur();
                hyperlinkClicked();
            }
        },
    }
}
function createLookupTextBox() {
    return {
        template: function (data, element) {
            element.append(
                $("<div>").dxBox({
                    direction: "row",
                    width: "100%",
                    items: [
                        { ratio: 1, html: "<div id='" + data.dataField + "'>" },
                        { ratio: 0, baseSize: 5 },
                        {
                            ratio: 0, baseSize: 55,
                            html: "<div id='" + data.dataField + "Btn' style='float:right'></div>"
                        }
                    ]
                })
            );

            var textBox = $("#" + data.dataField).dxTextBox(data.editorOptions).dxTextBox("instance");
            textBox.option({
                onValueChanged: function (e) {
                    data.component.updateData(data.dataField, e.value);
                    MobileCRM.UI.IFrameForm.setDirty();
                },
                value: data.component.option('formData')[data.dataField]
            });

            $("#" + data.dataField + "Btn").dxButton({
                icon: 'find',
                onClick: lookupBtnClicked
            });
        },
        editorOptions: {}
    }
}
function createCustomSelectBox(btnType) {
    var btnIcon, btnMethod;
    switch (btnType) {
        case SelectBoxBtn.barcode: btnIcon = '../../images/barcode.png'; btnMethod = barcodeBtnClicked; break;
        case SelectBoxBtn.new: btnIcon = 'add'; btnMethod = newItemBtnClicked; break;
    }

    return {
        template: function (data, element) {
            element.append(
                $("<div>").dxBox({
                    direction: "row",
                    width: "100%",
                    items: [
                        { ratio: 1, html: "<div id='" + data.dataField + "'>" },
                        { ratio: 0, baseSize: 5 },
                        {
                            ratio: 0, baseSize: 55,
                            html: "<div id='" + data.dataField + "Btn' style='float:right'></div>"
                        }
                    ]
                })
            );

            var selectBox = $("#" + data.dataField).dxSelectBox(data.editorOptions).dxSelectBox("instance");
            if (selectBox !== undefined) {
                selectBox.option({
                    onValueChanged: function (e) {
                        data.component.updateData(data.dataField, e.value);
                    },
                    value: data.component.option('formData')[data.dataField]
                });
            }

            $("#" + data.dataField + "Btn").dxButton({
                icon: btnIcon,
                onClick: btnMethod
            });
        },
        editorOptions: {}
    };
}
function createAddPhoneBtn() {
    return {
        itemType: "button",
        horizontalAlignment: "right",
        buttonOptions: {
            icon: 'add',
            text: 'Add Phone',
            stylingMode: 'text',
            onClick: showPhoneFormItems
        }
    }
}

//============== UPDATE ================
function getFormItemIndex(formItems, dataField) {
    for (var i in formItems) {
        if (formItems[i].dataField === dataField)
            return i;
    }
}
function enableSearch() {
    if (!this.option("searchEnabled"))
        this.option("searchEnabled", true);
}

//============== LOAD DATA ================
function loadDataSource(form, dataField, data) {
    if (data) {
        if (typeof form.getEditor(dataField) === 'undefined')
            // Custom Select Box (ie barcode, new, etc)
            $("#" + dataField).dxSelectBox("instance").option("dataSource", data);
        else
            form.getEditor(dataField).option("dataSource", data);
    }

    if (typeof selectBoxDataSource === 'undefined')
        selectBoxDataSource = {};    // Needed for reloadFormDataSources 
    selectBoxDataSource[dataField] = data;
}
function reloadFormDataSources(form) {
    if (typeof selectBoxDataSource !== 'undefined') {
        for (var i in selectBoxDataSource) {
            loadDataSource(form, i, selectBoxDataSource[i]);
        }
    }
}
function loadFormValues(form, values) {
    form.updateData(values);
    var formItems = form.option("items");
    for (var i in formItems) {
        if (formItems[i].visible === false)
            continue;

        if (formItems[i].editorType.indexOf("SelectBox") > -1) {
            var dataField = formItems[i].dataField;
            if (dataField.substring(dataField.length - 2, dataField.length) === 'id') {
                var lookupEntityName = dataField.substring(0, dataField.length - 2);
                MobileCRM.DynamicEntity.loadById(lookupEntityName, values[dataField].id, function (res) {
                    // Note: valueExpr should be 'id' 
                    loadSelectBoxValue(form, dataField, res.properties);
                }, alertError);
            }
            else if (dataField.substring(0, 2) === 'gp')
                // Note: valueExpr must be 'name' 
                loadSelectBoxValue(form, dataField, { 'name': values[dataField] });

        }
        else if (formItems[i].editorType === EditorType.numberBox) {
            var numBoxDataField = formItems[i].dataField;
            $("#" + numBoxDataField).dxNumberBox("instance")
                .option("value", values[numBoxDataField] ? values[numBoxDataField] : 0);
            $("#" + numBoxDataField).dxNumberBox("instance").blur();
        }
        else if (formItems[i].editorType === EditorType.lookupTextBox) {
            var lookupBoxDataField = formItems[i].dataField;
            $("#" + lookupBoxDataField).dxTextBox("instance").option("value", values[lookupBoxDataField]);
            $("#" + lookupBoxDataField).dxTextBox("instance").blur();
        }
    }
}
function loadSelectBoxValue(form, dataField, entityProps) {
    if (typeof form.getEditor(dataField) === 'undefined') {
        // Custom Select Box (ie barcode, new, etc)
        selectBoxInstance = $("#" + dataField).dxSelectBox("instance");
        var valueExpr = selectBoxInstance.option('valueExpr');
        var updatedValue = entityProps[valueExpr];
        selectBoxInstance.option("value", updatedValue);
    }
    else
        form.getEditor(dataField).option("value",
            entityProps[form.getEditor(dataField).option("valueExpr")]);
}
function resetFormValues(form, formItems) {
    $(formItems).each(function (_, value) {
        resetFormItemValue(form, value.dataField);
    });
}
function resetFormItemValue(form, dataField) {
    if (typeof form.getEditor(dataField) === 'undefined')
        // Custom Select Box (ie barcode, new, etc)
        $("#" + dataField).dxSelectBox("instance").reset();
    else
        form.getEditor(dataField).reset();
}

//============== VALIDATE ================
function maskPhoneSetIFrameDirty(e) {
    maskPhone(e);
    MobileCRM.UI.IFrameForm.setDirty();
}
function checkForRequiredValues(form, dataFieldArr, success, error) {
    var missingValue = false;
    for (var i in dataFieldArr) {
        if (typeof form.getEditor(dataFieldArr[i]) === 'undefined') {
            // Custom Select Box (ie barcode, new, etc)
            var entitySelectBox = $("#" + dataFieldArr[i]).dxSelectBox("instance");
            if (!entitySelectBox.option("value")) {
                entitySelectBox.focus();
                entitySelectBox.option({
                    "isValid": false,
                    "validationError": {
                        message:
                            form.option("items")[i].label.text + " is required"
                    }
                });

                var validationMsg = entitySelectBox.option("validationMsg");
                var toastMsg = MobileCRM.Localization.get(validationMsg);
                if (validationMsg.indexOf("Fmt") > -1) {
                    var attributeName = entitySelectBox.option("name");
                    toastMsg = toastMsg.format(MobileCRM.Localization.get(entityName + "." + attributeName));
                }
                showToast(toastMsg, "error");
                missingValue = true;
                break;
            }
        }
        else if (!form.getEditor(dataFieldArr[i]).option("value")) {
            form.getEditor(dataFieldArr[i]).focus();

            var validationMsg = form.getEditor(dataFieldArr[i]).option("validationMsg")
            var toastMsg = MobileCRM.Localization.get(validationMsg);
            if (validationMsg.indexOf("Fmt") > -1) {
                var attributeName = form.getEditor(dataFieldArr[i]).option("name");
                toastMsg = toastMsg.format(MobileCRM.Localization.get(entityName + "." + attributeName));
            }
            showToast(toastMsg, "error");
            missingValue = true;
            break;
        }
    }
    if (missingValue)
        error();
    else
        success();
}