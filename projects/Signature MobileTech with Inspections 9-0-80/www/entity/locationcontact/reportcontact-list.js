//============== INITIAL SETTINGS ================
var sendInspectionEmailOnCompletion = true;
var questionnaireCaption = "Inspection Report";
var inspectionReportName = "Questionnaire Report"; // Do not change, plugin dependent value
var formChanged = false, formShown = false, previousFormMaximized = false;
var maxEmailLengthReached = false, maxEmailLength = 0;
var scrollHeight = 110;
//============== FETCH DATA ================
var roleTypeAttributes = [
    SCHEMA.contactroletype.Properties.name,
    SCHEMA.contactroletype.Properties.description
];
var phoneTypeAttributes = [
    SCHEMA.contactphonetype.Properties.name,
    SCHEMA.contactphonetype.Properties.description
];
//============== FORM ITEMS ================
var requiredFormItems = [
    SCHEMA.locationcontact.Properties.gpcontactname,
    SCHEMA.locationcontact.Properties.gpemail
];

function createCommonItems() {
    //============== SCROLLVIEW ================
    mainScrollView = $("#mainScrollView").dxScrollView({
        showScrollbar: "always",
        height: function () { return window.innerHeight - scrollHeight; },
        width: '100%'
    }).dxScrollView("instance");
    $(window).resize(function () {
        MobileCRM.bridge.getWindowSize(function (obj) {
            mainScrollView.option("height", obj.height - scrollHeight);
        }, MobileCRM.bridge.alert);
        if (formShown) {
            MobileCRM.Platform.requestObject(function (platform) {
                isMultiPanel = platform.isMultiPanel;
            }, MobileCRM.bridge.alert, null);
            MobileCRM.UI.Form.requestObject(function (form) {
                if (isMultiPanel && !form.isMaximized) form.isMaximized = true;
                formPopup.repaint();
                addRolePopup.repaint();
            }, MobileCRM.bridge.alert);
        }
    });

    //============== TOOLBARS ================
    var formToolbarItems = [
        ToolbarItemType.btnBack, ToolbarItemType.title, ToolbarItemType.btnSave
    ];
    formToolbar = $("<div />").dxToolbar({
        items: (new ToolbarFactory()).addItems(formToolbarItems)
    }).dxToolbar("instance");

    //============== FORM ITEMS ================
    var formItems = [
        { dataField: SCHEMA.locationcontact.Properties.gpcontactname, editorType: EditorType.dxTextBox },
        { dataField: SCHEMA.locationcontact.Properties.gpemail, editorType: EditorType.emailTextBox },
        { dataField: SCHEMA.locationcontact.Properties.gpcontactroletype, editorType: EditorType.newSelectBox },
        { dataField: SCHEMA.locationcontact.Properties.gpphone, editorType: EditorType.phoneTextBox },
        { dataField: SCHEMA.locationcontact.Properties.gpcontactphonetype, editorType: EditorType.dxSelectBox }
    ];
    var formItemOptions = {
        gpcontactname: {
            validationMsg: "Alert.MissingContactName",
            onInput: function (e) { formChanged = true; },
            placeholder: "Enter Contact Name"
        },
        gpemail: {
            validationMsg: "Alert.MissingContactEmail",
            onInput: function (e) { formChanged = true; },
            maxLength: "320",
            placeholder: "Enter Email"
        },
        gpcontactroletype: {
            displayExpr: SCHEMA.contactroletype.Properties.name,
            valueExpr: SCHEMA.contactroletype.Properties.name,
            dataSource: roletypeData,
            itemTemplate: function (data, _, element) {
                return element.append(
                    $("<b>").text(data.name),
                    $("<i>").text(data.description ? " - " + data.description : "")
                );
            },
            onItemClick: function () { formChanged = true; }
        },
        gpphone: {
            onInput: function (e) { maskPhone(e); formChanged = true; },
            placeholder: "Enter Phone"
        },
        gpcontactphonetype: {
            displayExpr: SCHEMA.contactphonetype.Properties.name,
            valueExpr: SCHEMA.contactphonetype.Properties.name,
            dataSource: phonetypeData,
            itemTemplate: function (data, _, element) {
                return element.append(
                    $("<b>").text(data.name),
                    $("<i>").text(data.description ? " - " + data.description : "")
                );
            },
            onItemClick: function () { formChanged = true; }
        }
    };

    //============== FORMS ================
    contactForm = $("<div id='contactForm' />").dxForm({
        items: (new FormItemFactory()).createAndUpdateItems(formItems, formItemOptions)
    }).dxForm("instance");
    addRoleForm = $("<div id='addRoleForm' />").dxForm({
        items: [{
            dataField: SCHEMA.contactroletype.Properties.name,
            label: { location: "top", text: MobileCRM.Localization.get(entityName + "." + SCHEMA.locationcontact.Properties.gpcontactroletype) },
            editorType: "dxTextBox",
            editorOptions: { maxLength: 10, inputAttr: { 'style': 'text-transform: uppercase' } },
            isRequired: true
        }]
    }).dxForm("instance");
    addEmailForm = $("<div id='addEmailForm' />").dxForm({
        items: [{
            dataField: "email",
            label: { location: "top", text: MobileCRM.Localization.get(entityName + "." + SCHEMA.locationcontact.Properties.gpemail) },
            editorType: "dxTextBox",
            editorOptions: { maxLength: 320 },
            validationRules: [{ type: "email", message: MobileCRM.Localization.get("Alert.InvalidEmail") }]
        }]
    }).dxForm("instance");

    //============== POPUPS ================
    formPopup = $("#formPopup").dxPopup({
        fullScreen: true,
        shading: true,
        shadingColor: "rgba(0,0,0,0.2)",
        titleTemplate: function () { return formToolbar.element(); },
        contentTemplate: function (container) {
            var scrollView = $("<div id='scrollView'></div>");
            scrollView.append(contactForm.element());
            scrollView.dxScrollView({
                height: '100%',
                width: '100%'
            });
            container.append(scrollView);
            return container;
        },
        onShowing: loadFormOptions,
        onHiding: function () {
            selected[entityName] = null;
            MobileCRM.UI.Form.requestObject(function (form) {
                if (!previousformMaximized) form.isMaximized = false;
                form.showTitle = true;
                formShown = false;
                formChanged = false;
            }, MobileCRM.bridge.alert);
        }
    }).dxPopup("instance");
    addRolePopup = $("#addRolePopup").dxPopup({
        shading: true,
        shadingColor: "rgba(0,0,0,0.2)",
        contentTemplate: function (container) {
            container.append(
                addRoleForm.element(),
                $("<span style='float:right;margin:10px'>").dxButton({
                    text: MobileCRM.Localization.get("Cmd.Save"),
                    icon: "save", type: 'success',
                    onClick: btnSaveRoleClicked
                }),
                $("<span style='float:right;margin:10px'>").dxButton({
                    text: MobileCRM.Localization.get("Cmd.Cancel"),
                    icon: "close", type: 'danger',
                    onClick: function () { addRolePopup.hide(); }
                })
            );
            return container;
        },
        showTitle: false,
        height: '150px',
        width: '300px'
    }).dxPopup("instance");
    duplicatePopup = $("#duplicatePopup").dxPopup({
        shading: true,
        shadingColor: "rgba(0,0,0,0.2)",
        contentTemplate: function (container) {
            var scrollView = $("<div id='scrollView'></div>");
            scrollView.append(
                $("<strong>").append(MobileCRM.Localization.get("Alert.UpdateDiscardDuplicateContact")),
                $("<br><div id='contactCompare'/><br><br>"),
                $("<span style='float:right;margin:10px'>").dxButton({
                    text: MobileCRM.Localization.get("Cmd.Update"),
                    type: 'success',
                    onClick: updateAllContactEntities
                }),
                $("<span style='float:right;margin:10px'>").dxButton({
                    text: MobileCRM.Localization.get("Cmd.Discard"),
                    type: 'danger',
                    onClick: function () { duplicatePopup.hide(); formPopup.hide(); }
                })
            );
            scrollView.dxScrollView({
                height: '100%',
                width: '100%'
            });
            container.append(scrollView);
            return container;
        },
        title: MobileCRM.Localization.get(entityName + ".Title.DuplicateContact"),
        showCloseButton: false
    }).dxPopup("instance");
    emailPopup = $("#emailPopup").dxPopup({
        shading: true,
        shadingColor: "rgba(0,0,0,0.2)",
        contentTemplate: function (container) {
            container.append(
                addEmailForm.element(),
                $("<span style='float:right;margin:10px'>").dxButton({
                    text: MobileCRM.Localization.get("Cmd.Save"),
                    icon: "save", type: 'success',
                    onClick: btnSaveEmailClicked
                }),
                $("<span style='float:right;margin:10px'>").dxButton({
                    text: MobileCRM.Localization.get("Cmd.Cancel"),
                    icon: "close", type: 'danger',
                    onClick: function () { emailPopup.hide(); }
                })
            );
            return container;
        },
        showTitle: false,
        height: '150px',
        width: '300px'
    }).dxPopup("instance");
}

