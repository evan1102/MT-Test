var setupOptions = {};
//============== DISPLAY FORMATTING ================
// For use with MobileCRM.Localization.get
String.prototype.format = function () {
    var s = this;
    for (var i = 0; i < arguments.length; i++) {
        var reg = new RegExp("\\{" + i + "\\}", "gm");
        s = s.replace(reg, arguments[i]);
    }

    return s;
}
String.prototype.formatCurrency = function () {
    var s = this;
    var langId = arguments[0];
    var currency;
    switch (langId) {
        case 'en-US': currency = 'USD'; break;
        default: currency = 'USD'; break;
    }

    for (var i = 1; i < arguments.length; i++) {
        var currencyStr = "{" + (i - 1) + ":C}";
        var replaceStr = arguments[i].toLocaleString(langId, { style: 'currency', currency: currency })
        s = s.replace(currencyStr, replaceStr);
    }

    return s;
}
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        return this.substr(position || 0, searchString.length) === searchString;
    };
}
function formatString(str) { return !str ? "" : str; }
function formatAddress(city, state, zip) {
    return !city ? "" : city + ", " + state + "  " + zip;
}
function formatFloat(num, fixedDecimal) {
    return !num ? parseFloat(0).toFixed(fixedDecimal) : parseFloat(num).toFixed(fixedDecimal);
}
function formatFloatHideZeros(num, fixedDecimal) {
    var formattedNum = formatFloat(num, fixedDecimal);
    return formattedNum > 0 ? formattedNum : "";
}
function formatDate(dateString) {
    return (new Date(dateString)).toLocaleDateString();
}
function formatTime(dateString) {
    return (new Date(dateString)).toLocaleTimeString(navigator.language, { hour: 'numeric', minute: '2-digit' });
}
function formatDateTime(dateString) {
    return formatDate(dateString) + " " + formatTime(dateString);
}
function formatPhone(numStr) {
    if (numStr) //If ext is 0000 do not show
        ext = numStr.length > 10 && numStr.substring(10) !== "0000" ? " ext: " + numStr.substring(10) : "";
    return !numStr ? "" :
        "(" + numStr.substring(0, 3) + ") " +
        numStr.substring(3, 6) + "-" + numStr.substring(6, 10) + ext;
}
function maskPhoneSetDirty(e) {
    setDirty();
    maskPhone(e);
}
function maskPhone(e) {
    var inputElm = e.element[0].getElementsByClassName('dx-texteditor-input')[0];
    var cursorPos = inputElm.selectionStart;
    var val = inputElm.value;
    val = val.replace(/[^0-9\.]/g, '');
    val = val.substring(0, 14);

    if (val.length < 1)
        displayVal = "";
    else if (val.length < 4)
        displayVal = "(" + val.substring(0, 3);
    else if (val.length < 7)
        displayVal = "(" + val.substring(0, 3) + ") " + val.substring(3, 6);
    else if (val.length < 11)
        displayVal = "(" + val.substring(0, 3) + ") " + val.substring(3, 6) + "-" + val.substring(6, 10);
    else
        displayVal = "(" + val.substring(0, 3) + ") " +
            val.substring(3, 6) + "-" + val.substring(6, 10) +
            " ext: " + val.substring(10);
    inputElm.value = displayVal;

    switch (cursorPos) {
        case 1:
        case 10: setCursor = cursorPos + 1; break;
        case 5: setCursor = 7; break;
        case 15: setCursor = 21; break;
        default: setCursor = cursorPos;
    }
    inputElm.setSelectionRange(setCursor, setCursor);
}
function createCssClass(className, cssItems) {
    var style = document.createElement('style');
    style.type = 'text/css';
    styleStr = "." + className + "{";
    for (var item in cssItems) {
        styleStr += cssItems[item] + "; ";
    }
    styleStr += " }";
    style.innerHTML = styleStr;
    document.getElementsByTagName('head')[0].appendChild(style);
}
function loadSortItemsLocalization(attributes) {
    var deferred = $.Deferred();
    var dataSource = [];

    MobileCRM.Localization.initialize(function (localization) {
        $(attributes).each(function (i, attribute) {
            if (typeof attribute === "string" || attribute instanceof String) {
                dataSource.push({
                    display: localization.get(entityName + "." + attribute),
                    attribute: attribute
                });
            }
            else {
                dataSource.push(attribute);
            }
        });

        return deferred.resolve(dataSource);
    }, alertError);

    return deferred.promise();
}

