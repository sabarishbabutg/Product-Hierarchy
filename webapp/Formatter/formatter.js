jQuery.sap.declare("PRDH.Formatter.formatter");

PRDH.Formatter.formatter = {
	fnDBgetStatusIcon: function(sStatus) {

		if (sStatus === "Completed" || sStatus === "Complete") {
			return "Image/CompletedStatus.svg";
		} else if (sStatus === "Requested / Inprogress") { //|| sStatus === "00" || sStatus === "" || sStatus === "01" || sStatus === "04") { 
			// return "Image/InprogressStatus.svg"; 
			return "Image/Drafted.svg";
		} else if (sStatus === "Saved as draft") {
			return "Image/SaveAsDraft.svg";
		} else if (sStatus === "Rejected" || sStatus === "Reject") {
			return "Image/RejectStatus.svg";
		} else if (sStatus === "Sendback") {
			return "Image/sendbackTable.svg";
		}
	},
	formatStufe: function (value) {
    if (value === "0" || value === 0 || value === "" || value == null) {
        return "";   // don’t show anything
    }
    return value;
},

	// fnDBformatODataTime: function(oTime) {
	// 	if (!oTime || typeof oTime.ms !== "number") return "";

	// 	var oDate = new Date(null);
	// 	oDate.setMilliseconds(oTime.ms);

	// 	var oFormat = sap.ui.core.format.DateFormat.getTimeInstance({
	// 		pattern: "HH:mm:ss"
	// 	});
	// 	return oFormat.format(oDate);
	// },
	// Time Formatter changed by Jones on 23.10.2025
	fnDBformatODataTime: function(oTime) {
		if (!oTime || typeof oTime.ms !== "number") return "";

		// Get total milliseconds from midnight
		var totalMs = oTime.ms;

		// Convert to hours, minutes, seconds
		var hours = Math.floor(totalMs / 3600000);
		var minutes = Math.floor((totalMs % 3600000) / 60000);
		var seconds = Math.floor((totalMs % 60000) / 1000);

		// Format with leading zeros
		var hh = String(hours).padStart(2, "0");
		var mm = String(minutes).padStart(2, "0");
		var ss = String(seconds).padStart(2, "0");

		return hh + ":" + mm + ":" + ss;
	},
	fnSSgetStatusIcon: function (sBasePath, sStatus) {

    // Safety fallback
    if (!sBasePath) {
        sBasePath = "";
    }

    switch (sStatus) {
        case "C":
            return sBasePath + "NodesGrn.svg";

        case "I":
        case "D":
        case "S":
        case "01":
        case "04":
            return sBasePath + "NodesOrg.svg";

        case "R":
        case "6":
            return sBasePath + "NodesRed.svg";

        default:
            return sBasePath + "NodesGrn.svg";
    }
},

	fnSSgetStatusState: function(sStatus) {
		if (sStatus === "03") {
			return "Success"; //Completed
		}
		// if(sStatus === "01") {
		// 	return "Reject";
		// }
		if (sStatus === "02") {
			return "Error"; //in progress
		}
		if (sStatus === "05") {
			return "Error"; //rejected
		}
		if (sStatus === "00") {
			return "Success"; //save as draft
		}
		if (sStatus === "01") {
			return "Error"; //requested
		}
		if (sStatus === "04") {
			return "Success"; //sendback
		}
		if (sStatus === "04") {
			return "Success"; //deleted
		}
		return "None";
	},

	fnremoveLeadingZeros: function(value) {
		if (!value) {
			return value;
		}

		return value.toString().replace(/^0+/, '');
	},
	fnSSgetStatusText: function(sStatus) {
		if (sStatus === "C") {
			return "Available";
		}
		if (sStatus === "I") {
			return " Creation In-progress"; //Save as draft
		}
		if (sStatus === "S") {
			return " Creation In-progress";
		}
		if (sStatus === "D") {
			return " Creation In-progress";
		}
		if (sStatus === "R") {
			return "Rejected";
		}
		if (sStatus === "04") {
			return " Creation In-progress"; //Send back
		}
		if (sStatus === "6") {
			return "Deleted"; // Deleted
		}
		return "";
	},



formatLevelText: function(sLevel) {
		if (!sLevel) {
			return "";
		}
		// Check if value starts with "L" followed by a number
		if (sLevel.startsWith("L")) {
			return "Level " + sLevel.substring(1);
		}

		// Fallback if not in expected format
		return sLevel;
	},
	combineOrgText: function(vkorg, vtxt) {
		if (!vkorg && !vtxt) {
			return ""; // or null
		}
		return (vkorg || "") + (vkorg && vtxt ? " - " : "") + (vtxt || "");
	},
	getDialogTitle: function(matnr, desc) {
		// if (!matnr && !desc) return "Material Details";
		return "Material No: " + (matnr || "") + " | Description: " + (desc || "");
	},
	getDate: function(sDate) {
		// 	var oDate = new Date("2022-07-25T14:30:00");
		var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
			pattern: "dd/MM/yyyy"
		});
		return oDateFormat.format(new Date(sDate));
		// 	var sformattedDate = oDateFormat.format(oDate);
		// 	console.log(sformattedDate);
	},
	getStatusObject: function (status) {
    switch (status) {
        case "Completed":
            return { badge: "cl_statusCompleted", dot: "cl_dotCompleted" };

        case "Inprogress":
        case "Requested / Inprogress":
            return { badge: "cl_statusInprogress", dot: "cl_dotInprogress" };

        case "Reject":
        case "Rejected":
            return { badge: "cl_statusRejected", dot: "cl_dotRejected" };

        case "Saved as draft":
            return { badge: "cl_statusDraft", dot: "cl_dotDraft" };

        default:
            return { badge: "cl_statusDefault", dot: "cl_dotDefault" };
    }
},

	getStatusClass: function(status) {
		switch (status) {
			case "Complete":
				return "Complete";

			case "Requested / Inprogress":
				return "Requested / Inprogress";
			case "Rejected":
				return "Rejected";
			
			case "Saved as draft":
				return "Saved as draft";
			case "Reject":
				return "Reject";
			case "Sendback":
				return "Sendback";
			case "Initiated":
				return "Initiated";
			default:
				return "statusDefault";
		}
	},
	getRowHighlightClass: function(status) {
		switch (status) {
			case "Completed":
				return "rowGreen";
			case "Requested / Inprogress":
				return "rowRed";
			case "Pending":
				return "rowOrange";
			default:
				return "rowDefault";
		}
	},
	fnDBgetLevelStatusIcon: function(sStatus) {

		if (sStatus === "Completed" || sStatus === "Complete") {
			return "Image/CompletedDot.svg";
		} else if (sStatus === "Requested / Inprogress") {
			return "Image/InprogressDot.svg";
		} else if (sStatus === "Saved as draft") {
			return "Image/draftDot.svg";
		} else if (sStatus === "Rejected" || sStatus === "Reject") {
			return "Image/RejectedDot.svg";
		} else if (sStatus === "Sendback") {
			return "Image/senbackDot.svg";
		} else if (sStatus === "Initiated") {
			return "Image/InitiatedDot.svg";
		}
	},
getStatusBackground: function (status) {
    switch (status) {
        case "Completed":
        case "Complete":
            return "cl_CompletedBackground";

        case "Requested / Inprogress":
            return "cl_RequestedBackground";

        case "Rejected":
        case "Reject":
            return "cl_rejectBackground";

        case "Saved as draft":
            return "cl_draftBackground";

        case "Sendback":
            return "cl_sendBackBackground";

        case "Initiated":
            return "cl_InitiatedBackground";

        default:
            return "";
    }
},

	fnDuplicationIndicator: function(Indicator) {
		switch (Indicator) {
			case "R":
				return "Image/redicon.svg";
			case "O":
				return "Image/orangeIcon.svg";
			case "Y":
				return "Image/yellowicon.svg";
		}
	}
};