//============== LOAD OPTIONS ================
// ----- Form Options -----
function loadFormOptions() {
    // Maximize Form
    MobileCRM.Platform.requestObject(function (platform) {
        isMultiPanel = platform.isMultiPanel;
    }, MobileCRM.bridge.alert, null);
    MobileCRM.UI.Form.requestObject(function (form) {
        previousformMaximized = form.isMaximized;
        if (isMultiPanel && !form.isMaximized) form.isMaximized = true;
        form.showTitle = false;
        formShown = true;

        // Reset Data
        contactForm.option("formData", {});

        if (selected[entityName] != null) {
            // Update Existing Contact
            isNew = false;
            $("#toolbarTitle").text(MobileCRM.Localization.get("Cmd.UpdateContact"));
            contactForm.updateData(selected[entityName]);
        }
        else {  // New Contact
            isNew = true;
            $("#toolbarTitle").text(MobileCRM.Localization.get("Cmd.CreateContact"));
        }

        formChanged = false;
        loadFormItemOptions();
    }, MobileCRM.bridge.alert, null);
}
function loadFormItemOptions() {
    $(requiredFormItems).each(function (index, itemName) {
        contactForm.itemOption(itemName, 'isRequired', true);
    });

    contactForm.itemOption(SCHEMA.locationcontact.Properties.gpphone, 'visible', isNew);
    contactForm.itemOption(SCHEMA.locationcontact.Properties.gpcontactphonetype, 'visible', isNew);

    if (isNew)
        fetchContactPhoneType();
    fetchContactRoleType();
}