//============== ENTITY FORM FUNCTIONS ================
function setDirty() {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        entityForm.isDirty = true;
    }, MobileCRM.bridge.alert, this);
}
function setClean() {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        entityForm.isDirty = false;
    }, MobileCRM.bridge.alert, this);
}
function setCleanAndClose() {
    var cleanPromise = function () {
        var deferred = $.Deferred();
        MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
            entityForm.isDirty = false;
            return deferred.resolve();
        }, function (error) {
            if (error === 'Object not exposed' || 'Unhandled command') {
                MobileCRM.UI.IFrameForm.requestObject(function (iFrameForm) {
                    iFrameForm.isDirty = false;
                    return deferred.resolve();
                }, function (err) { return deferred.reject(err); }, this);
            }
            else {
                return deferred.reject(error);
            }
        }, this);
        return deferred.promise();
    }

    cleanPromise().then(MobileCRM.bridge.closeForm, MobileCRM.bridge.alert);
}
function setCleanSyncAndClose() {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        entityForm.isDirty = false;
        MobileCRM.Application.synchronize(false);
        MobileCRM.bridge.closeForm();
    }, MobileCRM.bridge.alert);
}
function repaintScrollView(scrollView) {
    try {
        MobileCRM.bridge.getWindowSize(function (obj) {
            scrollView.option("height", obj.height - 80);
        }, MobileCRM.bridge.alert);
    }
    catch (e) { }
}
function btnBackClicked() {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        if (entityForm.isDirty) {
            var popup = new MobileCRM.UI.MessageBox(entityForm.form.caption);
            popup.items = ["Save and Close", "Discard Changes", "Continue Editing"];
            popup.multiLine = true;
            popup.show(
                function (btn) {
                    if (btn === "Save and Close")
                        MobileCRM.UI.EntityForm.saveAndClose();
                    else if (btn === "Discard Changes")
                        setCleanAndClose();
                    return;
                }
            )
        }
        else
            MobileCRM.bridge.closeForm();
    }, function (error) {
        if (error === 'Object not exposed' || 'Unhandled command') {
            MobileCRM.UI.IFrameForm.requestObject(function (iFrameForm) {
                if (iFrameForm.isDirty) {
                    var popup = new MobileCRM.UI.MessageBox(iFrameForm.form.caption);
                    popup.items = ["Save and Close", "Discard Changes", "Continue Editing"];
                    popup.multiLine = true;
                    popup.show(
                        function (btn) {
                            if (btn === "Save and Close")
                                btnSaveClicked();
                            else if (btn === "Discard Changes")
                                setCleanAndClose();
                            return;
                        }
                    )
                }
                else {
                    MobileCRM.bridge.closeForm();
                }
            }, MobileCRM.bridge.alert, this);
        }
        else { MobileCRM.bridge.alert("Request Entity Form Object Error:\n" + error); }
    }, this);
}

