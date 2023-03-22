function getChangeOrderStatusDisplayValue(changeOrderStatus) {
    switch (parseInt(changeOrderStatus)) {
        case 1:
            return "Confirmed";
            break;
        case 2:
            return "In-Process";
            break;
        case 3:
            return "Field";
            break;
        case 4:
            return "Pending";
            break;
        case 5:
            return "User Defined 5";
            break;
        default:
            return '';
    }
}

function getContractType(changeOrderType) {
    switch (parseInt(changeOrderType)) {
        case 1:
            return "Fixed Amount";
            break;
        case 2:
            return "Cost Plus";
            break;
        case 3:
            return "Cost Plus Net";
            break;
        default:
            return ''
    }
}

function getPostingStatus(postingStatus) {
    switch (parseInt(postingStatus)) {
        case 0:
            return 'Unposted';
            break;
        case 1:
            return "Uknown";
            break;
        default:
            return "Posted";
    }
}
