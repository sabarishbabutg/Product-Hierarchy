sap.ui.define([], function() {
	"use strict";

	return {

		parseODataError: function(oResponse) {
			var sErrorMessage = "Unexpected Error";

			if (!oResponse) {
				return "No response from server.";
			}

			try {
				if (oResponse.responseText) {
					var oErrorObj = JSON.parse(oResponse.responseText);

					// Batch response array
					if (Array.isArray(oErrorObj) && oErrorObj[0]) {
						var oErr = oErrorObj[0];
						var sType = oErr.type || "Error";
						var sMsg = oErr.message || "Unknown error";
						var sCode = oResponse.statusCode || "";
						sErrorMessage = (sCode ? sCode + " - " : "") + sType + ": " + sMsg;
					}
					// Standard OData JSON
					else if (oErrorObj.error && oErrorObj.error.message && oErrorObj.error.message.value) {
						sErrorMessage = oResponse.statusCode + " - " + oErrorObj.error.message.value;
					}
					// Root-level message
					else if (oErrorObj.message) {
						sErrorMessage = oResponse.statusCode + " - Error: " + oErrorObj.message;
					} else {
						sErrorMessage = oResponse.statusCode + " - " + (oResponse.statusText || "Unknown Error");
					}
				} else {
					sErrorMessage = oResponse.statusCode + " - " + (oResponse.statusText || "Unknown Error");
				}
			} catch (e) {
				sErrorMessage = oResponse.statusCode + " - " + (oResponse.statusText || "Unexpected Error");
			}

			return sErrorMessage;
		},

		showCustomSnackbar: function(sMessage, sType, oController) {
			this.createSnackbar();

			// Clear previous content
			this._snackbar.removeAllItems();
			this._snackbar.removeStyleClass("");
			this._snackbar.addStyleClass("customSnackbar hideMessage");

			// Determine style and icon

			var sSubheading = "";
			var sTitlestyle = "";

			var sIcon = "";
			switch (sType) {
				case "success":
					sSubheading = "cl_snackbar_subhedding_s";
					sTitlestyle = "cl_msgBoxTitle_s";
					sIcon = oController.getView().getModel("JM_ImageModel").getProperty("/path") + "Sucess.svg";
					break;
				case "Error":
					sSubheading = "cl_snackbar_subhedding_e";
					sTitlestyle = "cl_msgBoxTitle_e";
					sIcon = oController.getView().getModel("JM_ImageModel").getProperty("/path") + "Error.svg";
					break;
				case "Warning":
					sSubheading = "cl_snackbar_subhedding_w";
					sTitlestyle = "cl_msgBoxTitle_w";
					sIcon = oController.getView().getModel("JM_ImageModel").getProperty("/path") + "Warning.svg";
					break;
				case "info":
				case "information":
				default:
					sSubheading = "cl_snackbar_subhedding_i";
					sTitlestyle = "cl_msgBoxTitle_i";
					sIcon = oController.getView().getModel("JM_ImageModel").getProperty("/path") + "Info.svg";
					break;
			}
			var oIcon = new sap.m.Image({
				src: sIcon,
				width: "31px"
			}).addStyleClass("cl_snackbarIcon");

			var oLeftVBox = new sap.m.VBox({
				alignItems: "Center",
				justifyContent: "Center",
				width: "3.5rem",
				items: [oIcon]
			});

			// RIGHT VBox with 2 HBoxes (title + message)
			var oTitle = new sap.m.Text({
				text: sType
			}).addStyleClass(sTitlestyle);

			var oMessage = new sap.m.Text({
				text: sMessage
			}).addStyleClass("cl_msgBoxMessage");

			var oTitleHBox = new sap.m.HBox({
				items: [oTitle]
			});

			var oMessageHBox = new sap.m.HBox({
				items: [oMessage]
			});

			var oRightVBox = new sap.m.VBox({
				items: [oTitleHBox, oMessageHBox]
			});

			var oHBox = new sap.m.HBox({
				alignItems: "Center",
				height: "2.5rem",
				justifyContent: "Center",
				items: [oLeftVBox, oRightVBox]
			}).addStyleClass(sSubheading);

			this._snackbar.addItem(oHBox);

			// Show with animation
			this._snackbar.setVisible(true);
			this._snackbar.removeStyleClass("hideMessage");
			this._snackbar.addStyleClass("showMessage");

			// Hide after timeout
			setTimeout(function() {
				this._snackbar.removeStyleClass("showMessage");
				this._snackbar.addStyleClass("hideMessage");
			}.bind(this), 3000);
		},

		createSnackbar: function() {
			if (this._snackbar) {
				return;
			}

			this._snackbar = new sap.m.VBox({
				alignItems: "Center",
				justifyContent: "Center"
			}).addStyleClass("customSnackbar hideMessage").placeAt(sap.ui.getCore().getStaticAreaRef());
		}
	};
});