//============== LOAD DATA FUNCTIONS ================
function loadSetupOptions(callback) {
    var entity = new MobileCRM.FetchXml.Entity("setupoption");
    entity.addAttribute('name');
    entity.addAttribute('optionvalue');

    if (typeof requiredSetupOptions !== 'undefined') {
        entity.filter = new MobileCRM.FetchXml.Filter();
        entity.filter.isIn('name', requiredSetupOptions);
    }
    else
        callback();

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        setupOptions = {};
        res.forEach(function (option) {
            setupOptions[option.name] =
                typeof option.optionvalue === 'undefined' ? null :
                    (option.optionvalue.toString().trim().toUpperCase() === 'TRUE' ? true :
                        (option.optionvalue.toString().trim().toUpperCase() === 'FALSE' ? false :
                            option.optionvalue));
        });

        callback();
    }, MobileCRM.bridge.alert, null);
}
function checkCanCreate(entityName, trueCallback, falseCallback) {
    MobileCRM.Metadata.requestObject(function (metadata) {
        if (metadata.entities[entityName].canCreate())
            trueCallback();
        else
            falseCallback();
    }, MobileCRM.bridge.alert, null);
}
function connectionCheck(isOnline, success) {
    var connectionLoading = MobileCRM.UI.Form.showPleaseWait("Loading");
    if (isOnline) {
        if (!navigator.onLine) {
            connectionLoading.close();
            noConnection("Internet");
        }
        else {
            var networkCheck = new MobileCRM.FetchXml.Entity("setupoption");
            networkCheck.filter = new MobileCRM.FetchXml.Filter();
            networkCheck.filter.where('name', 'eq', 'UseServerMode');
            var networkFetch = new MobileCRM.FetchXml.Fetch(networkCheck);
            networkFetch.execute("Online.JSON",
                function () { connectionLoading.close(); success(); },
                // success,
                function (err) {
                    connectionLoading.close();
                    noConnection("Server");
                }, null);
        }
    }
    else {
        connectionLoading.close();
        success();
    }

}
function noConnection(connectionType) {
    var msg = "No " + connectionType + " Connection.\nOnly Device Mode is accessible.";
    MobileCRM.UI.MessageBox.sayText(msg, function () {
        if (typeof loading !== 'undefined')
            loading.close();
    });

    try {
        switchModeChanged({ value: false, noConnection: true });
    }
    catch (e) { }
}
function getTechnicianID(callback) {
    var entity = new MobileCRM.FetchXml.Entity("systemuser");
    entity.addAttribute('gptechnicianid');

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        callback(res[0] ? res[0].gptechnicianid : "");
    }, alertError);
}
function getEmployeeID(callback) {
    var entity = new MobileCRM.FetchXml.Entity("systemuser");
    entity.addAttribute('gpemployeeid');

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        callback(res[0] ? res[0].gpemployeeid : "");
    }, alertError);
}
function fetchSetupOptionUser(name) {
    var deferred = $.Deferred();
    if (!name) {
        return deferred.reject("Fetch Setup Option User Error: Missing Name");
    }

    var entity = new MobileCRM.FetchXml.Entity("setupoptionuser");
    entity.addAttributes();
    entity.addFilter().where("name", "eq", name);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        return deferred.resolve(res);
    }, function (err) { return deferred.reject("Fetch Setup Option User Error: " + err); });
    return deferred.promise();
}
function fetchAllPages(fetch, output, data) {
    var deferred = $.Deferred();
    if (!fetch.page) {
        fetch.page = 1;
    }
    else {
        fetch.page++;
    }

    fetch.execute(output, function (res) {
        if (res.length < (fetch.count ? fetch.count : 500)) {
            return deferred.resolve(data ? $.merge(data, res) : res);
        }
        else {
            fetchAllPages(fetch, output, data ? $.merge(data, res) : res).then(function (recursiveData) {
                return deferred.resolve(recursiveData);
            }, function (err) { return deferred.reject(err); });
        }
    }, function (err) { return deferred.reject(err); });
    return deferred.promise();
}
function getWorkWeekDates(callback) {
    weekEndInt = -1;
    switch (setupOptions.DefaultWeekday) {
        case "SUNDAY": weekEndInt = 0; break;
        case "MONDAY": weekEndInt = 1; break;
        case "TUESDAY": weekEndInt = 2; break;
        case "WEDNESDAY": weekEndInt = 3; break;
        case "THURSDAY": weekEndInt = 4; break;
        case "FRIDAY": weekEndInt = 5; break;
        default: weekEndInt = 6;
    }
    currentDate = (new Date()).getDate();
    currentWeekDay = (new Date()).getDay();    // Sunday = 0
    today = ((currentWeekDay - weekEndInt) + 7 + 1) % 7;

    diffToEnd = (7 + 1 - today) % 7;
    diffToBegin = 13 - diffToEnd;
    minDate = (new Date()).setDate(currentDate - diffToBegin);

    prevWeekStartValue = (new Date(minDate)).setHours(0, 0, 0, 0);
    prevWeekEndValue = (new Date(prevWeekStartValue)).setDate(
        (new Date(prevWeekStartValue)).getDate() + 6);
    prevWeekEndValue = (new Date(prevWeekEndValue)).setHours(12, 59, 59, 0);
    currWeekStartValue = (new Date(prevWeekStartValue)).setDate(
        (new Date(prevWeekStartValue)).getDate() + 7);
    currWeekEndValue = (new Date(prevWeekEndValue)).setDate(
        (new Date(prevWeekEndValue)).getDate() + 7);

    workWeekDates = {
        'prevWeekStart': new Date(prevWeekStartValue),
        'prevWeekEnd': new Date(prevWeekEndValue),
        'currWeekStart': new Date(currWeekStartValue),
        'currWeekEnd': new Date(currWeekEndValue)
    };

    callback();
}
function getGPSCoords() {
    var loading = MobileCRM.UI.EntityForm.showPleaseWait("Getting the GPS coordinates...");
    MobileCRM.Platform.getLocation(function (coords) {
        if (coords.latitude && coords.longitude) {
            MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
                entityForm.entity.properties.latitude = coords.latitude;
                entityForm.entity.properties.longitude = coords.longitude;
                loading.close();
            }, alertError);
        }
        else {
            loading.close();
            MobileCRM.bridge.alert("Unable to obtain device coordinates");
        }
    }, function (err) {
        loading.close();
        err = err === 'Failed' ? 'Unsupported' : err;
        MobileCRM.bridge.alert("Get Platform Location Error: " + err);
    });
}
function navigateTo(entityForm) {
    var latitude = entityForm.entity.properties.latitude;
    var longitude = entityForm.entity.properties.longitude;

    if (latitude != 0 && longitude != 0)
        MobileCRM.Platform.navigateTo(latitude, longitude, MobileCRM.bridge.alert, null);
    else
        MobileCRM.bridge.alert('No GPS coordinates available for this ' + entityName);
}
function loadSelectedView(entityname) {
    // Load entity list selected view
    var deferred = $.Deferred();
    var fileName = "listSelectedView.txt";

    MobileCRM.Application.fileExists(fileName, function (exists) {
        if (exists) {
            MobileCRM.Application.readFile(fileName, function (fileString) {
                var listViews = JSON.parse(fileString);
                return deferred.resolve(listViews[entityname] ? listViews[entityname] : null);
            }, function (err) { return deferred.reject("Read List View File Error: " + fileName + "\n" + err); });
        }
        else {
            // No selected view to load
            return deferred.resolve();
        }
    }, function (err) { return deferred.reject("List View File Exists Error: " + fileName + "\n" + err); });
    return deferred.promise();
}
function updateSelectedView(entityname, selectedview) {
    // Update entity list selected view
    var deferred = $.Deferred();
    var fileName = "listSelectedView.txt";

    MobileCRM.Application.fileExists(fileName, function (exists) {
        if (exists) {
            MobileCRM.Application.readFile(fileName, function (fileString) {
                // Update file with new value
                var listViews = JSON.parse(fileString);
                listViews[entityname] = selectedview;

                MobileCRM.Application.writeFile(fileName, JSON.stringify(listViews), false,
                    function (res) { return deferred.resolve(); },
                    function (err) { return deferred.reject("Update List View File Error: " + fileName + "\n" + err); }
                );
            }, function (err) { return deferred.reject("Read List View File Error: " + fileName + "\n" + err); });
        }
        else {
            // Create file with new value
            var listViews = {};
            listViews[entityname] = selectedview;

            MobileCRM.Application.writeFile(fileName, JSON.stringify(listViews), false,
                function (res) { return deferred.resolve(); },
                function (err) { return deferred.reject("Create List View File Error: " + fileName + "\n" + err); }
            );
        }
    }, function (err) { return deferred.reject("File Exists Error: " + fileName + "\n" + err); });
    return deferred.promise();
}
// MobileCRM.FetchXml.Filter
MobileCRM.FetchXml.Filter.prototype.whereIsNull = function (attribute, op, value) {
    /// <summary>Adds a attribute condition to the filter.</summary>
    /// <param name="attribute" type="String">The attribute name (CRM logical field name).</param>
    /// <param name="op" type="String">The condition operator. "eq", "ne", "lt", "le", "gt", "ge", "like"</param>
    /// <param name="value" type="Depends on attribute type">The values to compare to.</param>
    /// <returns type="MobileCRM.FetchXml.Condition">The condition instance.</returns>
    var condition = new MobileCRM.FetchXml.Condition();
    if (value !== undefined) {
        condition.attribute = attribute;
        condition.operator = op;
        condition.value = value;
        this.conditions.push(condition);
        return condition;
    }
    else {
        condition.attribute = attribute;
        condition.operator = 'null';
        condition.value = null;
        this.conditions.push(condition);
        return condition;
    }
};

