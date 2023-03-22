var taskMaterialAttributes = [
    SCHEMA.taskmaterial.Properties.id,
    SCHEMA.taskmaterial.Properties.name,
    SCHEMA.taskmaterial.Properties.itemnumber,
    SCHEMA.taskmaterial.Properties.itemdescription,
    SCHEMA.taskmaterial.Properties.isrequired,
    SCHEMA.taskmaterial.Properties.quantity,
    SCHEMA.taskmaterial.Properties.taskhierarchy,
    SCHEMA.taskmaterial.Properties.gpsublocationid,
    SCHEMA.taskmaterial.Properties.gpequipmentid,
    SCHEMA.taskmaterial.Properties.gptaskcode,
    SCHEMA.taskmaterial.Properties.gptasklinenumber
];

function getLeftPadding(hierarchy) {
    if (hierarchy === undefined || hierarchy.length === 0) {
        return 0;
    }
    var hierarchyLevel = hierarchy.length / 4;
    switch (parseInt(hierarchyLevel)) {
        case 0:
        case 1:
            return 0;
            break;
        case 2:
            return 10;
            break;
        case 3:
            return 20;
            break;
        default:
            return 30;
    }
}

function createTaskMaterialTemplate(data, index, element, leftPadding, fromTaskMaterialTab) {
    if (fromTaskMaterialTab === undefined) {
        fromTaskMaterialTab = false;
    }
    if (fromTaskMaterialTab) {
        // From the tab on the appointment or service call list
        element.append(
            $('<div>').append(
                $('<div>').append(data.name).css('font-size', 'large'),
                $('<div>').append(data.gpsublocationid),
                $('<div>').append(data.gpequipmentid),
                $('<div>').append(data.itemdescription),
                $('<div>').append(
                    $('<div>').append(
                        MobileCRM.Localization.get("taskmaterial.isrequired." + (data.isrequired === "True" ? "1" : "0"))
                    ).css('float', 'left'),
                    $('<div>').append(parseFloat(data.quantity).toFixed(2)).css('float', 'right')
                )
            ).css('margin-left', leftPadding)
        );
    }
    else {
        // From the accordian on the task form
        element.append(
            $('<div>').append(
                $('<div>').append(
                    $('<div>').append(data.itemnumber).css('font-size', 'large'),
                    $('<div>').append(data.itemdescription)
                ),
                $('<div>').append(
                    $('<div>').append(
                        MobileCRM.Localization.get("taskmaterial.isrequired." + (data.isrequired === "True" ? "1" : "0"))
                    ).css('float', 'left'),
                    $('<div>').append(parseFloat(data.quantity).toFixed(2)).css('float', 'right')
                )
            ).css('margin-left', leftPadding)
        );
    }
}

function getTaskMaterials(taskid) {
    var deferred = $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.taskmaterial.name);
    $.each(taskMaterialAttributes, function (i, v) {
        entity.addAttribute(v);
    })
    entity.orderBy(SCHEMA.taskmaterial.Properties.name, false);

    entity.filter = new MobileCRM.FetchXml.Filter();
    entity.filter.where(SCHEMA.taskmaterial.Properties.taskid, 'eq', taskid);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (materials) {
            return deferred.resolve(materials);
        },
        function (error) {
            return deferred.reject(error);
        }, null)

    return deferred.promise();
}

function addMaterialToInventory(taskmaterialid) {
    MobileCRM.Localization.initialize(function (localization) {
        MobileCRM.DynamicEntity.loadById(
            SCHEMA.taskmaterial.name,
            taskmaterialid,
            function (entity) {
                if (!setupOptions.UseNonInventoryItems) {
                    var siPromise = getSiteInventoriesByItemNumber(entity.properties.itemnumber);
                    siPromise.then(function (data) {
                        if (data.length === 0) {
                            MobileCRM.bridge.alert(MobileCRM.Localization.get('Alert.UseNonInventoryItemFalse'));
                        }
                        else {

                        }
                    }, function (error) {
                        MobileCRM.bridge.alert(error)
                    })
                }
                else {
                    var siPromise = getSiteInventoriesByItemNumber(entity.properties.itemnumber);
                    siPromise.then(function (data) {
                        if (entity.properties.noninventory === 0 && data.length === 0) {
                            MobileCRM.bridge.alert(MobileCRM.Localization.get('Alert.DoesntHaveAccessToInventoryItem'));
                        }
                        else {
                            createInventory(entity.properties);
                        }
                    }, function (error) {
                        MobileCRM.bridge.alert(error)
                    })
                }
            },
            function (error) {
                MobileCRM.bridge.alert("Couldn't find matching task material in database.");
            },
            null
        );
    }, MobileCRM.bridge.alert);
}

function getSiteInventoriesByItemNumber(itemNumber) {
    var deferred = new $.Deferred();
    var entity = new MobileCRM.FetchXml.Entity(SCHEMA.siteinventory.name);
    entity.addAttributes();

    entity.filter = new MobileCRM.FetchXml.Filter();
    entity.filter.where(SCHEMA.siteinventory.Properties.itemnumber, 'eq', itemNumber);

    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("JSON",
        function (data) {
            return deferred.resolve(data);
        },
        function (error) {
            return deferred.resolve([]);
        },
        null)

    return deferred.promise();
}

function createInventory(taskMaterial) {
    if (taskMaterial.servicecallid === undefined || taskMaterial.servicecallid === null) {
        return;
    }

    var promise = getIntializeData(taskMaterial);
    promise.then(function (data) {
        if (callingObjectName === SCHEMA.appointment.name) {
            var target = new MobileCRM.Reference(SCHEMA.appointment.name, callingObject.properties.id);
            var relationship = new MobileCRM.Relationship(SCHEMA.consumedinventory.Properties.appointmentid, target, null, null);
            MobileCRM.UI.FormManager.showNewDialog(
                SCHEMA.consumedinventory.name,
                relationship,
                {
                    "@initialize": data
                }
            )
        }
    }, function (error) {
        MobileCRM.bridge.alert(error);
    });
}

function getIntializeData(taskMaterial) {
    var deferred = $.Deferred();

    $(function () {
        var data = {
            itemnumber: taskMaterial.itemnumber,
            quantity: taskMaterial.quantity,
            itemdescription: taskMaterial.itemdescription,
            productindicator: callingObject.properties.gpappointmenttype === 1 ? 3 : 2
        }

        deferred.resolve(data);
    })

    return deferred.promise();
}
