sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"PRDH/controller/ErrorHandler",
	"sap/ui/model/resource/ResourceModel"
], function(Controller, ErrorHandler, ResourceModel) {
	"use strict";
	var i18n;
	var busyDialog = new sap.m.BusyDialog();
	return Controller.extend("PRDH.controller.keydata", {

		onInit: function() {
			var vPathImage = jQuery.sap.getModulePath("PRDH") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			var i18nModel = new ResourceModel({
				bundleName: "PRDH.i18n.i18n"
			});
			this.getView().setModel(i18nModel, "i18n");

			i18n = this.getView().getModel("i18n").getResourceBundle();

			this.f4Cache = {}; // to store the F4chace to get the data for live change
			this._liveChangeTimer = null; // live change debounce techniques is used
			// Added by Jones on 15.12.2025 (start)
			var oViewModel = new sap.ui.model.json.JSONModel({
				showMatDiv: true
			});
			this.getView().setModel(oViewModel, "viewModel");
			// Added by Jones on 15.12.2025 (end)

			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("keydata").attachPatternMatched(this.fnRouter, this);
		},

		// *-------------------------------------------------------------------------------------
		//		Function for Inital and Resive logic
		// *-------------------------------------------------------------------------------------
		fnRouter: function() {
			// Responsive controller logic
			var oVisModel = new sap.ui.model.json.JSONModel({
				labelVisible: true
			});
			this.getView().setModel(oVisModel, "RoadMapUI");
			sap.ui.Device.resize.attachHandler(this.fnResize, this);
			this.fnResize();
			var that = this;
			// check parm model from search screen to keydata screen 
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var wfPramModel = this.getOwnerComponent().getModel("JM_ParmModel");
			if (wfPramModel && Object.keys(wfPramModel.getData() || {}).length > 0) {
				this.fnsetUsernameModel().then(function(UsernameStatus) {
					if (UsernameStatus) {
						var oContextModel = sap.ui.getCore().getModel("JM_ViewStateModel");
						if (oContextModel) {
							var Data = oContextModel.getData();
							var appid = Data.fromSearch;
							if (appid) {
								that.byId("KID_MTART").setValue("");
								that.byId("KID_MTART_DES").setValue("");
								that.byId("KID_MTART_ERR").setText("").setVisible(false);
								that.byId("KID_MTART_DES").setEditable(false);
							}
						}
					}
				});
			} else {
				oRouter.navTo("search");
			}
		},

		fnsetUsernameModel: function() {
			return new Promise(function(Resolve, Reject) {
				var oUserModel = this.getOwnerComponent().getModel("JM_CONFIG");
				busyDialog.open();
				oUserModel.read("/UsernameSet", {
					success: function(oData) {
						var oJsonModel = new sap.ui.model.json.JSONModel();
						oJsonModel.setData(oData.results[0]);
						this.getView().setModel(oJsonModel, "JM_UserModel");
						Resolve(true);
						busyDialog.close();
					}.bind(this),
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}.bind(this)
				});
			}.bind(this));
		},

		// *-------------------------------------------------------------------------------------
		//		Function logic to set the Title of the keydata when radio button select
		// *-------------------------------------------------------------------------------------
		fnRadioSelection: function(oEvent) {
			var iSelectedIndex = oEvent.getParameter("selectedIndex");
			var oVM = this.getView().getModel("viewModel");

			// Show VBoxes ONLY when first radio button is selected
			oVM.setProperty("/showMatDiv", iSelectedIndex === 0);
			var vtitle = this.getView().byId("kid_title");
			if (iSelectedIndex === 0) {
				// vKeyDataModel.setProperty("/ProdHier","X");
				vtitle.setText("MDM : Product Hierarchy");
			} else if (iSelectedIndex === 1) {
				// vKeyDataModel.setProperty("/PackMatGrp","X");
				vtitle.setText("MDM : Package Material Group");
			} else if (iSelectedIndex === 2) {
				// vKeyDataModel.setProperty("/MatGrp","X");
				vtitle.setText("MDM : Material Group");
			}
		},

		// *-------------------------------------------------------------------------------------
		//						Function for live change logic 
		// *------------------------------------------------------------------------------------
		fnLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			oInput.setValueState("None");
			oInput.setValueStateText("");
			var fieldId = oInput.getId();
			var vId = fieldId.split("--").pop();
			this.selectedField = vId;
			var vValue = oEvent.getSource().getValue();
			vValue = oEvent.getSource().getValue().toUpperCase();
			if (vValue === "" || vValue === null || vValue === undefined) {
				if (this.getView().byId(vId + "_DES")) {
					this.getView().byId(vId + "_DES").setValue("");
				}
			}
			// debounce techniques is used concern for user type speed
			clearTimeout(this._liveChangeTimer);
			this._liveChangeTimer = setTimeout(function() {
				this.fnReadf4Cache(vId, vValue, "P");
			}.bind(this), 300);
			oInput.setValue(vValue);
		},

		fnReadf4Cache: function(vId, vValue, f4type) {
			var that = this;
			var match;
			var descriptionField;
			var updateDesc = function(results) {
				if (f4type === "P") {
					// Default: match Value1/Value2 as usual
					var VmaterialtypeInput = that.getView().byId(that.selectedField);
					match = results.find(function(item) {
						return item.Value1 === vValue.toUpperCase();
					});
					if (match) {
						descriptionField = that.getView().byId(that.selectedField + "_DES");
						if (descriptionField) {
							descriptionField.setValue(match.Value2);
							descriptionField.setValueState("None");
							descriptionField.setValueStateText("");
							VmaterialtypeInput.setValueStateText("");
							VmaterialtypeInput.setValueState("None");
						}
					} else {
						if (VmaterialtypeInput.getValue().length > 2) {
							VmaterialtypeInput.setValueStateText(i18n.getText("ErrorRequiredFieldMattype"));
							VmaterialtypeInput.setValueState("Error");
						}
						descriptionField = that.getView().byId(that.selectedField + "_DES");
						if (descriptionField) {
							descriptionField.setValue("");
						}
					}
				}
			};
			if (this.f4Cache[vId] && this.f4Cache[vId].length > 0) {
				updateDesc(this.f4Cache[vId]);
			} else {
				this.f4descriptionGet(vId, vValue, f4type, function(results) {
					that.f4Cache[vId] = results;
					updateDesc(results);
				});
			}
		},

		// get the description of F4 details from backend
		f4descriptionGet: function(vId, value, f4type, fnCallback) {
			var that = this;
			var filter;
			var oModel = this.getOwnerComponent().getModel("JM_CONFIG");
			var oPayload = {
				FieldId: vId,
				F4Type: f4type,
				Process: "K"
			};
			oPayload.NavSerchResult = [];
			oModel.create("/SearchHelpSet", oPayload, {
				filters: filter,
				success: function(oData) {
					that.f4Cache[vId] = oData.NavSerchResult.results;
					if (fnCallback) {
						fnCallback(oData.NavSerchResult.results);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},

		// *-------------------------------------------------------------------------------------
		//						Function to press f4 logic
		// *------------------------------------------------------------------------------------
		fnF4press: function(oEvent) {
			var sitem = oEvent.getSource().getId().split("--")[1];
			this.selectedField = sitem;
			var oPayload = {
				FieldId: sitem,
				Process: "K",
				F4Type: "P",
				NavSerchResult: []
			};
			var oModel = this.getOwnerComponent().getModel("JM_CONFIG");
			var oLabels = {};
			var oJsonModel;
			var vTitle;
			var vLength;
			this.sitem = sitem;
			var aFormattedRows = [];
			oModel.create("/SearchHelpSet", oPayload, {
				success: function(oData) {
					var aResults = oData.NavSerchResult.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", this);
								return;
							}
							vLength = aResults.length;
							oLabels.col1 = "Key";
							if (oFirst.Label2) {
								oLabels.col2 = oFirst.Label2;
							}
							aResults.forEach(function(item) {
								var row = {};
								if (oLabels.col1) {
									row.col1 = item.DomvalueL;
								}
								if (oLabels.col2) {
									row.col2 = item.Ddtext;
								}
								if (oLabels.col3) {
									row.col3 = item.DomvalueL3;
								}
								if (oLabels.col4) {
									row.col4 = item.DomvalueL4;
								}
								aFormattedRows.push(row);
							});
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							vTitle = sap.ui.getCore().byId(this.sitem + "_TXT").getText() + " (" + vLength + ")";
							this.fnF4fragopen(oEvent, vTitle).open();
						} else {
							vLength = oData.NavSerchResult.results.length;
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								// ErrorHandler.showCustomSnackbar(oFirst.Message, "Error");
								return;
							}
							if (oFirst.Label1) {
								oLabels.col1 = oFirst.Label1;
							}
							if (oFirst.Label2) {
								oLabels.col2 = oFirst.Label2;
							}
							if (oFirst.Label3) {
								oLabels.col3 = oFirst.Label3;
							}
							if (oFirst.Label4) {
								oLabels.col4 = oFirst.Label4;
							}

							aResults.forEach(function(item) {
								var row = {};
								if (oLabels.col1) {
									row.col1 = item.Value1;
								}
								if (oLabels.col2) {
									row.col2 = item.Value2;
								}
								if (oLabels.col3) {
									row.col3 = item.Value3;
								}
								if (oLabels.col4) {
									row.col4 = item.Value4;
								}
								aFormattedRows.push(row);
							});
							// }
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							this.getView().getModel("JM_F4Model");
							vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
							this.fnF4fragopen(oEvent, vTitle).open();
						}
					}
				}.bind(this),
				error: function(oResponse) {}
			});
		},

		// data press from F4 dialog
		fnrowSelected: function(oEvent) {
			// var oItem = oEvent.getSource();
			// var oContext = oItem.getBindingContext("JM_F4Model");
			// if (!oContext) {
			// 	return;
			// }
			// var item = oContext.getProperty("col1");
			// var item1 = oContext.getProperty("col2");
			// var item2 = oContext.getProperty("col3");
			// }
			var index= oEvent.getParameter("rowIndex");
			var oContext = oEvent.getSource().getContextByIndex(index).getObject();

			var item = oContext.col1;
			var item1 = oContext.col2;
			var item2 = oContext.col3;

			this.getView().byId(this.selectedField).setValue(item);
			this.getView().byId(this.selectedField).setValueState("None");
			this.getView().byId(this.selectedField + "_DES").setValue(item1);
			if (this.getView().byId(this.selectedField + "_LEV")) {
				this.getView().byId(this.selectedField + "_LEV").setValue(item2);
			}
			this.fnAfterCloseFragment();
		},

		fnAfterCloseFragment: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},
		// to open the fragment 
		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "PRDH.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			
				var oModel = this.getView().getModel("JM_F4Model");