//============== FORM ITEM FUNCTIONS ================
function addFetchFilter(itemName, itemEntityName, fetchFilter, viewName) {
    MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
        var detailView = entityForm.getDetailView(viewName);
        var itemIndex = detailView.getItemIndex(itemName);
        var viewSetup = new MobileCRM.UI.DetailViewItems.LookupSetup();
        viewSetup.addFilter(itemEntityName, fetchFilter);
        detailView.updateLinkItemViews(itemIndex, viewSetup, viewSetup, false);
    }, MobileCRM.bridge.alert);
}
function loadLookupValue(detailViewName, lookupEntityName, formItemName, valueName, value, isInitialLoad) {
    var entity = new MobileCRM.FetchXml.Entity(lookupEntityName);
    entity.addAttribute('id');
    entity.addFilter().where(valueName, 'eq', value);
    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON", function (res) {
        if (res[0])
            MobileCRM.UI.EntityForm.requestObject(function (entityForm) {
                var formItem = entityForm.getDetailView(detailViewName).getItemByName(formItemName);
                formItem.value = new MobileCRM.DynamicEntity(lookupEntityName, res[0].id);
                if (isInitialLoad) {
                    setClean();
                }
            }, MobileCRM.bridge.alert);
    }, MobileCRM.bridge.alert);
}