function checkUseInspections() {
    var deferred = $.Deferred();
    MobileCRM.Metadata.requestObject(function (metadata) {
        if (!MobileCRM.Metadata.getEntity(SCHEMA.resco_questionnaire.name)) {
            return deferred.resolve(false);
        }
        MobileCRM.Application.checkUserRoles(["Inspector"], function (roleCount) {
            return deferred.resolve(roleCount === 1);
        }, function (err) {
            return deferred.reject("Check User Roles Error: " + err);
        });
    }, function (err) {
        return deferred.reject("Has Inspections Enabled Error: " + err);
    });
    return deferred.promise();
}

//============== LOAD DATA ================
function fetchContactRoleType() {
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.contactroletype.name);
    $(roleTypeAttributes).each(function (index, attribute) {
        entity.addAttribute(attribute);
    });
    entity.orderBy(SCHEMA.contactroletype.Properties.name);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        roletypeData = res;

        $("#gpcontactroletype").dxSelectBox("instance").option("dataSource", roletypeData);
        if (contactForm.option("formData").gpcontactroletype) {
            addRoleToDataSource(contactForm.option("formData").gpcontactroletype);
            formChanged = false;
        }
    }, MobileCRM.bridge.alert, null);
}
function fetchContactPhoneType() {
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.contactphonetype.name);
    $(phoneTypeAttributes).each(function (index, attribute) {
        entity.addAttribute(attribute);
    });
    entity.orderBy(SCHEMA.contactphonetype.Properties.name);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        phonetypeData = res;
        contactForm.getEditor(SCHEMA.locationcontact.Properties.gpcontactphonetype).option("dataSource", phonetypeData);
    }, MobileCRM.bridge.alert, null);
}

//============== TOOLBAR FUNCTIONS ================
function btnClearClicked() {
    mainList.option("selectedItems", []);
}
function btnNewClicked() {
    if (selected.location && JSON.parse(selected.location.isservicelocation.toString().toLowerCase())) {
        formPopup.show();
    }
    else {
        emailPopup.show();
        addEmailForm.resetValues();
    }
}