if (!oModel) {
    return;
}

var oTable  = this.byId("id_F4Table");
var oLabels = oModel.getProperty("/labels");

oTable.removeAllColumns();


/* -------------------------------------------------- */
/* Get only visible columns first                     */
/* -------------------------------------------------- */
var aValidCols = Object.keys(oLabels).filter(function (sKey) {
    return oLabels[sKey] && oLabels[sKey].trim() !== "";
});

var iColCount = aValidCols.length;


/* -------------------------------------------- */
/* Dialog width handling                        */
/* -------------------------------------------- */
var oDialog = this.getView().byId("id_f4Dialog");
if (oDialog) {
    if (aValidCols.length === 1) {
        oDialog.setContentWidth("200px");   
    } 
}


/* -------------------------------------------------- */
/* Create columns with dynamic width logic             */
/* -------------------------------------------------- */
aValidCols.forEach(function (sColKey, iIndex) {

    var oColumnProps = {
        label: new sap.m.Label({
            text: "{JM_F4Model>/labels/" + sColKey + "}"
        }),
        template: new sap.m.Label({
            text: "{JM_F4Model>" + sColKey + "}",
            tooltip : "{JM_F4Model>" + sColKey + "}"
        }).addStyleClass("sapUiTinyMarginBegin cl_table_label"),
        sortProperty: sColKey,
        filterProperty: sColKey
    };
    if (
        (iColCount === 3 && iIndex < 2) ||
        (iColCount === 2 && iIndex === 0)
    ) {
        oColumnProps.width = "10rem";
    }
    // else → no width set

    oTable.addColumn(new sap.ui.table.Column(oColumnProps));
});
			this.f4HelpFrag.setTitle(vTitle);
			return this.f4HelpFrag;
		},

		// to close the fragment 
		fnf4HelpCancel: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},

		// Value hel in the f4 dialog
		fnValueSearch: function(oEvent) {
		var oInput = oEvent.getSource();
var sValue = oInput.getValue();

oInput.setValue(sValue.toUpperCase()); // optional

var oTable = this.byId("id_F4Table");
var oBinding = oTable.getBinding("rows");
if (!oBinding) {
    return;
}

var aFilters = [];

if (sValue) {
        aFilters.push(new sap.ui.model.Filter({
            filters: [
                new sap.ui.model.Filter("col1", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("col2", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("col3", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("col4", sap.ui.model.FilterOperator.Contains, sValue)
            ],
            and: false
        }));
    
}

			oBinding.filter(aFilters, "Application");
		},

		// *-------------------------------------------------------------------------------------
		//						Function to press continue button with parm model
		// *------------------------------------------------------------------------------------
		fnSubmit: function() {
			// Added by Jones on 15.12.2025 (start)
			var vRadioValue = this.byId("id_kdradio").getSelectedIndex();
			var vProdhier = vRadioValue === 0 ? "X" : "";
			var vProdMatGrp = vRadioValue === 1 ? "X" : "";
			var vMatgrp = vRadioValue === 2 ? "X" : "";
			var vMattype = this.byId("KID_MTART");
			var vMattypedes = this.byId("KID_MTART_DES");
			var keyModel = this.getOwnerComponent().getModel("JM_KEYDATA");
			var that = this;
			if (vProdhier === "X") {
				this.vAppId = "PHC";
				var vAppid = "PHC";
				var vMattypeVal = vMattype.getValue();
				var vMattypedesVal = vMattypedes.getValue();
				var vDivisionfield = this.byId("KID_SPART");
				var vDivision = this.getView().byId("KID_SPART").getValue();
				var vDivisionDesc = this.getView().byId("KID_SPART_DES").getValue();
				// Mandatory field validation
				if (!vMattypeVal && !vDivision) {
					vMattype.setValueState("Error");
					vMattype.setValueStateText("Material Type is mandatory");
					vDivisionfield.setValueState("Error");
					vDivisionfield.setValueStateText("Division is mandatory");
					ErrorHandler.showCustomSnackbar("Please provide values for the Manadatory Fields", "Error", that);
					return;
				} else if (!vMattypeVal) {
					vMattype.setValueState("Error");
					vMattype.setValueStateText("Material Type is mandatory");
					ErrorHandler.showCustomSnackbar(i18n.getText("ErrorRequiredField"), "Error", that);
					return;
				} else if (!vDivision) {
					vDivisionfield.setValueState("Error");
					vDivisionfield.setValueStateText("Division is mandatory");
					ErrorHandler.showCustomSnackbar("Please provide valid Division and Description", "Error", that);
					return;
				}
			}
			// Added by Jones on 16.12.2025 (start)
			else if (vProdMatGrp === "X") {
				this.vAppId = "PM";
				vAppid = "PM";
			} else if (vMatgrp === "X") {
				this.vAppId = "MG";
				vAppid = "MG";
			}
			var oPayload = {
				AppId: vAppid,
				Ind: "K",
				Msgtype: "",
				Message: "",
				Mtart: vMattypeVal,
				Mtbez: vMattypedesVal,
				Phind: vProdhier,
				Pmgind: vProdMatGrp,
				Mgind: vMatgrp,
				Spart: vDivision, // Added by jones on 15.12.2025
				SpartDesc: vDivisionDesc, // Added by jones on 15.12.2025
				Client: "",
				NavPHItems: []
			};
			this.fnsetParamodel().then(function(status) {
				// Added by Jones on 15.12.2025 (end)
				if (status) {
					var oParmModel = that.getOwnerComponent().getModel("JM_ParmModel");
					var oParams = oParmModel.getData();
					Object.keys(oParams).forEach(function(key) {
						var sControlId = oParams[key];
						var oControl = that.byId(sControlId);
						if (!oControl) return;
						var value;
						if (sControlId === "KID_PM" || sControlId === "KID_MG") {
							var iIndex = that.byId("id_kdradio").getSelectedIndex();
							if (iIndex === 1) {
								value = "PM";
							} else if (iIndex === 2) {
								value = "MG";
							}
						}
						if (oControl.isA("sap.m.Input")) {
							value = oControl.getValue();
						} else if (oControl.isA("sap.m.CheckBox")) {
							value = oControl.getSelected() ? "X" : "";
						}
						oParams[key] = value;
					});
					var newParams = {};
					Object.keys(oParams).forEach(function(key) {
						var newKey = key.replace("Id", "");
						newParams[newKey] = oParams[key];
					});
					oParmModel.setData(newParams);
					oParmModel.refresh();
					Object.keys(newParams).forEach(function(key) {
						oPayload[key] = newParams[key];
					});
					var oSearchEntity = this.getOwnerComponent().getModel("JM_PRODHIER");
					busyDialog.open();
					oSearchEntity.create("/Product_KeyDataSet", oPayload, {
						success: function(oData) {
							busyDialog.close();
							if (oData.Msgtype !== "E") {
								//  Update key model
								keyModel.setProperty("/ProdHier", vProdhier);
								keyModel.setProperty("/PackMatGrp", vProdMatGrp);
								keyModel.setProperty("/MatGrp", vMatgrp);
								keyModel.setProperty("/Mattyp", vMattypeVal);
								keyModel.setProperty("/MattypDes", vMattypedesVal);
								keyModel.setProperty("/Division", vDivision); // Added by Jones on 16.12.2025
								keyModel.setProperty("/DivisionDesc", vDivisionDesc); // Added by Jones on 16.12.2025
								keyModel.setProperty("/Indicator", "I"); // Added by Jones on 16.12.2025
								keyModel.setProperty("/Client", oData.Client);
								// Routing
								var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
								oRouter.navTo("Initiator");
							} else {
								ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);
							}
						},
						error: function(oResponse) {
							busyDialog.close();
							var sMessage = ErrorHandler.parseODataError(oResponse);
							ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
						}
					});
				}
			}.bind(this));
		},

		fnsetParamodel: function() {
			return new Promise(function(Resolve, Reject) {
				var that = this;
				var oWFParmSet = that.getOwnerComponent().getModel("JM_CONFIG");
				busyDialog.open();
				oWFParmSet.read("/WFParmSet", {
					filters: [
						new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, this.vAppId)
					],
					success: function(oData) {
						busyDialog.close();
						var oEntry = oData.results[0];
						var oMatchedParams = {};
						Object.keys(oEntry).forEach(function(sKey) {
							if (/^WfParm\d+Id$/.test(sKey)) {
								var sVal = oEntry[sKey];
								if (sVal && sVal.trim() !== "") {
									oMatchedParams[sKey] = sVal.trim();
								}
							}
						});
						var oParmModel = that.getOwnerComponent().getModel("JM_ParmModel");
						oParmModel.setData(oMatchedParams);
						oParmModel.refresh();
						Resolve(true);
					},
					error: function() {
						Reject(false);
					}
				});
			}.bind(this));
		},

		// *-------------------------------------------------------------------------------------
		//						Function to navigation back and cancel button
		// *------------------------------------------------------------------------------------
		onNavBack: function() {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("search");
		},

		fnCancel: function() {
			this.fnOpenMessageClrAll(i18n.getText("E"), "S");
		},

		// *-------------------------------------------------------------------------------------
		//						Function to to open clearall popup
		// *------------------------------------------------------------------------------------

		fnOpenMessageClrAll: function(x, y) {
			var that = this;
			if (!that.clrAllfrag) {
				that.clrAllfrag = sap.ui.xmlfragment("id_confirmFrag", "PRDH.fragment.clear", that);
				that.getView().addDependent(that.clrAllfrag);
			}
			that.clrAllfrag.open();
			var otext = sap.ui.core.Fragment.byId("id_confirmFrag", "id_Confirm");
			otext.setText(x);
		},

		fnCancelClear: function() {
			if (this.clrAllfrag) {
				this.clrAllfrag.close();
				this.clrAllfrag.destroy();
				this.clrAllfrag = null;
			}
		},
		fnClearAll: function() {
			this.byId("KID_MTART").setValue("");
			this.byId("KID_MTART_DES").setValue("");
			this.byId("KID_MTART_ERR").setText("").setVisible(false);
			this.byId("KID_MTART_DES").setEditable(false);
			this.byId("KID_MTART_ERR").setText("").setVisible(false);
			this.byId("KID_SPART").setValue(""); // Added by Jones on 15.12.2025
			this.byId("KID_SPART_DES").setValue(""); // Added by Jones on 15.12.2025
			this.byId("KID_SPART_ERR").setText("").setVisible(false); // Added by Jones on 15.12.2025
			this.byId("id_kdradio").setSelectedIndex(0);
			var oVM = this.getView().getModel("viewModel");
			if (oVM) {
				oVM.setProperty("/showMatDiv", true);
			}
			this.byId("kid_title").setText("MDM : Product Hierarchy");
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("search");
		},

		// *-------------------------------------------------------------------------------------
		//		Function for Resize responsive logic
		// *-------------------------------------------------------------------------------------

		fnResize: function() {
			var oRange = sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD);

			if (oRange.name === "Phone") {
				this.fnMobileViewChanges();
			} else {
				this.fnTabDesktopViewChanges();
			}
		},
		fnMobileViewChanges: function() {
			this.getView().getModel("RoadMapUI").setProperty("/labelVisible", false);

		},
		fnTabDesktopViewChanges: function() {
			this.getView().getModel("RoadMapUI").setProperty("/labelVisible", true);
		}

	});

});