//============== TOAST FUNCTIONS ================
function showToast(toastMsg, toastType) {
    // NOTE: toastType options = info, warning, error, or success
    if (!toastType || (toastType != 'info' && toastType != 'warning' && toastType != 'error' && toastType != 'success'))
        toastType = 'info';
    var customToast = $("#toast").dxToast({
        closeOnClick: true,
        displayTime: toastType === 'warning' ? 5000 : 2000,
        position: { at: 'top', my: 'top', offset: '0-30' },
        animation: {
            show: { type: 'fade', duration: 400, from: 0, to: 1 },
            hide: { type: 'fade', duration: 400, to: 0 }
        },
        type: "custom",
        width: function () { return $(window).width(); },
        contentTemplate: function (element) {
            toastBox = $("<div id='toastBox'>").dxBox({
                direction: 'row',
                width: '100%',
                items: [
                    { ratio: 1, html: "<div id='msg' style='padding:15px 0px;text-align:center;word-wrap:break-word;'></div>" },
                    { ratio: 0, baseSize: 30, html: "<span class='dx-icon dx-icon-close' style='padding-top:20px;'></span>" }
                ]
            }).dxBox("instance");
            element.append(toastBox.element());
            $("#toastBox").addClass("dx-toast-" + toastType);
            $("#toastBox").css({
                'color': 'white',
                'font-weight': 'bold',
                'height': '55px',
                'vertical-align': 'middle',
            });
            $("#msg").text(toastMsg);
        }
    }).dxToast("instance");
    customToast.show();

    $(window).resize(function () {
        var toast = $("#toast").dxToast("instance");
        if (toast) {
            if (toast.option("visible")) {
                toast.repaint();
            }
        }
    });
}
function alertError(err) {
    if (typeof loading !== 'undefined')
        loading.close();
    if (err)
        MobileCRM.bridge.alert(err);
}
function sayLocalization(text) {
    MobileCRM.Localization.initialize(function (localization) {
        MobileCRM.UI.MessageBox.sayText(
            MobileCRM.Localization.get(text)
        );
    }, MobileCRM.bridge.alert);
}