// ----- Form Toolbar -----
function btnBackClicked() {
    if (formPopup.option('visible')) {
        if (addRolePopup.option('visible')) {
            addRoleForm.getEditor('name').blur();
            if (addRoleForm.getEditor('name').option('value').trim() !== '') {
                sayLocalization("Alert.UnsavedData");
            }
            else {
                addRolePopup.hide();
            }
        }
        else if (formChanged) {
            var popup = new MobileCRM.UI.MessageBox("Contact Form");
            popup.items = [
                MobileCRM.Localization.get("Cmd.SaveClose"),
                MobileCRM.Localization.get("Cmd.Discard"),
                MobileCRM.Localization.get("Cmd.ContinueEdit")
            ];
            popup.multiLine = true;
            popup.show(function (btn) {
                if (btn === popup.items[0])
                    btnSaveClicked();
                if (btn === popup.items[1])
                    formPopup.hide();
                return;
            });
        }
        else
            formPopup.hide();
    }
    else {
        MobileCRM.bridge.closeForm();
    }
}
function btnSaveClicked() {
    contactForm.validate();
    if (!contactForm.getEditor(SCHEMA.locationcontact.Properties.gpcontactname).option("value")) {
        contactForm.getEditor(SCHEMA.locationcontact.Properties.gpcontactname).focus();
        showToast(MobileCRM.Localization.get("Alert.MissingContactName"), "error");
    }
    else if (!contactForm.getEditor(SCHEMA.locationcontact.Properties.gpemail).option("value")) {
        contactForm.getEditor(SCHEMA.locationcontact.Properties.gpemail).focus();
        showToast(MobileCRM.Localization.get("Alert.MissingContactEmail"), "error");
    }
    else if (!isValidEmailAddress(contactForm.getEditor(SCHEMA.locationcontact.Properties.gpemail).option("value")) ||
        !contactForm.getEditor(SCHEMA.locationcontact.Properties.gpemail).option("isValid")) {
        contactForm.getEditor(SCHEMA.locationcontact.Properties.gpemail).option("isValid", false);
        contactForm.getEditor(SCHEMA.locationcontact.Properties.gpemail).focus();
        showToast(MobileCRM.Localization.get("Alert.InvalidEmail"), "error");
    }
    else if (contactForm.itemOption(SCHEMA.locationcontact.Properties.gpcontactphonetype).visible &&
        contactForm.getEditor(SCHEMA.locationcontact.Properties.gpcontactphonetype).option("value") &&
        !contactForm.getEditor(SCHEMA.locationcontact.Properties.gpphone).option("value")) {
        contactForm.getEditor(SCHEMA.locationcontact.Properties.gpphone).focus();
        showToast(MobileCRM.Localization.get("Alert.MissingPhoneNumber"), "error");
    }
    else if (isNew)
        checkForDuplicate();
    else
        updateAllContactEntities();
}

function newItemBtnClicked() {
    addRolePopup.show();
    addRoleForm.resetValues();
}
function btnSaveRoleClicked() {
    addRoleForm.validate();
    if (!addRoleForm.getEditor(SCHEMA.contactroletype.Properties.name).option("value")) {
        addRoleForm.getEditor(SCHEMA.contactroletype.Properties.name).focus();
        showToast(MobileCRM.Localization.get("Alert.MissingRoleName"), "error");
    }
    else
        createRole();
}
function btnSaveEmailClicked() {
    addEmailForm.validate();
    if (!addEmailForm.getEditor('email').option("value")) {
        addEmailForm.getEditor('email').focus();
        showToast(MobileCRM.Localization.get("Alert.MissingContactEmail"), "error");
    }
    else {
        var email = addEmailForm.getEditor('email').option("value").trim();
        if (!isValidEmailAddress(email) || !addEmailForm.getEditor('email').option("isValid")) {
            addEmailForm.getEditor('email').option("isValid", false);
            addEmailForm.getEditor('email').focus();
            showToast(MobileCRM.Localization.get("Alert.InvalidEmail"), "error");
        }
        else {
            var newContact = { gpemail: email, id: new Date() }
            var selectedContacts = mainList.option("selectedItems");

            selectedContacts.push(newContact);
            entityListData.push(newContact);

            loadListData(mainList, entityListData);
            mainList.option("selectedItems", selectedContacts);

            emailPopup.hide();
            showToast(MobileCRM.Localization.get("Alert.EmailAdded"), "success");
        }
    }
}

//============== LIST ITEM FUNCTIONS ================
function listItemClicked() {
    // Don't do any action when list item is clicked
    // All action is determined from list item buttons, but still need this function
}
function validateEmail(e) {
    var validEmail = isValidEmailAddress(e.itemData.gpemail);
    var checkBox = e.itemElement.find('.dx-list-select-checkbox')
        .dxCheckBox({ disabled: !validEmail });
}

