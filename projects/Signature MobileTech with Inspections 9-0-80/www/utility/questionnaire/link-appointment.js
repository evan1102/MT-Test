// To add an inspection to the appointment completion validation
// Inspection must be template dependent
// Add the field and field value that will determine if an inspection is needed
// Enter the inspection name in the validation array based on the validation level (warning or required)
// Multiple inspections can be included in the array, separated by a comma
// Be sure to enter the field name as it is in the schema, and the inspection name as it is in the Questionnaire Designer
// If the field name is a lookup then add "_name" to the end of the field name (ie equipmenttypeid_name)

// EXAMPLE: To require all service appointments with call type 'AS' complete the First Inspection, Second Inspection, and Third Inspetion
// Also recommend/warn all service appointments with call type 'CB' complete the Customer Satisfaction Survey
// links = {
//     servicecall: {
//         gpcalltype: [
//             {
//                 value: "AS",
//                 inspections: {
//                     WARNING: [],
//                     REQUIRED: ["First Inspection", "Second Inspection", "Third Inspection"]
//                 }
//             },
//             {
//                 value: "CB",
//                 inspection: {
//                     WARNING: ["Customer Satisfaction Survey"],
//                     REQUIRED: []
//                 }
//             }
//         ]
//     },
// };

// EXAMPLE: To require all assigned equipment with equipment type 'ROOF TOP UNIT' complete the inspection named 'Equipment Inspection'
// links = {
//     equipment: {
//         equipmenttypeid_name: [
//             {
//                 value: "ROOF TOP UNIT",
//                 inspections : {
//                     REQUIRED: ["Equipment Inspection"]
//                 }
//             }
//         ]
//     },
// };

links = {
    servicecall: {
        WARNING: [],
        REQUIRED: []
    },
    job: {
        WARNING: [],
        REQUIRED: []
    },
    equipment: {
        WARNING: [],
        REQUIRED: []
    }
};