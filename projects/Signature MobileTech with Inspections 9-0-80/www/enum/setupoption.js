﻿const SETUPOPTION = {
    AdminEmailAddress: "AdminEmailAddress",
    AllowModifyEquipmentRecord: "AllowModifyEquipmentRecord",
    AllowModifyNewEquipmentId: "AllowModifyNewEquipmentId",
    AppointmentNotesReadOnly: "AppointmentNotesReadOnly",
    AssignedEquipmentValidationLevel: "AssignedEquipmentValidationLevel",
    AutoGeneratePurchaseOrderNumbers: "AutoGeneratePurchaseOrderNumbers",
    AutoStatusUpdate: "AutoStatusUpdate",
    AutoTimeIn: "AutoTimeIn",
    CompanyDatabaseVersion: "CompanyDatabaseVersion",
    ContractNotesReadOnly: "ContractNotesReadOnly",
    CurrencyDecimalPlaces: "CurrencyDecimalPlaces",
    CustomerNotesReadOnly: "CustomerNotesReadOnly",
    CustomerSignatureValidationLevel: "CustomerSignatureValidationLevel",
    DefaultBeginTravelStatus: "DefaultBeginTravelStatus",
    DefaultBilledExpensePayCode: "DefaultBilledExpensePayCode",
    DefaultBilledHourlyPayCode: "DefaultBilledHourlyPayCode",
    DefaultBilledTravelPayCode: "DefaultBilledTravelPayCode",
    DefaultCostCodeExpense: "DefaultCostCodeExpense",
    DefaultCostCodeLabor: "DefaultCostCodeLabor",
    DefaultCostCodeTravelTimeLog: "DefaultCostCodeTravelTimeLog",
    DefaultEndTravelStatus: "DefaultEndTravelStatus",
    DefaultNewNotesAsInternal: "DefaultNewNotesAsInternal",
    DefaultPOItemNumberPrefix: "DefaultPOItemNumberPrefix",
    DefaultPONumberPrefix: "DefaultPONumberPrefix",
    DefaultSite: "DefaultSite",
    DefaultTaskCompletionStatus: "DefaultTaskCompletionStatus",
    DefaultTaskStatus: "DefaultTaskStatus",
    DefaultUnbilledExpensePayCode: "DefaultUnbilledExpensePayCode",
    DefaultUnbilledHourlyPayCode: "DefaultUnbilledHourlyPayCode",
    DefaultUnbilledTravelPayCode: "DefaultUnbilledTravelPayCode",
    DefaultUnitOfMeasure: "DefaultUnitOfMeasure",
    DefaultWeekday: "DefaultWeekday",
    DisplayVendorItem: "DisplayVendorItem",
    EquipmentNotesReadOnly: "EquipmentNotesReadOnly",
    ExpenseValidationLevel: "ExpenseValidationLevel",
    FieldInvoicingTaxMode: "FieldInvoicingTaxMode",
    GenerateJobSummaryReport: "GenerateJobSummaryReport",
    GenerateServiceSummaryReport: "GenerateServiceSummaryReport",
    GlobalFiltering: "GlobalFiltering",
    HideTaskEstimateHours: "HideTaskEstimateHours",
    HistoryCount: "HistoryCount",
    IncludeMCCWithHistory: "IncludeMCCWithHistory",
    InstalledObjectsVersion: "InstalledObjectsVersion",
    InstalledOrgDatabaseVersion: "InstalledOrgDatabaseVersion",
    InstalledSetupOptionsVersion: "InstalledSetupOptionsVersion",
    InventoryValidationLevel: "InventoryValidationLevel",
    IsVisualInspectionRegistered: "IsVisualInspectionRegistered",
    JobAppointmentAttachmentLocation: "JobAppointmentAttachmentLocation",
    JobSafetyStartStatus: "JobSafetyStartStatus",
    JobSafetyTaskListType: "JobSafetyTaskListType",
    JobSafetyUnsafeStatus: "JobSafetyUnsafeStatus",
    JobSafetyValidationLevelJobCost: "JobSafetyValidationLevelJobCost",
    JobSafetyValidationLevelService: "JobSafetyValidationLevelService",
    LaborValidationLevel: "LaborValidationLevel",
    LocationNotesReadOnly: "LocationNotesReadOnly",
    LogSql: "LogSql",
    LogVerbose: "LogVerbose",
    MinimumTravelMileage: "MinimumTravelMileage",
    MinimumTravelTime: "MinimumTravelTime",
    OnSiteStatusUpdate: "OnSiteStatusUpdate",
    PreviewInvoiceNumber: "PreviewInvoiceNumber",
    PurchaseOrderValidationLevelService: "PurchaseOrderValidationLevelService",
    QuadraAPIKey: "QuadraAPIKey",
    QuadraAPIUrl: "QuadraAPIUrl",
    ReportEmailMode: "ReportEmailMode",
    ReportEmailSMTPEnableSSL: "ReportEmailSMTPEnableSSL",
    ReportEmailSMTPServer: "ReportEmailSMTPServer",
    ReportEmailSMTPServerPort: "ReportEmailSMTPServerPort",
    ReportExecutionUrl: "ReportExecutionUrl",
    ReportPreviewMaxRetryAttempts: "ReportPreviewMaxRetryAttempts",
    ReportPreviewRetryInterval: "ReportPreviewRetryInterval",
    RequireTravelForCompletion: "RequireTravelForCompletion",
    ResolutionNoteValidationLevel: "ResolutionNoteValidationLevel",
    ResolutionValidationLevel: "ResolutionValidationLevel",
    ServiceCallNotesReadOnly: "ServiceCallNotesReadOnly",
    SetAppointmentDetailsOnNewCall: "SetAppointmentDetailsOnNewCall",
    ShowInventoryCost: "ShowInventoryCost",
    ShowInventoryPrice: "ShowInventoryPrice",
    ShowInventoryQtyAvailable: "ShowInventoryQtyAvailable",
    ShowInventorySiteQtyAvailable: "ShowInventorySiteQtyAvailable",
    ShowTasksForAppointments: "ShowTasksForAppointments",
    ShowTechnicianTotalLaborHours: "ShowTechnicianTotalLaborHours",
    SignatureStrokeWidth: "SignatureStrokeWidth",
    SignatureValidationLevel: "SignatureValidationLevel",
    SMTPPassword: "SMTPPassword",
    SMTPUsername: "SMTPUsername",
    TaskValidationLevel: "TaskValidationLevel",
    TechnicianSignatureValidationLevel: "TechnicianSignatureValidationLevel",
    TimeLogAllowTimeOverlap: "TimeLogAllowTimeOverlap",
    TimeLogLockLaborTime: "TimeLogLockLaborTime",
    TimeLogLockTimeInTimeOut: "TimeLogLockTimeInTimeOut",
    TimeLogRoundingInterval: "TimeLogRoundingInterval",
    TimeLogStatusUpdate: "TimeLogStatusUpdate",
    TimeSheetSignoffText: "TimeSheetSignoffText",
    TimeTrackBatchNameby: "TimeTrackBatchNameby",
    TimeTrackBatchType: "TimeTrackBatchType",
    TimeTrackIncludeTransactionDate: "TimeTrackIncludeTransactionDate",
    TimeTrackIncludeWeekEndingDate: "TimeTrackIncludeWeekEndingDate",
    TimeTrackProxyUrl: "TimeTrackProxyUrl",
    TravelValidationLevel: "TravelValidationLevel",
    UnknownVendorId: "UnknownVendorId",
    UseAdditionalWork: "UseAdditionalWork",
    UseAppointmentNotesSummary: "UseAppointmentNotesSummary",
    UseAppointmentResolutionNote: "UseAppointmentResolutionNote",
    UseBOBIntegration: "UseBOBIntegration",
    UseBarcoding: "UseBarcoding",
    UseChangeOrder: "UseChangeOrder",
    UseContactManagement: "UseContactManagement",
    UseCustomerSignature: "UseCustomerSignature",
    UseEventBasedSync: "UseEventBasedSync",
    UseExpense: "UseExpense",
    UseFieldInvoicePreview: "UseFieldInvoicePreview",
    UseFieldInvoiceSignature: "UseFieldInvoiceSignature",
    UseFieldInvoicing: "UseFieldInvoicing",
    UseFieldPayments: "UseFieldPayments",
    UseFieldPaymentsLocked: "UseFieldPaymentsLocked",
    UseInspectionServerEmail: "UseInspectionServerEmail",
    UseInventory: "UseInventory",
    UseJobSafetyTasks: "UseJobSafetyTasks",
    UseLabor: "UseLabor",
    UseManagerApproval: "UseManagerApproval",
    UseMobileAuditBackgroundSync: "UseMobileAuditBackgroundSync",
    UseNonInventoryItems: "UseNonInventoryItems",
    UsePONonInventoryItems: "UsePONonInventoryItems",
    UsePurchaseOrderJobCost: "UsePurchaseOrderJobCost",
    UsePurchaseOrderReceipt: "UsePurchaseOrderReceipt",
    UsePurchaseOrderService: "UsePurchaseOrderService",
    UseQuadra: "UseQuadra",
    UseRefrigerantTracking: "UseRefrigerantTracking",
    UseUseReplacementParts: "UseReplacementParts",
    UseResolution: "UseResolution",
    UseServerMode: "UseServerMode",
    UseServiceCallUserDefine2: "UseServiceCallUserDefine2",
    UseSignature: "UseSignature",
    UseSMTPAuthentication: "UseSMTPAuthentication",
    UseSublocationValidation: "UseSublocationValidation",
    UseTaskMaterials: "UseTaskMaterials",
    UseTechnicianHelper: "UseTechnicianHelper",
    UseTechnicianSignature: "UseTechnicianSignature",
    UseTimeLog: "UseTimeLog",
    UseTravel: "UseTravel",
    UseTravelTimeLog: "UseTravelTimeLog",
    UseWorkCrewJobCost: "UseWorkCrewJobCost",
    UseWorkCrewService: "UseWorkCrewService",
    UseXOiDeepLinking: "UseXOiDeepLinking",
    UseXOiWorkflow: "UseXOiWorkflow",
    XOiClientId: "XOiClientId",
    XOiClientSecret: "XOiClientSecret",
    XOiLoginUrl: "XOiLoginUrl",
    XOiPartnerId: "XOiPartnerId",
    XOiRedirectUri: "XOiRedirectUri",
    XOiVisionUrl: "XOiVisionUrl"
}