//============== FORM ITEM FUNCTIONS ================
function checkForDuplicate() {
    if (!contactForm.getEditor(SCHEMA.locationcontact.Properties.gpphone).option("value")) {
        createContact();    // No way to have duplicate
        return;
    }

    var formData = contactForm.option("formData");
    formData.gpcontactroletype = $("#gpcontactroletype").dxSelectBox("instance").option("value");
    var phoneNum = formData.gpphone ? formData.gpphone.replace(/[^0-9\.]/g, '') : "";

    var existingContact = $.map(entityListData, function (contact) {
        if (contact.id === formData.id)
            return null;
        var matchEmail = false;
        // Remove extension if it is "0000"
        var comparePhone = typeof contact.gpphone !== 'undefined' && contact.gpphone.toString().substring(10) === "0000" ?
            contact.gpphone.toString().substring(0, 10) : contact.gpphone;
        var matchPhone = comparePhone === phoneNum;
        if (contact.gpemail) {
            matchEmail = $.trim(contact.gpemail.toUpperCase()) === $.trim(formData.gpemail.toUpperCase());
        }
        return matchEmail && matchPhone ? contact : null;
    });

    if (existingContact[0])
        duplicateContact(formData, existingContact[0]);
    else
        createContact();
}
function createContact() {
    var formData = contactForm.option("formData");
    var phoneNum = formData.gpphone ? formData.gpphone.replace(/[^0-9\.]/g, '') : "";
    var entity = new MobileCRM.DynamicEntity.createNew(entityName);

    entity.properties.name = "MT_Created";
    entity.properties.gpcontacttype = "Signature";
    entity.properties.gpcustomernumber = selected.location.gpcustomernumber;
    entity.properties.gplocationnumber = selected.location.gplocationnumber;
    entity.properties.locationid = new MobileCRM.DynamicEntity(SCHEMA.location.name, selected.location.id);

    entity.properties.gpcontactname = formData.gpcontactname;
    entity.properties.gpemail = formData.gpemail;
    entity.properties.gpcontactroletype = formData.gpcontactroletype;
    entity.properties.gpphone = phoneNum;
    entity.properties.gpcontactphonetype = formData.gpcontactphonetype;

    entity.save(error_create);
}
function error_create(err) {
    if (err)
        MobileCRM.bridge.alert("Create Error:\n" + err);
    else {
        closeFormAddContact(this.properties);
    }
}
function updateAllContactEntities() {
    // No added phone, just need to update the common contact attributes
    var formData = contactForm.option("formData");
    allContactEntities = new DevExpress.data.DataSource({
        store: contacts ? contacts : entityListData,
        filter: [SCHEMA.locationcontact.Properties.gpcontactid, "=", formData.gpcontactid],
        sort: SCHEMA.locationcontact.Properties.gpphoneid,
        paginate: false
    });

    allContactEntities.load().done(function (entities) {
        if (entities.length > 0) {
            entities.forEach(function (item, index) {
                MobileCRM.DynamicEntity.loadById(entityName, item.id, function (entity) {
                    entity.properties.gpcontactname = formData.gpcontactname;
                    entity.properties.gpemail = formData.gpemail;
                    entity.properties.gpcontactroletype = formData.gpcontactroletype ? formData.gpcontactroletype : "";
                    entity.save(function (err) {
                        if (err)
                            MobileCRM.bridge.alert("Error Updating:\n" + err);
                        else {
                            closeFormUpdateContact(this.properties,
                                entities.length - 1 === index,
                                formData.id
                            );
                        }
                    });
                }, MobileCRM.bridge.alert, null);
            });
        }
    });
}