// ============== VALIDATIONS FUNCTIONS ================
function isValidEmailAddress(emailAddress) {
    var pattern = /^([a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i;
    return pattern.test(emailAddress);
}

var DocumentAction = {
    /** No action.*/
    None: 0x0000,
    /** Configures the view for ink input.*/
    CaptureInk: 0x0001,
    /** Asks the user to capture a photo and loads the choosen media into the view.*/
    CapturePhoto: 0x0002,
    /** Asks the user to choose a media (image, video, depending on what the platform supports) and loads the choosen media into the view.*/
    SelectPhoto: 0x0004,
    /** Asks the user to choose a file and loads it into the view.*/
    SelectFile: 0x0008,
    /** Asks the user to record an audio note and loads it into the view.*/
    RecordAudio: 0x0010,
    /** Asks the user to record a video and loads it into the view.*/
    RecordVideo: 0x0020,
    /** Gets last photo taken and loads it into the view.*/
    UseLastPhotoTaken: 0x0040,
    /** Asks the user to choose file from either online or offline location and loads it into the view.*/
    LoadFrom: 0x0080,

    /** Clears the view and marks it as empty.*/
    Clear: 0x1000,
    /** Shows a preview of the loaded document (fullscreen, etc.).*/
    View: 0x2000,
    /** Opens the loaded document in a external application. Which application is platform specific.*/
    OpenExternal: 0x4000,
    /** Sends the document to another application. This command is implemented only on Android.*/
    SendTo: 0x8000,
    /** Virtual action handled in common code.*/
    Download: 0x10000,
    /** Copy image to clipboard.*/
    Copy: 0x20000,
    /** Paste image from clipboard.*/
    Paste: 0x40000,
    /** Prints the document.*/
    Print: 0x80000,
    /** Let user to choose smaller image resolution.*/
    ResizeImage: 0x100000,
    /** Let user import VCard attachment (handled in common code).*/
    Import: 0x200000,
    /** Pass document to edit in external app (Microsoft office so far[15.6.2015]).*/
    Edit: 0x400000,
    /** Send document as attachment.*/
    Email: 0x800000,
    /** Ask the user to choose multiple images.*/
    SelectMultiplePhotos: 0x1000000,
    /** Asks the user to choose multiple files from either online or offline location and loads it into the view.*/
    LoadFromMultiple: 0x2000000,
    /** Opens image in the image editor.*/
    EditImage: 0x4000000,
    /** Saves to file to disk.*/
    Export: 0x8000000,
    /** Actions that are non-destructive.*/
    ReadOnlyMask: 0x88AE000 // SendTo | View | OpenExternal | Print | Email | Copy | Export
};