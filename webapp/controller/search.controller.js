sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"PRDH/controller/ErrorHandler",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/resource/ResourceModel",
	"PRDH/Formatter/formatter",
	"sap/ui/export/Spreadsheet",
	"sap/ui/export/library"
], function(Controller, ErrorHandler, Filter, FilterOperator, ResourceModel, formatter, Spreadsheet, exportLibrary) {
	"use strict";
	var EdmType = exportLibrary.EdmType;
	var busyDialog = new sap.m.BusyDialog();
	var i18n;
	return Controller.extend("PRDH.controller.search", {
		formatter: formatter,
		onInit: function() {
			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("search").attachPatternMatched(this.fnRouter, this);
			// ********************* IMAGE MODEL ************************
			var vPathImage = jQuery.sap.getModulePath("PRDH") + "/Image/";
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: vPathImage
			});
			this.getView().setModel(oImageModel, "JM_ImageModel");

			// **********************************************************
			var i18nModel = new ResourceModel({
				bundleName: "PRDH.i18n.i18n"
			});
			this.getView().setModel(i18nModel, "i18n");

			i18n = this.getView().getModel("i18n").getResourceBundle();
			this.f4Cache = {};
			this.stufeCache = {};
			var oEmpty = [];
			var oModel = new sap.ui.model.json.JSONModel(oEmpty);
			this.getView().setModel(oModel, "JM_SEARCH");

		},
		fnRouter: function() {

			// this.getView().byId("id_dashBoard_h").removeStyleClass("cl_listhighlight");
			// this.getView().byId("id_dashBoard_h").addStyleClass("cl_list_con");
			// this.getView().byId("id_appList_h").addStyleClass("cl_listhighlight");
			// this.getView().byId("id_appList_h").removeStyleClass("cl_list_con");
			// Drop Down Values
			var that = this;
			// this.fnClearData();
			this.fnClearAll();
			var oVisModel = new sap.ui.model.json.JSONModel({
				labelVisible: true
			});
			this.getView().setModel(oVisModel, "RoadMapUI");
			sap.ui.Device.resize.attachHandler(this.fnResize, this);
			this.fnResize();

			var oUserModel = this.getOwnerComponent().getModel("JM_CONFIG");
			oUserModel.read("/UsernameSet", {
				success: function(oData) {
					var oJsonModel = new sap.ui.model.json.JSONModel();
					oJsonModel.setData(oData.results[0]);
					that.getView().setModel(oJsonModel, "JM_UserModel");

					that.fnSearchVariant();
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});

			// document.addEventListener("paste", this.fnGlobalPaste.bind(this)); // for copying excel and paste in  table

			// model for vboxes visibility , for advance search open open and close functionality
			var vVisibilitydata = {
				visible: true,
				AdvanceSearch: false,
				RoadMapVisible: true
			};
			var oVisibleModel = new sap.ui.model.json.JSONModel(vVisibilitydata);
			this.getView().setModel(oVisibleModel, "JMVboxVisibilityModel");

			// add short cut key for search ( Ctrl + Enter)
			// $(document).on("keydown.searchShortcut", function(e) {
			// 	if (e.ctrlKey && e.key === "Enter") {
			// 		// this.fnSsearch();
			// 	}
			// }.bind(this));

		},
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

		},
		fnSearchVariant: function() {
			var that = this;
			// based on the fetched username get the Combo box items
			var oComboModel = that.getOwnerComponent().getModel("JM_CONFIG");
			var oPayload = {
				MdmMaster: "P",
				VariantName: "",
				CreatedBy: "",
				CreatedOn: null,
				Filter: "",
				Flag: "V",
				FieldId: "",
				Value: "",
				NavSearch_Variant: []
			};
			oComboModel.create("/Search_VariantSet", oPayload, {
				success: function(oData, response) {
					// sap.ui.core.BusyIndicator.hide();
					var oJsonModel = new sap.ui.model.json.JSONModel();
					var aResults = oData.NavSearch_Variant.results;
					aResults.forEach(function(oItem) {
						oItem.isNew = false;
					});
					oJsonModel.setData(aResults);
					that.getView().setModel(oJsonModel, "JMComboModel");
					var aData = that.getView().getModel("JMComboModel").getData();
					aData.unshift({
						VariantName: "Select Variant",
						isNew: false,
						isPlaceholder: true
					}); // unshift add the item to begining of array
					that.getView().getModel("JMComboModel").setProperty("/variants", aData);
					that.getView().getModel("JMComboModel").setProperty("/ComboBoxvariants", aData);
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});

		},
		fnOpenVariant: function() {
			var that = this;
			// to open the fragment only when the variant combo box is empty
			var sVar = this.getView().byId("id_variants").getSelectedKey();
			if (sVar !== "Select Variant") {
				that.fnOpenMessageClrAll(i18n.getText("ModifyConfirmationText"), "M");
				return;
			}
			if (!this.SearchVarfrag) {
				this.SearchVarfrag = sap.ui.xmlfragment("idManageViewsDialog", "PRDH.Fragment.create_varient", this);
				this.getView().addDependent(this.SearchVarfrag);
			}
			// var aData = this.getView().getModel("JMComboModel").getData();

			var oMainModel = this.getView().getModel("JMComboModel");
			var aData = oMainModel.getProperty("/variants") || [];

			// Filter out "Select Variant" and overwrite variants
			var aFiltered = aData.filter(function(item) {
				return item.VariantName !== that.getView().getModel("i18n")
					.getResourceBundle()
					.getText("SelectVariantText");
			});

			oMainModel.setProperty("/variants", aFiltered);

			this.SearchVarfrag.open();
		},
		fnCancelVariant: function() {
			if (this.SearchVarfrag) {
				this.SearchVarfrag.close();
				this.SearchVarfrag.destroy();
				this.SearchVarfrag = null;
			}
		},
		//Expand Logic for opening the Advance search 
		fnAdvanceSearchOpen: function() {

			var oVisibleModel = this.getView().getModel("JMVboxVisibilityModel");

			// Read current value
			var bCurrent = oVisibleModel.getProperty("/AdvanceSearch");

			var bNewValue = !bCurrent;
			oVisibleModel.setProperty("/AdvanceSearch", bNewValue);

			// Update arrow icon based on new state
			var oArrow = this.getView().byId("id_arrowIcon");

			if (bNewValue) {
				oArrow.setSrc(this.getView().getModel("JM_ImageModel").getProperty("/path") + "AdvanceSearchUpArrow.svg"); // Expanded
			} else {
				oArrow.setSrc(this.getView().getModel("JM_ImageModel").getProperty("/path") + "AdvanceSearchDownArrow.svg"); // Collapsed
			}
		},

		// Collapse Logic for Advance Search
		fnAdvanceSearchClose: function() {
			var oVisibleModel = this.getView().getModel("JMVboxVisibilityModel");
			oVisibleModel.setProperty("/AdvanceSearch", false);
		},
		fnPressExpand: function() {
			var oView = this.getView();
			var oButton = oView.byId("id_ExpandButton");
			var oTable = oView.byId("id_ResultTable");
			var oVbox = oView.byId("id_resultBox");
			var containter = this.getView().byId("id_SearchContainer");
			var oVisibleModel = oView.getModel("JMVboxVisibilityModel");
			var bExpandMode = oVisibleModel.getProperty("/visible");
			// Toggle the value
			oVisibleModel.setProperty("/visible", !bExpandMode);
			// Update icon and styles
			if (bExpandMode) {
				// oTable.setVisibleRowCountMode("Fixed");
				oTable.setVisibleRowCount(13);
				oButton.setIcon(this.getView().getModel("JM_ImageModel").getProperty("/path") + "collapse.svg");
				oButton.toggleStyleClass("cl_s_expandbutton", false);
				oButton.toggleStyleClass("cl_s_collapseIcon", true);
				oVbox.addStyleClass("cl_TableVbox");
				oVisibleModel.setProperty("/RoadMapVisible", false);
				containter.removeStyleClass("cl_search_container");
				containter.addStyleClass("cl_search_containerSS");
				// this.getView().byId("id_SearchContainer").removeStyleClass("sapUiLargeMarginTop");
				this.getView().byId("id_SearchContainer").addStyleClass("sapUiTinyMarginTop");
			} else {
				// oTable.setVisibleRowCountMode("Interac");
				oTable.setVisibleRowCount(7);
				oButton.setIcon(this.getView().getModel("JM_ImageModel").getProperty("/path") + "expand.svg");
				oButton.toggleStyleClass("cl_s_collapseIcon", false);
				oButton.toggleStyleClass("cl_s_expandbutton", true);
				oVbox.removeStyleClass("cl_TableVbox");
				oVisibleModel.setProperty("/RoadMapVisible", true);
				containter.removeStyleClass("cl_search_containerSS");
				containter.addStyleClass("cl_search_container");
				// this.getView().byId("id_SearchContainer").addStyleClass("sapUiLargeMarginTop");
				this.getView().byId("id_SearchContainer").removeStyleClass("sapUiTinyMarginTop");
			}
		},
		// *************************************************************************************************************************
		//									Table Customize filter
		// *************************************************************************************************************************

		fnTableFilter: function(oEvent) {
			var oButton = oEvent.getSource();
			var that = this;
			var oList =
				new sap.m.List({
					items: [
						new sap.m.StandardListItem({
							title: "Customize",
							type: "Active",
							icon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "customize.svg",
							press: function() {
								var oSourceTable = that.getView().byId("id_ResultTable");
								if (!that.customizefrag) {
									that.customizefrag = sap.ui.xmlfragment("idColumnSelection", "PRDH.Fragment.customize", that);
									that.getView().addDependent(that.customizefrag);
								}
								var aColumnMeta = [];
								oSourceTable.getColumns().forEach(function(oColumn) {
									aColumnMeta.push({
										id: oColumn.getId(),
										field: oColumn.getLabel() && oColumn.getLabel().getText ? oColumn.getLabel().getText() : "",
										visible: oColumn.getVisible()
									});
								});
								// Create model with array as root
								var oColModel = new sap.ui.model.json.JSONModel(aColumnMeta);
								// Attach to view with name
								that.getView().setModel(oColModel, "CustomizeModel");
								// Also attach to fragment table
								var oSettingsTable = sap.ui.core.Fragment.byId("idColumnSelection", "idSettingsTable");
								oSettingsTable.setModel(oColModel, "CustomizeModel");
								// oSettingsTable.setColumnHeaderVisible(false);
								oSettingsTable.attachEventOnce("rowsUpdated", function() {
									var iRowCount = oSettingsTable.getBinding("rows").getLength();
									var aRows = oSettingsTable.getBinding("rows").getContexts();

									// If we have previous selection, restore it
									if (that._aLastSelectedHeaders && that._aLastSelectedHeaders.length > 0) {
										for (var i = 0; i < iRowCount; i++) {
											var sField = aRows[i].getObject().field;
											if (that._aLastSelectedHeaders.includes(sField)) {
												oSettingsTable.addSelectionInterval(i, i);
											}
										}
									} else {
										// First time → select all
										oSettingsTable.selectAll(true);
									}
								});
								if (that.VarSelected) {
									var oBinding = oSettingsTable.getBinding("rows");
									var aData = oBinding.getModel().getProperty("/");
									var oValueModel = that.getView().getModel("JMValueModel");
									var aValueData = oValueModel.getData();
									var aSelectedIndices = [];
									for (var i = 0; i < aData.length; i++) {
										for (var j = 0; j < aValueData.length; j++) {
											var colId = aData[i].id.split("--").pop();
											if (colId === aValueData[j].FieldId) {
												aSelectedIndices.push(i);
											}
										}
									}
									aSelectedIndices.forEach(function(i) {
										oSettingsTable.addSelectionInterval(i, i);
									});
									var sVarName = that.getView().byId("id_variants").getSelectedKey();
									if (sVarName === "") {
										var iRowCount = oSettingsTable.getBinding("rows").getLength();
										var aRows = oSettingsTable.getBinding("rows").getContexts();
										// sap.m.MessageToast.show("Mesage toast");
										// oSettingsTable.selectAll(true);
										for (var k = 0; k < iRowCount; k++) {
											var sHeader = aRows[k].getObject().header;
											if (!that._aLastSelectedHeaders || that._aLastSelectedHeaders.includes(sHeader)) {
												oSettingsTable.addSelectionInterval(j, j);
											}
										}
										that.VarSelected = false;
									}
									this.CustomizeOpened = true;
								}
								that.customizefrag.open();
							}
						}).addStyleClass("cl_uwl_customizefilterlistitem"),
						new sap.m.StandardListItem({
							title: that.textWrap ? i18n.getText("ClipText") : that.getView().getModel(
								"i18n").getResourceBundle().getText("WrapText"),
							// when true set to clip and else set to wrap
							type: "Active",
							icon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Warptext.svg",
							press: function(oEvent) {
								var oTable = that.getView().byId("id_ResultTable");
								oTable.addStyleClass("cl_s_Agentfield");
								// get the columns 
								var oColumns = oTable.getColumns();
								var oItem = oEvent.getSource();
								if (!that.textWrap) {
									oItem.setTitle(i18n.getText("ClipText"));
									that.textWrap = true;
									oColumns[1].setWidth("15%"); // Material Description column
								} else {
									oColumns[1].setWidth("25%"); // Material Description column
									oItem.setTitle(i18n.getText("WrapText"));
									oTable.removeStyleClass("cl_s_Agentfield");
									that.textWrap = false;
								}

							}

						}).addStyleClass("cl_uwl_customizefilterlistitem")
					]
				}).addStyleClass("cl_uwl_filterlistitem");
			var oClrButton = new sap.m.Button({
				text: "Clear",
				icon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "ClearAll_ph.svg",
				// type: "Emphasized",
				press: function() {
					// sap.m.MessageToast.show("Add Variant Pressed");
					var oTable = that.getView().byId("id_ResultTable");
					var aColumns = oTable.getColumns();
					aColumns.forEach(function(ocolumns) {
						oTable.filter(ocolumns, "");
					});
				}
			}).addStyleClass("cl_primaryBtn cl_iconBtn cl_focusbtn cl_menuBtn");
			var oPopover = new sap.m.Popover({
				placement: sap.m.PlacementType.Bottom,
				offsetX: 54, // bring the pop up right
				content: new sap.m.VBox({
					items: [oList, oClrButton],
					justifyContent: "Center",
					alignItems: "Center"
				})
			});
			oPopover.addStyleClass("cl_uwl_PopOver sapUiSizeCompact");
			oPopover.openBy(oButton);
		},

		fnCancelCustomize: function() {
			var that = this;
			if (that.customizefrag) {
				that.customizefrag.close();
				that.customizefrag.destroy();
				that.customizefrag = null;
			}
		},

		fnApplyCustomize: function() {
			var oSettingsTable = sap.ui.core.Fragment.byId("idColumnSelection", "idSettingsTable");
			var aIndices = oSettingsTable.getSelectedIndices();
			var aSelectedHeaders = [];

			// Collect selected headers
			aIndices.forEach(function(iIndex) {
				var oContext = oSettingsTable.getContextByIndex(iIndex);
				if (oContext) {
					var oRowData = oContext.getObject();
					if (oRowData && oRowData.field) {
						aSelectedHeaders.push(oRowData.field); // use field name
					}
				}
			});

			this._aLastSelectedHeaders = aSelectedHeaders;

			// Update visibility in main table
			var oMainTable = this.getView().byId("id_ResultTable");
			oMainTable.getColumns().forEach(function(oColumn) {
				var sHeaderText = oColumn.getLabel().getText();
				var bVisible = aSelectedHeaders.includes(sHeaderText);
				oColumn.setVisible(bVisible);
			});

			this.VarSelected = false;

			if (this.customizefrag) {
				this.customizefrag.close();
				this.customizefrag.destroy();
				this.customizefrag = null;
			}
		},
		fnCustomizeSearch: function(oEvent) {
			var sQuery = oEvent.getSource().getValue().toLowerCase();

			var oModel = this.getView().getModel("CustomizeModel");
			var aData = oModel.getData();

			aData.forEach(function(item) {
				item._matchRank = item.field.toLowerCase().includes(sQuery) ? 0 : 1;
			});

			aData.sort(function(a, b) {
				return a._matchRank - b._matchRank;
			});

			oModel.refresh();
		},

		fnMenu: function(oEvent) {
			var menukey = oEvent.getParameter("item").getKey();
			var router = this.getOwnerComponent().getRouter();

			if (menukey === "PHC") {

				var oWFParmSet = this.getOwnerComponent().getModel("JM_CONFIG");
				var KeyDataId = ["KID_MTART", "KID_SPART"]; // changed by Jones on 16.12.2025

				busyDialog.open();

				oWFParmSet.read("/WFParmSet", {
					filters: [
						new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, menukey)
					],

					success: function(oData) {
						busyDialog.close();

						var oEntry = oData.results[0];
						var oMatchedParams = {};
						var aInvalidParams = [];

						Object.keys(oEntry).forEach(function(sKey) {
							if (/^WfParm\d+Id$/.test(sKey)) {
								var sVal = oEntry[sKey];
								if (sVal && sVal.trim() !== "") {
									if (KeyDataId.includes(sVal.trim())) {
										oMatchedParams[sKey] = sVal.trim();
									} else {
										aInvalidParams.push(sVal);
									}
								}
							}
						});

						var oParmModel = this.getOwnerComponent().getModel("JM_ParmModel");
						oParmModel.setData(oMatchedParams);

						if (Object.keys(oMatchedParams).length > 0) {

							var oViewstateModel = new sap.ui.model.json.JSONModel({
								fromSearch: true,
								fromKeyData: false,
								fromInitiator: false,
								fromUWL: false
							});

							sap.ui.getCore().setModel(oViewstateModel, "JM_ViewStateModel");
							router.navTo("keydata");
						}

					}.bind(this),

					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}.bind(this)
				});
			}
		},

		fnF4press: function(oEvent) {
			var that = this;
			var sitem = oEvent.getSource().getId().split("--")[1];

			this.selectedField = sitem;

			if (sitem === "SID_STUFE_1") {
				sitem = "SID_STUFE";
			}
			var oPayload = {
				FieldId: sitem,
				Process: "X",
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
						// if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
						// 	if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
						// 		// ErrorHandler.showCustomSnackbar(oFirst.Message, "Error");
						// 		return;
						// 	}
						// 	vLength = aResults.length;
						// 	oLabels.col1 = "Key";
						// 	if (oFirst.Label2) {
						// 		oLabels.col2 = oFirst.Label2;
						// 	}
						// 	aResults.forEach(function(item) {
						// 		var row = {};
						// 		if (oLabels.col1) {
						// 			row.col1 = item.DomvalueL;
						// 		}
						// 		if (oLabels.col2) {
						// 			row.col2 = item.Ddtext;
						// 		}
						// 		if (oLabels.col3) {
						// 			row.col3 = item.DomvalueL3;
						// 		}
						// 		if (oLabels.col4) {
						// 			row.col4 = item.DomvalueL4;
						// 		}
						// 		aFormattedRows.push(row);
						// 	});
						// 	oJsonModel = new sap.ui.model.json.JSONModel({
						// 		labels: oLabels,
						// 		rows: aFormattedRows
						// 	});
						// 	this.getView().setModel(oJsonModel, "JM_F4Model");
						// 	vTitle = sap.ui.getCore().byId(this.sitem + "_TXT").getText() + " (" + vLength + ")";
						// 	this.fnF4fragopen(oEvent, vTitle).open();
						// }
						// else {
						vLength = oData.NavSerchResult.results.length;
						if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
							ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", that);
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
						// }
					}

				}.bind(this),
				error: function(oResponse) {

				}
			});
		},
		// to open the fragment 
		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "PRDH.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
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
			var sValue = oInput.getValue().toUpperCase();
			oInput.setValue(sValue);

			var sQuery = sValue; // Already uppercase
			var oTable = this.byId("idMaterialTable");
			var oBinding = oTable.getBinding("items");
			if (!oBinding) return;

			var aFilters = [];
			if (sQuery) {
				aFilters.push(new sap.ui.model.Filter({
					filters: [
						new sap.ui.model.Filter("col1", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col2", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col3", sap.ui.model.FilterOperator.StartsWith, sQuery),
						new sap.ui.model.Filter("col4", sap.ui.model.FilterOperator.StartsWith, sQuery)
					],
					and: false
				}));
			}

			oBinding.filter(aFilters, "Application");
		},

		// data press from F4 dialog
		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			if (!oContext) {
				return;
			}

			var item = oContext.getProperty("col1");
			var item1 = oContext.getProperty("col2");
			var item2 = oContext.getProperty("col3");
			this.getView().byId(this.selectedField).setValue(item);

			if (this.selectedField === "SID_STUFE_LEV") {
				this.getView().byId(this.selectedField).setValue(item2);
				this.fnAfterCloseFragment();
				return;
			}
			this.getView().byId(this.selectedField).setValueState("None");
			this.getView().byId(this.selectedField + "_DES").setValue(item1);
			if (this.getView().byId(this.selectedField + "_LEV")) {
				this.getView().byId(this.selectedField + "_LEV").setValue(item2);
			}

			this.fnAfterCloseFragment();
			// var vValid = this.fnValidateGroupRelation(this.selectedField);
			// if (!vValid) {
			// 	this.getView().byId(this.selectedField).setValue("");
			// 	this.getView().byId(this.selectedField + "_DES").setValue("");
			// 	if (this.getView().byId(this.selectedField + "_LEV")) {
			// 		this.getView().byId(this.selectedField + "_LEV").setValue("");
			// 	}
			// 	return;
			// }
		},
		fnAfterCloseFragment: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},
		// ***********************************************
		//  Advance search level f4 
		fnF4Levelpress: function(oEvent, oLivechange) {
			var that = this;
			var sitem = oEvent.getSource().getId().split("--")[1];

			this.selectedField = sitem;
			var aParts = sitem.split("_");
			var stufe = aParts[2];
			// added by sabarish 29-12-2025
			if (stufe > 1) {
				for (var i = Number(stufe) - 1; i >= 1; i--) {
					var oInput = this.getView().byId("SID_STUFE_" + i);
					var value = oInput ? oInput.getValue() : "";

					if (!value) {
						ErrorHandler.showCustomSnackbar(
							"Please fill the previous level " + i,
							"Error", this
						);
						return;
					}
				}
			}
			// eoc
			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			var oLabels = {};
			var oJsonModel;
			var vTitle;
			var vLength;
			this.sitem = sitem;
			var aFormattedRows = [];
			var prodh = "";

			var value;
			for (var i = 1; i < stufe; i++) {
				var val = this.byId("SID_STUFE_" + i);
				if (val) {
					value = val.getValue().trim();
					if (value !== "") {
						prodh += value;
					}
				}

			}
			if (this.sitem === "SID_STUFE_LEV") {
				prodh = "";
				stufe = "";
			}
			var sFilter = new sap.ui.model.Filter([
				new sap.ui.model.Filter("Prodh", sap.ui.model.FilterOperator.EQ, prodh),
				new sap.ui.model.Filter("Stufe", sap.ui.model.FilterOperator.EQ, stufe)
			], true);
			busyDialog.open();
			oModel.read("/PH_AdvanceSearchSet", {
				filters: [sFilter],
				success: function(oData) {
					busyDialog.close();
					var aResults = oData.results;
					this.stufeCache[stufe] = aResults;
					if (oLivechange === true) {

						return;
					}

					if (aResults.length > 0) {
						var oFirst = aResults[0];
						// vLength = oData.results.length;
						if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
							ErrorHandler.showCustomSnackbar(oFirst.Message, "Error", that);
							return;
						}

						// oLabels.col1 = "Product Hierarchy";
						// oLabels.col2 = "Description";
						// oLabels.col3 = "Level Number";	

						oLabels.col1 = oFirst.FieldNam1;
						oLabels.col2 = oFirst.FieldNam2;
						oLabels.col3 = oFirst.FieldNam3;
						var vWithoutHeader = aResults.slice(1);
						vLength = vWithoutHeader.length;
						vWithoutHeader.forEach(function(item) {
							var row = {};
							if (oLabels.col1) {
								row.col1 = item.Prodh;
							}
							if (oLabels.col2) {
								row.col2 = item.Vtext;
							}
							if (oLabels.col3) {
								row.col3 = item.Stufe;
							}
							// if (oLabels.col4) {
							// 	row.col4 = item.Value4;
							// }
							aFormattedRows.push(row);
						});
						// }
						oJsonModel = new sap.ui.model.json.JSONModel({
							labels: oLabels,
							rows: aFormattedRows
						});
						this.getView().setModel(oJsonModel, "JM_F4Model");
						this.getView().getModel("JM_F4Model");
						if (this.getView().getModel("JM_F4Model").getData().labels.col1) {
							vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
						} else {
							vTitle = this.getView().getModel("JM_F4Model").getData().labels.col3 + " (" + vLength + ")";
						}

						this.fnF4fragopen(oEvent, vTitle).open();
						// }
					}

				}.bind(this),
				error: function(oResponse) {

				}
			});
		},

		fnsearch: function() {
			var that = this;
			var oSearchEntity = this.getOwnerComponent().getModel("JM_PRODHIER");
			var payLoad = {
				Prodh: this.getView().byId("SID_STUFE").getValue(),
				Vtext: this.getView().byId("SID_STUFE_DES").getValue(),
				Stufe: this.getView().byId("SID_STUFE_LEV").getValue(),
				Magrv: this.getView().byId("SID_MAGRV").getValue(),
				Bezei: this.getView().byId("SID_MAGRV_DES").getValue(),
				And: this.getView().byId("id_and").getSelected(),
				Or: this.getView().byId("id_or").getSelected(),
				Matkl: this.getView().byId("ID_PH_MATKL").getValue(),
				Wgbez: this.getView().byId("ID_PH_MATKL_DES").getValue()

			};
			var aLevels = [1, 2, 3, 4, 5, 6, 7];

			aLevels.forEach(function(i) {

				var sCodeId = "SID_STUFE_" + i;
				var sDescId = "SID_STUFE_" + i + "_DES";

				var sCodeValue = that.getView().byId(sCodeId).getValue();
				var sDescValue = that.getView().byId(sDescId).getValue();

				// Add only if value exists
				if (sCodeValue) {
					payLoad["Level" + i] = sCodeValue;
				}
				if (sDescValue) {
					payLoad["Vtext" + i] = sDescValue;
				}
			});

			payLoad.NavPHSearch = [];

			// if (!payLoad.Matnr && !payLoad.Plnnr && !payLoad.Werks) {
			// 	ErrorHandler.showCustomSnackbar(i18n.getText("searchFieldRequiredError"), "Error");
			// 	return;
			// }

			busyDialog.open();
			oSearchEntity.create("/Product_Search_InputSet", payLoad, {

				success: function(oData) {
					var aResults = oData.NavPHSearch.results;

					aResults.forEach(function(item) {
						if ((!item.Bezei || item.Bezei.trim() === "") && (!item.Wgbez || item.Wgbez.trim() === "")) {
							item.Vtype = "Prod Hier";
						} else if (item.Bezei) {
							item.Vtype = "Pack Mat Grp";
						} else if (item.Wgbez) {
							item.Vtype = "Mat Grp";
						}
					});

					// Set result count
					that.getView().byId("id_resultcnt").setText("(" + aResults.length + ")");

					// Bind updated model
					var oModel = new sap.ui.model.json.JSONModel(aResults);
					that.getView().setModel(oModel, "JM_SEARCH");

					// Visibility logic
					if (aResults.length > 0) {
						var oVisibleModel = that.getView().getModel("JMVboxVisibilityModel");
						if (oVisibleModel.getProperty("/AdvanceSearch")) {
							that.fnPressExpand();
						}
					} else {
						ErrorHandler.showCustomSnackbar(i18n.getText("searchnodatafound"), "Error", that);
					}

					busyDialog.close();
				}.bind(this),

				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},

		// 	//Add variant
		fnAddVariant: function() {
			// clear the filter if applied

			var oFields = [
				"SID_STUFE", "SID_STUFE_DES", "SID_STUFE_LEV", "SID_MAGRV", "SID_MAGRV_DES"
			];

			var that = this;
			// Validate at least one input
			// var bHasInput = oFields.some(function(sFieldId) {
			// 	var oInput = that.getView().byId(sFieldId);
			// 	if (oInput) {

			// 		var sValue = oInput.getValue();
			// 		return sValue && sValue.trim() !== "";
			// 	}
			// 	return false;
			// });

			// if (!bHasInput) {
			// 	ErrorHandler.showCustomSnackbar(i18n.getText("VariantSave_Input_Validation"), "Error", that);
			// 	return;
			// }
			var oTable = sap.ui.core.Fragment.byId("idManageViewsDialog", "idVariantTable");
			var oBinding = oTable.getBinding("rows");
			if (oBinding) {
				oBinding.filter([]);
			}
			var aData = [];
			var aSelectionBoxData = [];
			var sInput = sap.ui.core.Fragment.byId("idManageViewsDialog", "id_SearchVar");
			sInput.setValue("");
			var oModel = this.getView().getModel("JMComboModel");
			if (!oModel) {
				// If model not present, create one and set it to the view
				oModel = new sap.ui.model.json.JSONModel({
					variants: []
				});
				this.getView().setModel(oModel, "JMComboModel");
			}

			var oUserModel = this.getView().getModel("JM_UserModel");
			var aUserData = oUserModel.getData();
			var username = aUserData.Uname;

			// if (oModel) {
			aData = oModel.getProperty("/variants") || [];
			aSelectionBoxData = oModel.getProperty("/ComboBoxvariants") || [];
			var oCreated = aData.length - 1;
			var sSelectedIndex = aData.length;
			if (sSelectedIndex >= 10) {
				// sap.m.MessageToast.show("Variant limit reached");
				ErrorHandler.showCustomSnackbar(i18n.getText("VariantLimitValidationText"), "Error", that);
				return;
			}
			var oLastRow = aData[aData.length - 1];
			if (oLastRow) {
				if (oLastRow.VariantName === "") {
					// sap.m.MessageToast.show("Please Complete previous Row");
					ErrorHandler.showCustomSnackbar(i18n.getText("VariantEmptyRowValidationError", that),
						"Warning");
					return;
				}
				if (oLastRow.isNew === true) {
					// sap.m.MessageToast.show("Please Complete previous Row");
					ErrorHandler.showCustomSnackbar(i18n.getText("PreviousVariantSaveValidation"), "Warning", that);
					return;
				}
			}
			// }

			// Create a new row entry
			var oNewRow = {
				VariantName: "",
				// createdBy: "",
				selected: true,
				isNew: true
			};

			aData.push(oNewRow);
			aSelectionBoxData.push(oNewRow);
			oModel.setProperty("/variants", aData);
			// aSelectionBoxData.setProperty("/ComboBoxvariants", aSelectionBoxData);
			oModel.setProperty("/ComboBoxvariants", aSelectionBoxData);
			oTable.setFirstVisibleRow(oCreated);
			oTable.setSelectedIndex(sSelectedIndex);
			this.getView().getModel("JMComboModel").refresh(true);
		},
		fnDeleteVariant: function() {
			var that = this;
			var oView = this.getView();
			var oTable = sap.ui.core.Fragment.byId("idManageViewsDialog", "idVariantTable");

			// Get selected indices
			var aSelectedIndices = oTable.getSelectedIndices();

			// Handle no selection case
			if (aSelectedIndices.length === 0) {
				// sap.m.MessageToast.show("Please select at least one row to delete.");
				ErrorHandler.showCustomSnackbar(i18n.getText("Variant_Delete_Validation"), "Warning", that);
				return;
			}

			this.fnOpenMessageClrAll(i18n.getText("Variant_Delete_Confirmation"), "D");

		},
		fnOpenMessageClrAll: function(x, y) {
			var that = this;
			if (!that.clrAllfrag) {
				that.clrAllfrag = sap.ui.xmlfragment("id_confirmFrag", "PRDH.fragment.clear", that);
				that.getView().addDependent(that.clrAllfrag);
			}
			that.clrAllfrag.open();
			var otext = sap.ui.core.Fragment.byId("id_confirmFrag", "id_Confirm");
			otext.setText(x);
			if (y === "M") {
				this.flag = "M"; // set flag for modification

			} else if (y === "D") {
				this.flag = "D";
			} else if (y === "S") {
				this.flag = "S"; // set flag for modification
			} else {
				otext.setText(i18n.getText("ClearConfirmationText"));
			}
		},
		fnCancelClear: function() {
			if (this.clrAllfrag) {
				this.clrAllfrag.close();
				this.clrAllfrag.destroy();
				this.clrAllfrag = null;
			}
		},
		// *****************************************************************************************************************************
		//												Clear All 
		// ***************************************************************************************************************************
		fnClearAll: function() {
			var that = this;
			if (that.flag === "M") { // modify function
				that.fnmodifyConfirm();
				if (that.clrAllfrag) {
					that.clrAllfrag.close();
					that.clrAllfrag.destroy();
					that.clrAllfrag = null;
				}
				return;
			} else if (that.flag === "D") { // delete var function
				that.fndeleteVarconfirm();
				if (that.clrAllfrag) {
					that.clrAllfrag.close();
					that.clrAllfrag.destroy();
					that.clrAllfrag = null;
				}
				return;
			} else if (that.flag === "S") { // save function
				that.fnsaveVarconfirm();
				if (that.clrAllfrag) {
					that.clrAllfrag.close();
					that.clrAllfrag.destroy();
					that.clrAllfrag = null;
				}
				return;
			} else {
				that.getView().byId("SID_STUFE").setValue("");
				that.getView().byId("SID_STUFE_DES").setValue("");
				that.getView().byId("SID_STUFE_1").setValue("");
				that.getView().byId("SID_STUFE_1_DES").setValue("");
				that.getView().byId("SID_STUFE_2").setValue("");
				that.getView().byId("SID_STUFE_2_DES").setValue("");
				that.getView().byId("SID_STUFE_3").setValue("");
				that.getView().byId("SID_STUFE_3_DES").setValue("");
				that.getView().byId("SID_STUFE_4").setValue("");
				that.getView().byId("SID_STUFE_4_DES").setValue("");
				that.getView().byId("SID_STUFE_5").setValue("");
				that.getView().byId("SID_STUFE_5_DES").setValue("");
				that.getView().byId("SID_STUFE_6").setValue("");
				that.getView().byId("SID_STUFE_6_DES").setValue("");
				that.getView().byId("SID_STUFE_7").setValue("");
				that.getView().byId("SID_STUFE_7_DES").setValue("");
				that.getView().byId("SID_STUFE_LEV").setValue("");
				that.getView().byId("SID_MAGRV").setValue("");
				that.getView().byId("SID_MAGRV_DES").setValue("");

				that.getView().byId("Id_SearchHere").setValue("");
				that.getView().byId("id_variants").setSelectedKey("Select Variant");
				that.getView().byId("id_resultcnt").setText("");

				// Added by Jones on 16.12.2025 (start)
				that.getView().byId("ID_PH_MATKL").setValue("");
				that.getView().byId("ID_PH_MATKL_DES").setValue("");
				// Added by Jones on 16.12.2025 (end)

				if (that.clrAllfrag) {
					that.clrAllfrag.close();
					that.clrAllfrag.destroy();
					that.clrAllfrag = null;
				}
				var oMainModel = that.getView().getModel("JM_SEARCH");
				if (oMainModel) {
					oMainModel.setProperty("/", []);
				}

				// that.oRangeArray = [];

				// var oButton = this.byId("id_filterButton");
				// var iCurrent = 0;
				// var oBadgeCustomData = oButton.getBadgeCustomData();

				// if (oBadgeCustomData) {
				// 	oBadgeCustomData.setValue(iCurrent.toString());
				// }

			}
		},

		fndeleteVarconfirm: function() {
			var oView = this.getView();
			var that = this;
			var oTable = sap.ui.core.Fragment.byId("idManageViewsDialog", "idVariantTable");
			var oModel = oView.getModel("JMComboModel");
			var aData = oModel.getProperty("/variants");
			var aComboBoxData = oModel.getProperty("/ComboBoxvariants");

			// Get selected indices
			var aSelectedIndices = oTable.getSelectedIndices();

			// Handle no selection case
			if (aSelectedIndices.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("Variant_Delete_RowSelection"), "Warning", that);
				return;
			}

			// Get VariantName from selected rows
			var aSelectedVariantNames = aSelectedIndices.map(function(iIndex) {
				return aData[iIndex].VariantName;
			});

			var sVariantNameToDelete = aSelectedVariantNames[0];

			// Prepare payload with selected VariantName
			var oMainModel = that.getView().getModel("JM_CONFIG");

			var oPayload = {
				MdmMaster: "P",
				VariantName: sVariantNameToDelete,
				Flag: "D",
				NavSearch_Variant: []
			};

			// Call create to delete
			oMainModel.create("/Search_VariantSet", oPayload, {
				success: function(oData) {
					ErrorHandler.showCustomSnackbar(i18n.getText("Variant_Delete_Success"), "success", that);

				},
				error: function(oError) {
					ErrorHandler.showCustomSnackbar(i18n.getText("Variant_Delete_Error"), "Error", that);
				}
			});

			// Filter out deleted rows from model
			var aFilteredData = aData.filter(function(oRow, iIndex) {
				return !aSelectedIndices.includes(iIndex);
			});
			// filtered data for combo box
			var aFilteredDataCombo = aComboBoxData.filter(function(oRow, iIndex) {
				return !aSelectedIndices.includes(iIndex);
			});
			oModel.setProperty("/variants", aFilteredData);
			oModel.setProperty("/ComboBoxvariants", aFilteredDataCombo);

			// Clear selection
			oTable.clearSelection();
			this.flag = "";
		},
		fnSaveVariant: function() {
			var that = this;
			var oModel = this.getView().getModel("JMComboModel");

			var aData = oModel.getData();
			var oLastRow = aData[aData.length - 1];
			if (oLastRow) {
				if (!oLastRow.VariantName) {
					ErrorHandler.showCustomSnackbar(i18n.getText("VariantName_Empty_ValidationText"),
						"Error", that);
					return;
				}
				if (oLastRow.VariantName.length < 3) {
					ErrorHandler.showCustomSnackbar(i18n.getText("VariantName_Length_Validation"), "Warning", that);
					return;
				}
				// duplicate check for Variant name
				var iRowcount = aData.length;
				for (var i = 0; i < iRowcount - 1; i++) {
					if (aData[i].VariantName === oLastRow.VariantName) {
						ErrorHandler.showCustomSnackbar(i18n.getText("VariantName_Duplicate_Validation"),
							"Error", that);
						return;
					}
				}
			}

			var oFields = [
				"SID_STUFE", "SID_STUFE_DES", "SID_STUFE_LEV", "SID_MAGRV", "SID_MAGRV_DES", "id_and", "id_or"
			];

			var aNavArray = [];

			oFields.forEach(function(sFieldId) {
				var oCtrl = that.getView().byId(sFieldId);

				if (oCtrl) {
					var sValue = "";

					// --- Handle Radio Buttons ---
					if (sFieldId === "id_and" || sFieldId === "id_or") {
						sValue = oCtrl.getSelected() ? "True" : "False";
					}
					// --- Handle Inputs / Other Controls ---
					else if (oCtrl.getValue) {
						sValue = oCtrl.getValue().trim();
					}

					if (sValue !== "") {
						aNavArray.push({
							MdmMaster: "P",
							VariantName: oLastRow.VariantName,
							FieldId: sFieldId,
							Value: sValue,
							Filter: "",
							CreatedBy: ""
						});
					}
				}
			});

			// Validate at least one input
			// var bHasInput = oFields.some(function(sFieldId) {
			// 	var oInput = that.getView().byId(sFieldId);
			// 	if (oInput) {
			// 		var sValue = oInput.getValue();
			// 		return sValue && sValue.trim() !== "";
			// 	}
			// 	return false;
			// });

			// if (!bHasInput) {
			// 	ErrorHandler.showCustomSnackbar(i18n.getText("VariantSave_Input_Validation"), "Error", that);
			// 	return;
			// }
			this.fnOpenMessageClrAll(i18n.getText("VariantSave_Confirmation"), "S");

		},
		fnbuildVariantPayload: function(sVariantName) {
			var that = this;
			var oFields = [
				"SID_STUFE", "SID_STUFE_DES", "SID_STUFE_LEV", "SID_MAGRV", "SID_MAGRV_DES", "id_and", "id_or"
			];
			var aNavArray = [];

			// Collect inputs
			// oFields.forEach(function(sFieldId) {
			//   var oCtrl = that.getView().byId(sFieldId);
			// 	if (oInput) {
			// 		var sValue = oInput.getValue();
			// 		if (sValue && sValue.trim() !== "") {
			// 			aNavArray.push({
			// 				MdmMaster: "M",
			// 				VariantName: sVariantName,
			// 				FieldId: sFieldId,
			// 				Value: sValue,
			// 				Filter: "",
			// 				CreatedBy: ""
			// 			});
			// 		}
			// 	}
			// });
			oFields.forEach(function(sFieldId) {
				var oCtrl = that.getView().byId(sFieldId);

				if (oCtrl) {
					var sValue = "";

					// --- Handle Radio Buttons ---
					if (sFieldId === "id_and" || sFieldId === "id_or") {
						sValue = oCtrl.getSelected() ? "True" : "False";
					}
					// --- Handle Inputs / Other Controls ---
					else if (oCtrl.getValue) {
						sValue = oCtrl.getValue().trim();
					}

					if (sValue !== "") {
						aNavArray.push({
							MdmMaster: "P",
							VariantName: sVariantName,
							FieldId: sFieldId,
							Value: sValue,
							Filter: "",
							CreatedBy: ""
						});
					}
				}
			});

			// Collect table column visibility
			var oTable = that.getView().byId("id_ResultTable");
			if (oTable) {
				oTable.getColumns().forEach(function(oCol) {
					var sColId = oCol.getId();
					var sField = sColId.split("--").pop();
					aNavArray.push({
						MdmMaster: "P",
						VariantName: sVariantName,
						FieldId: sField,
						Value: oCol.getVisible() ? "X" : "",
						Filter: "",
						CreatedBy: ""
					});
				});

				// Collect filter table data
				var oData = that.selectedFilterData;
				// if (oData) {
				// 	oData.forEach(function(row, index) {
				// 		var sFilterValue = (index + 1).toString();
				// 		aNavArray.push({
				// 			MdmMaster: "M",
				// 			VariantName: sVariantName,
				// 			FieldId: "SID_MATNRF",
				// 			Value: row.Low,
				// 			Filter: sFilterValue,
				// 			CreatedBy: ""
				// 		}, {
				// 			MdmMaster: "M",
				// 			VariantName: sVariantName,
				// 			FieldId: "SID_MATNRT",
				// 			Value: row.High,
				// 			Filter: sFilterValue,
				// 			CreatedBy: ""
				// 		});
				// 	});
				// }
			}

			// Return payload
			return {
				MdmMaster: "P",
				VariantName: sVariantName,
				CreatedBy: "",
				CreatedOn: null,
				Filter: "",
				Flag: "S",
				FieldId: "",
				Value: "",
				NavSearch_Variant: aNavArray
			};
		},
		fnmodifyConfirm: function() {
			var that = this;
			var sVar = that.getView().byId("id_variants").getSelectedKey();
			var oModel = that.getOwnerComponent().getModel("JM_CONFIG");

			var oPayload = that.fnbuildVariantPayload(sVar);

			oModel.create("/Search_VariantSet", oPayload, {
				success: function() {
					ErrorHandler.showCustomSnackbar(i18n.getText("ModifySuccess"), "success", that);
				},
				error: function() {
					ErrorHandler.showCustomSnackbar(i18n.getText("ModifyError"), "Error", that);
				}
			});

			that.flag = "";
		},

		fnsaveVarconfirm: function() {
			var that = this;
			var oModel = that.getOwnerComponent().getModel("JM_CONFIG");
			var oModel1 = that.getView().getModel("JMComboModel");
			var aData = oModel1.getProperty("/");
			var oLastRow = aData[aData.length - 1];

			var oPayload = that.fnbuildVariantPayload(oLastRow.VariantName);
			// Validate at least one input
			var bHasInput = oPayload.NavSearch_Variant.some(function(item) {
				return item.Value && item.Value.trim() !== "" && item.Filter === "";
			});
			if (!bHasInput) {
				ErrorHandler.showCustomSnackbar(i18n.getText("EmptyFieldValidationError"), "Error", that);
				return;
			}

			oModel.create("/Search_VariantSet", oPayload, {
				success: function() {
					ErrorHandler.showCustomSnackbar(i18n.getText("SaveVariantSuccess"), "success", that);
				},
				error: function() {
					ErrorHandler.showCustomSnackbar(i18n.getText("SaveVariantError"), "Error", that);
				}
			});

			oLastRow.isNew = false;
			oLastRow.VariantName = oPayload.VariantName;
			oLastRow.name = oPayload.VariantName;
			oLastRow.CreatedBy = oPayload.CreatedBy;

			if (that.SearchVarfrag) {
				that.SearchVarfrag.close();
				that.SearchVarfrag.destroy();
				that.SearchVarfrag = null;
			}

			aData.forEach(function(row) {
				if (row.isNew) {
					row.isNew = false;
				}
			});

			that.flag = "";
		},
		fnSelectVar: function(oEvent) {
			var that = this;
			var oSettingsTable = sap.ui.core.Fragment.byId("idColumnSelection", "idSettingsTable");
			var oValueModel = this.getOwnerComponent().getModel("JM_CONFIG");
			var sVarname = oEvent.getSource().getSelectedKey();

			if (!sVarname || sVarname.trim() === "" || sVarname === "Select Variant") {
				this.getView().byId("SID_STUFE").setValue("");
				this.getView().byId("SID_STUFE_DES").setValue("");
				this.getView().byId("SID_STUFE_LEV").setValue(""); //mat desc
				this.getView().byId("SID_MAGRV").setValue(""); // mat type
				this.getView().byId("SID_MAGRV_DES").setValue(""); // sales org
				this.getView().byId("Id_SearchHere").setValue(""); // search here input 
				this.getView().byId("id_variants").setSelectedKey(""); //search variant field
				this.getView().byId("id_resultcnt").setText(""); // Clear result count text
				this._aLastSelectedHeaders = undefined;
				// oSettingsTable.selectAll(); // Selects all rows
				var oTable = this.getView().byId("id_ResultTable");
				var aColumns = oTable.getColumns();

				aColumns.forEach(function(oCol) {
					oCol.setVisible(true);
				});
				var oMainModel = this.getView().getModel("JM_SEARCH");
				if (oMainModel) {
					oMainModel.setProperty("/", []);
				}

				var oBinding = oTable.getBinding("rows");

				if (oBinding) {
					oBinding.refresh();
				}

				that.tableData = [];
				// var oMatModel = that.getView().getModel("JMMaterialModel");
				// if (!oMatModel) {
				// 	oMatModel = new sap.ui.model.json.JSONModel({
				// 		MatData: []
				// 	});
				// 	that.getView().setModel(oMatModel, "JMMaterialModel");
				// } else {
				// 	oMatModel.setData({
				// 		MatData: []
				// 	});
				// }
				return;

			}

			// console.log(sVarname);
			var oPayload = {
				MdmMaster: "P",
				VariantName: sVarname,
				Filter: "",
				CreatedBy: "",
				Flag: "G",
				CreatedOn: null,
				FieldId: "",
				Value: "",
				NavSearch_Variant: []

			};
			oValueModel.create("/Search_VariantSet", oPayload, {

				success: function(oData, response) {
					that.oRangeArray = [];
					that.VarSelected = true;

					var oJsonModel = new sap.ui.model.json.JSONModel();
					var aResults = oData.NavSearch_Variant.results;

					oJsonModel.setData(aResults);

					// // oJsonModel.setData(oData);
					that.getView().setModel(oJsonModel, "JMValueModel");

					var aID = ["SID_STUFE", "SID_STUFE_DES", "SID_STUFE_LEV", "SID_MAGRV", "SID_MAGRV_DES", "id_and", "id_or"];

					var oResultMap = {};
					aResults.forEach(function(oItem) {
						// if ((oItem.FieldId === "SID_MATNRF" || oItem.FieldId === "SID_MATNRT") && oItem.Filter > 0) {
						// 	return;
						// }

						oResultMap[oItem.FieldId] = oItem.Value;
					});

					aID.forEach(function(sControlId) {
						var oControl = that.getView().byId(sControlId);

						if (oControl) {
							var vValue = oResultMap[sControlId];

							// ---- RADIO BUTTON HANDLING ----
							if (sControlId === "id_and" || sControlId === "id_or") {

								if (vValue === "True") {
									oControl.setSelected(true);
								} else {
									oControl.setSelected(false);
								}

							}
							// ---- INPUT OR OTHER CONTROLS ----
							else if (oControl.setValue) {

								if (vValue) {
									oControl.setValue(vValue);
								} else {
									oControl.setValue("");
								}
							}
						}
					});
					// field getting for filter table values

					// var oTableModel = that.getView().getModel("JMMaterialModel");
					// if (!oTableModel) {
					// 	oTableModel = new sap.ui.model.json.JSONModel({
					// 		MatData: []
					// 	});
					// 	that.getView().setModel(oTableModel, "JMMaterialModel");
					// }
					// var FilterData = [];
					// for (var i = 0; i < aResults.length; i++) {
					// 	var item = aResults[i];
					// 	var nextItem = aResults[i + 1];

					// 	// If FieldId is MATNRF and Filter > 0, push to table model
					// 	if (item.FieldId === "SID_MATNRF" && item.Filter > 0) {
					// 		FilterData.push({
					// 			From: item.Value,
					// 			To: (nextItem && nextItem.FieldId === "SID_MATNRT") ? nextItem.Value : "",
					// 			isNew: false
					// 		});
					// 	}
					// }

					// var sMatFrom = that.getView().byId("SID_MATNRF");
					// var sMatTo = that.getView().byId("SID_MATNRT");
					// if (!sMatFrom.getValue() && !sMatTo.getValue()) {
					// 	if (FilterData.length > 0) {
					// 		sMatFrom.setValue(FilterData[0].From);
					// 		sMatTo.setValue(FilterData[0].To);
					// 	}
					// }

					// that.tableData = FilterData;
					// that.getView().getModel("JMMaterialModel").setData({
					// 	MatData: that.tableData
					// });
					// that.tableData.forEach(function(i) {
					// 	// for( var len=0; len < that.tableData.length; len++ ){
					// 	var oOption = "";
					// 	if (i.From && i.To) {
					// 		oOption = "BT";
					// 	}
					// 	if (i.From && !i.To) {
					// 		oOption = "EQ";
					// 	}
					// 	if (!i.From && i.To) {
					// 		oOption = "LT";
					// 	}
					// 	that.oRangeArray.push({

					// 		Low: i.From,
					// 		High: i.To,
					// 		Sign: "I",
					// 		Option: oOption
					// 	});
					// });
					// oTableModel.setData(FilterData);

					// var oButton = that.byId("id_filterButton");
					// var iCurrent = that.tableData.length;
					// var oBadgeCustomData = oButton.getBadgeCustomData();

					// if (oBadgeCustomData) {
					// 	oBadgeCustomData.setValue(iCurrent.toString());
					// }
					// if (that.tableData.length > 0) {
					// 	oButton.removeStyleClass("cl_s_RangeFilterButtonInit");
					// }
					// var oCheckBox = that.getView().byId("SID_DELIND");
					// if (oCheckBox) {
					// 	var oDelIndItem = aResults.find(function(item) {
					// 		return item.FieldId === "SID_DELIND";
					// 	});

					// 	// Set checkbox based on value
					// 	if (oDelIndItem && oDelIndItem.Value === "X") {
					// 		oCheckBox.setSelected(true);
					// 	} else {
					// 		oCheckBox.setSelected(false);
					// 	}
					// }
					that.fnsearch();

					// Set column visibility based on variant
					oTable = that.getView().byId("id_ResultTable");

					aColumns = oTable.getColumns();
					var oVisibleColumns = [];

					aColumns.forEach(function(oCol) {
						var sColId = oCol.getId().split("--").pop();

						// Find matching FieldId in results
						var oMatch = aResults.find(function(oRes) {
							return oRes.FieldId === sColId;

						});

						if (oMatch) {
							oCol.setVisible(oMatch.Value === "X");

							oVisibleColumns.push(sColId);

						} else {

							oCol.setVisible(false);
						}
					});

					that.ColIds = oVisibleColumns;
					oVisibleColumns.forEach(function(index) {
						oSettingsTable.getItems()[index].setSelected(true);
					});
					// 					var aSettingItems = oSettingsTable.getItems();

					// oVisibleColumns.forEach(function(colId) {

					//     // Find matching row using CustomData
					//     var oItem = aSettingItems.find(function(item) {
					//         return item.getCells()[0].getCustomData().some(function(cd) {
					//             return cd.getKey() === "columnId" && cd.getValue() === colId;
					//         });
					//     });

					//     if (oItem) {
					//         oSettingsTable.setSelectedItem(oItem, true);
					//     }
					// });

					that._aLastSelectedHeaders = oVisibleColumns;

				},
				error: function(oError) {
					ErrorHandler.showCustomSnackbar(
						that.getView().getModel(
							"i18n").getResourceBundle().getText("Variant_Fetch_Error"), "Error", that);
				}
			});

		},
		// ******************************************************************************************************************************
		//													Live Change Logic
		//******************************************************************************************************************************* 

		fnLiveChange: function(oEvent) {
			var oInput = oEvent.getSource();
			var fieldId = oInput.getId();
			var vId = fieldId.split("--").pop();
			this.selectedField = vId;
			var vValue = oEvent.getSource().getValue();
			// var vValue = oEvent.getSource().getValue().toUpperCase();
			if (vId.startsWith("SID_STUFE_")) {

				var stufe = vId.split("_")[2];

				if (!this.stufeCache[stufe]) {
					this.fnF4Levelpress(oEvent, true);
					return;
				}

				// 
				this.updateStufeDescription(vId, vValue.toUpperCase(), stufe);

				return;
			}

			// var vValid = this.fnValidateGroupRelation(vId);
			// if (!vValid) {
			// 	return;
			// }
			this.fnReadf4Cache(vId, vValue.toUpperCase(), "P");
			oInput.setValue(vValue);

		},
		//  validation for just one group change
		fnValidateGroupRelation: function(vId) {
			var that = this;
			var PH = this.getView().byId("SID_STUFE").getValue();
			var PH_DES = this.getView().byId("SID_STUFE_DES").getValue();
			var PH_LEV = this.getView().byId("SID_STUFE_LEV").getValue();

			var MG = this.getView().byId("SID_MAGRV").getValue();
			var MG_DES = this.getView().byId("SID_MAGRV_DES").getValue();

			var groupA_Filled = (PH || PH_DES || PH_LEV);
			var groupB_Filled = (MG || MG_DES);

			if (groupA_Filled && groupB_Filled) {
				this.getView().byId(vId).setValue("");

				ErrorHandler.showCustomSnackbar("You can enter either Product Hierarchy or Material Group — not both.", "Warning", that);
				return false;
			}
			this.fnUpdateTableColumnVisibility(groupA_Filled, groupB_Filled);

			return true;

		},
		updateStufeDescription: function(vId, vValue, stufe) {
			var results = this.stufeCache[stufe]; // Data loaded from fnF4Levelpress

			var descField = this.byId(vId + "_DES");
			if (!descField) {
				return;
			}

			// If user cleared the input → clear description also
			if (!vValue) {
				descField.setValue("");
				return;
			}

			if (!results || results.length === 0) {
				descField.setValue("");
				return;
			}

			var match = null;

			// Exact match only
			for (var i = 0; i < results.length; i++) {
				if (results[i].Prodh === vValue) {
					match = results[i];
					break;
				}
			}

			if (match) {
				descField.setValue(match.Vtext);
			} else {
				descField.setValue("");
			}
		},

		// Read the f4 details in the this.f4Cache
		fnReadf4Cache: function(vId, vValue, f4type) {
			var that = this;
			var match;
			var descriptionField;
			var updateDesc = function(results) {
				if (f4type === "P") {
					// Default: match Value1/Value2 as usual

					match = results.find(function(item) {
						return item.Value1 === vValue.toUpperCase();
					});

					if (match) {
						descriptionField = that.getView().byId(that.selectedField + "_DES");
						if (descriptionField) {
							descriptionField.setValue(match.Value2);
						}
						if (that.selectedField === "SID_STUFE") {
							descriptionField = that.getView().byId(that.selectedField + "_LEV");
							if (descriptionField) {
								descriptionField.setValue(match.Value3);
							}
						}
					} else {
						descriptionField = that.getView().byId(that.selectedField + "_DES");
						if (descriptionField) {
							descriptionField.setValue("");
						}
					}
				}
			};
			if (this.f4Cache[vId]) {
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
				Process: "X"
			};
			oPayload.NavSerchResult = [];
			busyDialog.open();
			oModel.create("/SearchHelpSet", oPayload, {
				filters: filter,
				success: function(oData) {
					busyDialog.close();
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
		fnUpdateTableColumnVisibility: function(groupA, groupB) {

			var oView = this.getView();

			var aGroupACols = [
				"idColProdhierno",
				"idColDesc",
				"idColLevelno"
			];

			var aGroupBCols = [
				"idColMatkl",
				"idMatDes"
			];

			var i;

			if (groupA) {

				// Show A, Hide B
				for (i = 0; i < aGroupACols.length; i++) {
					oView.byId(aGroupACols[i]).setVisible(true);
				}

				for (i = 0; i < aGroupBCols.length; i++) {
					oView.byId(aGroupBCols[i]).setVisible(false);
				}

			} else if (groupB) {

				// Show B, Hide A
				for (i = 0; i < aGroupBCols.length; i++) {
					oView.byId(aGroupBCols[i]).setVisible(true);
				}

				for (i = 0; i < aGroupACols.length; i++) {
					oView.byId(aGroupACols[i]).setVisible(false);
				}

			} else {

				// Nothing filled → Show all
				for (i = 0; i < aGroupACols.length; i++) {
					oView.byId(aGroupACols[i]).setVisible(true);
				}

				for (i = 0; i < aGroupBCols.length; i++) {
					oView.byId(aGroupBCols[i]).setVisible(true);
				}
				this.getView().getModel("JM_SEARCH").setData([]);
				this.getView().byId("id_resultcnt").setText("(" + 0 + ")");

			}
		},
		fnsearchByFilter: function(oEvent) {
			var that = this;
			var sValue = oEvent.getParameter("value");

			var oTable = that.getView().byId("id_ResultTable");
			var oBinding = oTable.getBinding("rows");

			if (!sValue) {
				oBinding.filter([]);
				return;
			}

			// create an array with all column
			var aColumns = ["Prodh", "Vtext", "Stufe", "Matkl", "Wgbez"];
			var aFilters = [];

			aColumns.forEach(function(sColumn) {
				aFilters.push(new sap.ui.model.Filter(sColumn, sap.ui.model.FilterOperator.Contains, sValue));
			});

			var oCombinedFilter = new sap.ui.model.Filter({
				filters: aFilters,
				and: false // for or condition
			});

			oBinding.filter([oCombinedFilter]);
			var iRowCount = oBinding.getLength();
			that.getView().byId("id_resultcnt").setText("(" + iRowCount + ")");
		},
		fnDownloadTable: function() {

			var oTable = this.getView().byId("id_ResultTable");
			var oModel = this.getView().getModel("JM_SEARCH");
			var aRows = oModel.getProperty("/");

			if (!aRows || aRows.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("NoDatafound"), "Warning", this);
				return;
			}

			// =============================================
			// 1) Get only visible columns of the table
			// =============================================
			var aColumns = oTable.getColumns();
			var aVisibleColumns = [];

			aColumns.forEach(function(col) {
				if (col.getVisible()) {

					var sHeader = col.getLabel().getText();
					var sProperty = col.getSortProperty() || col.getFilterProperty();

					if (sProperty) {
						aVisibleColumns.push({
							label: sHeader,
							property: sProperty,
							type: EdmType.String
						});
					}
				}
			});

			if (aVisibleColumns.length === 0) {
				ErrorHandler.showCustomSnackbar("No visible columns to export.", "Warning", this);
				return;
			}

			// =============================================
			// 2) Build Spreadsheet settings
			// =============================================
			var oSettings = {
				workbook: {
					columns: aVisibleColumns
				},
				dataSource: aRows,
				fileName: "ProductHier_Search_Results.xlsx"
			};

			// =============================================
			// 3) Export using SAPUI5 Spreadsheet
			// =============================================
			var oSpreadsheet = new Spreadsheet(oSettings);

			oSpreadsheet.build().finally(function() {
				oSpreadsheet.destroy();
			});
		}

		// fnDownloadTable: function() {
		// 	var filename = "ProductHier_Search_Results.xlsx";
		// 	var oTable = this.getView().byId("id_ResultTable");
		// 	var oModel = this.getView().getModel("JM_SEARCH");

		// 	var aRows = oModel.getProperty("/");
		// 	if (!aRows || aRows.length === 0) {
		// 		ErrorHandler.showCustomSnackbar(i18n.getText("NoDatafound"), "Warning", this);
		// 		return;
		// 	}

		// 	// =============================
		// 	// 1) Collect visible columns
		// 	// =============================
		// 	var aColumns = oTable.getColumns();
		// 	var aVisibleColumns = [];

		// 	aColumns.forEach(function(col) {
		// 		if (col.getVisible()) {

		// 			var sHeader = col.getLabel().getText(); // column label
		// 			var sProperty = col.getSortProperty() || col.getFilterProperty(); // model field

		// 			if (sProperty) {
		// 				aVisibleColumns.push({
		// 					header: sHeader,
		// 					property: sProperty
		// 				});
		// 			}
		// 		}
		// 	});

		// 	if (aVisibleColumns.length === 0) {
		// 		ErrorHandler.showCustomSnackbar("No visible columns to export.", "Warning", this);
		// 		return;
		// 	}

		// 	// =============================
		// 	// 2) Build export JSON data
		// 	// =============================
		// 	var aExportData = aRows.map(function(row) {

		// 		var obj = {};
		// 		aVisibleColumns.forEach(function(col) {
		// 			obj[col.header] = row[col.property] || "";
		// 		});
		// 		return obj;
		// 	});

		// 	// =============================
		// 	// 3) Convert to Excel workbook
		// 	// =============================
		// 	// var worksheet = XLSX.utils.json_to_sheet(aExportData);
		// 	// var workbook = XLSX.utils.book_new();
		// 	// XLSX.utils.book_append_sheet(workbook, worksheet, "Result Data");

		// 	// // =============================
		// 	// // 4) Download file
		// 	// // =============================
		// 	// XLSX.writeFile(workbook, "Search_Result.xlsx");
		// 	var worksheet = window.XLSX.utils.json_to_sheet(aExportData);

		// 	var workbook = window.XLSX.utils.book_new();
		// 	window.XLSX.utils.book_append_sheet(workbook, worksheet, "Result Data");

		// 	// Export the file
		// 	window.XLSX.writeFile(workbook, filename);

		// }

	});

});