function duplicateContact(newContact, existingContact) {
    var matchName = sameValues(newContact.gpcontactname, existingContact.gpcontactname);
    var matchRole = sameValues(newContact.gpcontactroletype, existingContact.gpcontactroletype);
    var matchPhoneType = sameValues(newContact.gpcontactphonetype, existingContact.gpcontactphonetype);

    if (matchName && matchRole && matchPhoneType) {
        formPopup.hide();
        showToast(MobileCRM.Localization.get(entityName + ".Title.ContactAlreadyExists"), "info");
    }
    else {
        newContact.id = existingContact.id;
        newContact.gpcontactid = existingContact.gpcontactid;
        contactForm.option("formData", newContact);

        var lblName = MobileCRM.Localization.get(entityName + "." + SCHEMA.locationcontact.Properties.gpcontactname);
        var lblEmail = MobileCRM.Localization.get(entityName + "." + SCHEMA.locationcontact.Properties.gpemail);
        var lblRole = MobileCRM.Localization.get(entityName + "." + SCHEMA.locationcontact.Properties.gpcontactroletype);
        var lblPhone = MobileCRM.Localization.get(entityName + "." + SCHEMA.locationcontact.Properties.gpphone);
        var lblPhoneType = MobileCRM.Localization.get(entityName + "." + SCHEMA.locationcontact.Properties.gpcontactphonetype);
        var lblNoChange = MobileCRM.Localization.get(entityName + ".Label.NoChange");
        var lblExisting = MobileCRM.Localization.get(entityName + ".Label.Existing");
        var lblNew = MobileCRM.Localization.get(entityName + ".Label.New");

        var noChangeString = "<i>" + lblEmail + ": </i>" + newContact.gpemail +
            "<br><i>" + lblPhone + ": </i>" + formatNoneString(newContact.gpphone) + "<br>";
        noChangeString += matchName ? "<i>" + lblName + ": </i>" + newContact.gpcontactname + "<br>" : "";
        noChangeString += matchRole ? "<i>" + lblRole + ": </i>" + formatNoneString(newContact.gpcontactroletype) + "<br>" : "";
        noChangeString += matchPhoneType ? "<i>" + lblPhoneType + ": </i>" + formatNoneString(newContact.gpcontactphonetype) + "<br>" : "";

        var changeData = [];
        if (!matchName) {
            changeData.push({
                attribute: lblName,
                existing: existingContact.gpcontactname,
                new: newContact.gpcontactname
            });
        }

        if (!matchRole) {
            changeData.push({
                attribute: lblRole,
                existing: formatNoneString(existingContact.gpcontactroletype),
                new: formatNoneString(newContact.gpcontactroletype)
            });
        }

        if (!matchPhoneType) {
            changeData.push({
                attribute: lblPhoneType,
                existing: formatNoneString(existingContact.gpcontactphonetype),
                new: formatNoneString(newContact.gpcontactphonetype)
            });
        }
        duplicatePopup.show();
        $("#contactCompare").empty();
        $("#contactCompare").append(
            $("<br>"),
            $("<div>").append(
                $("<strong>").append(lblNoChange),
                $("<div>").append(noChangeString),
                $("<br>")
            ).css("color", "#808080"),
            $("<div>").dxDataGrid({
                dataSource: changeData,
                columns: [
                    { dataField: "attribute", headerCellTemplate: $(), cssClass: "wrapText" },
                    {
                        dataField: "existing", cssClass: "wrapText",
                        headerCellTemplate: $('<strong style="color: black">' + lblExisting + '</strong>')
                    }, {
                        dataField: "new", cssClass: "wrapText",
                        headerCellTemplate: $('<strong style="color: green">' + lblNew + '</strong>'),
                    }
                ]
            })
        );
    }
}
function sameValues(value1, value2) {
    var match = !value1 && !value2 ? true : false;
    if (value1 && value2)
        match = $.trim(value1.toString().toUpperCase()) === $.trim(value2.toString().toUpperCase());

    return match;
}
function formatNoneString(str) {
    return str ? str : MobileCRM.Localization.get(entityName + ".Label.None");
}

function createRole() {
    var formData = addRoleForm.option("formData");
    addRoleToDataSource($.trim(formData.name.toUpperCase()));
    formChanged = true;
    addRolePopup.hide();
}
function addRoleToDataSource(newRole) {
    // CHECK IF gpcontactroletype ALREADY EXISTS AS A contactroletype ENTITY
    var result = $.map(roletypeData, function (entry) {
        var match = entry.name.toUpperCase().indexOf(newRole.toUpperCase()) !== -1;
        return match ? entry : null;
    });
    if (result[0])
        $("#gpcontactroletype").dxSelectBox("instance").option("value", result[0].name);
    else {
        var roleData = new DevExpress.data.DataSource({
            store: roletypeData,
            sort: 'name',
            paginate: false
        });
        roleData.store().insert({
            name: newRole
        }).done(function () {
            roleData.load();
            $("#gpcontactroletype").dxSelectBox("instance").option("dataSource", roleData);
            $("#gpcontactroletype").dxSelectBox("instance").option("value", newRole);
        });
    }
}
