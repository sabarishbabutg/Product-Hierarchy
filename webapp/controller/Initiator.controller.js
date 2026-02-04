sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"PRDH/controller/ErrorHandler",
	"PRDH/thirdparty/jszip-wrapper"
], function(Controller, ResourceModel, ErrorHandler, JSZip) {
	"use strict";
	var busyDialog = new sap.m.BusyDialog();
	var i18n;
	return Controller.extend("PRDH.controller.Initiator", {

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

			var oTableModel1 = new sap.ui.model.json.JSONModel({
				List: []
			});
			this.getView().setModel(oTableModel1, "JM_DocTypeModel"); // local model for the Attachemnt 

			var oMainModel = new sap.ui.model.json.JSONModel({
				uploadedFileName: ""
			});
			this.getView().setModel(oMainModel); // local modle of attachement name

			this.f4Cache = {};

			// Added by jones on 15.12.2025 (start)
			var oViewModel = new sap.ui.model.json.JSONModel({
				showMatDiv: true
			});
			this.getView().setModel(oViewModel, "viewModel");
			// Added by jones on 15.12.2025 (end)

			this.oRouter = this.getOwnerComponent().getRouter(this);
			this.oRouter.getRoute("Initiator").attachPatternMatched(this.fnRouter, this);
		},

		fnRouter: function() {
			// responsive function logic for controller
			var oVisModel = new sap.ui.model.json.JSONModel({
				labelVisible: true
			});
			this.getView().setModel(oVisModel, "RoadMapUI");
			sap.ui.Device.resize.attachHandler(this.fnResize, this);
			this.fnResize();

			this._liveChangeTimer = null;

			// dynamic viisble the ph data and the TR number visible
			var vValue = {
				phVisible: false,
				trVisible: false,
				dynamicSpanPh: "L3 M12 S12",
				dynamicSpanRb: "L12 M12 S12"
			};
			var oVisibleModel = new sap.ui.model.json.JSONModel(vValue);
			this.getView().setModel(oVisibleModel, "JM_KeyDataVisible");

			var that = this;
			var oKeyDataModel = this.getOwnerComponent().getModel("JM_KEYDATA");
			var wfPramModel = this.getOwnerComponent().getModel("JM_ParmModel");
			var oContextModel = sap.ui.getCore().getModel("JM_ContextModel");
			if (wfPramModel && Object.keys(wfPramModel.getData() || {}).length > 0 ||
				oKeyDataModel && Object.keys(oKeyDataModel.getData() || {}).length > 0 ||
				oContextModel && Object.keys(oContextModel.getData() || {}).length > 0) {
				this.fnSetUsernameModel().then(function(UsernameStatus) {
					if (UsernameStatus) {
						// checking it is from intiator or not
						if (wfPramModel && Object.keys(wfPramModel.getData() || {}).length > 0 && oKeyDataModel && Object.keys(oKeyDataModel.getData() || {})
							.length > 0) {
							this.State = "I";
							this.fnInitializeScreen();
							var vPhValue = oKeyDataModel.getProperty("/ProdHier");
							var vPmgValue = oKeyDataModel.getProperty("/PackMatGrp");
							var vMgValue = oKeyDataModel.getProperty("/MatGrp");
							var oVM = this.getView().getModel("viewModel");
							if (vPhValue === "X") {
								oVM.setProperty("/showMatDiv", true);
								this.byId("id_container").addStyleClass("cl_init_Maincont");
								this.byId("id_container").removeStyleClass("cl_init_maincont_pmg");
								this.byId("id_kdradio").setSelectedIndex(0);
							} else if (vPmgValue === "X") {
								oVM.setProperty("/showMatDiv", false);
								this.byId("id_container").removeStyleClass("cl_init_Maincont");
								this.byId("id_container").addStyleClass("cl_init_maincont_pmg");
								this.byId("id_kdradio").setSelectedIndex(1);
							} else if (vMgValue === "X") {
								oVM.setProperty("/showMatDiv", false);
								this.byId("id_container").removeStyleClass("cl_init_Maincont");
								this.byId("id_container").addStyleClass("cl_init_maincont_pmg");
								this.byId("id_kdradio").setSelectedIndex(2);
							}
							var bProdHier = oKeyDataModel.getProperty("/ProdHier");
							var bPackMatGrp = oKeyDataModel.getProperty("/PackMatGrp");
							var bMatGrp = oKeyDataModel.getProperty("/MatGrp");
							var vMaterialGrp = oKeyDataModel.getProperty("/Mattyp");
							var vMaterialGrpdes = oKeyDataModel.getProperty("/MattypDes");
							var vDivision = oKeyDataModel.getProperty("/Division");
							var vDivisionDesc = oKeyDataModel.getProperty("/DivisionDesc");
							var oKeyDataModeldata = oKeyDataModel.getData();
							var oSelect = this.byId("idSelect");

							if (oKeyDataModeldata.Client === "DEV") {
								oSelect.setSelectedKey("DEV");

							} else if (oKeyDataModeldata.Client === "QAS") {
								oSelect.setSelectedKey("QAS");

							} else {
								oSelect.setSelectedKey("PRD");

							}
							if (oKeyDataModel && Object.keys(oKeyDataModel.getData() || {}).length > 0) {
								if (vPhValue === "X") {
									this.fnIntialfieldSet(vDivision);
								}
							}
							var footerBtnModel = new sap.ui.model.json.JSONModel({
								sendBack: false,
								Reject: false,
								Draft: true,
								submit: true,
								CheckDup: true,
								cancel: true
							});
							this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");
							this.byId("KID_MTART").setValue(vMaterialGrp);
							this.byId("KID_MTART_DES").setValue(vMaterialGrpdes);
							this.byId("KID_SPART").setValue(vDivision); // Added by jones on 15.12.2025 
							this.byId("KID_SPART_DES").setValue(vDivisionDesc); // Added by jones on 15.12.2025 
							// Added by Jones on 15.12.2025 (start)
							if (bMatGrp) {
								var oGridDatacont = this.byId("id_mg_contGrid");
								oGridDatacont.setSpan("L12 M12 S12");
								var oGridInputcont = this.byId("id_mg_InpGrid");
								oGridInputcont.setSpan("L4 M8 S12");
								this.byId("id_matgrp_cont").setVisible(false);
								this.byId("id_prodhier_cont").setVisible(false);
								this.byId("id_image_container").setVisible(false);
								this.byId("id_mg_cont").setVisible(true);
							}
							// Added by Jones on 15.12.2025 (end)
							else if (bProdHier) {
								oGridDatacont = this.byId("id_matgrp_contGrid");
								oGridDatacont.setSpan("L4 M12 S12");
								oGridInputcont = this.byId("id_matgrp_InpGrid");
								oGridInputcont.setSpan("L8 M12 S12");
								this.byId("id_prodhier_cont").setVisible(true);
								this.byId("id_matgrp_cont").setVisible(false);
								this.byId("id_image_container").setVisible(true);
								this.byId("id_mg_cont").setVisible(false);
							} else if (bPackMatGrp) {
								oGridDatacont = this.byId("id_matgrp_contGrid");
								oGridDatacont.setSpan("L12 M12 S12");
								oGridInputcont = this.byId("id_matgrp_InpGrid");
								oGridInputcont.setSpan("L4 M8 S12");
								this.byId("id_image_container").setVisible(false);
								this.byId("id_prodhier_cont").setVisible(false);
								this.byId("id_matgrp_cont").setVisible(true);
								this.byId("id_mg_cont").setVisible(false);
							}
							var vVisibilitydata = {
								visible: true,
								AdvanceSearch: false,
								RoadMapVisible: true
							};
							var oVisibleModel = new sap.ui.model.json.JSONModel(vVisibilitydata);
							this.getView().setModel(oVisibleModel, "JMVboxVisibilityModel");
							if (bProdHier) {
								var vModel = this.getOwnerComponent().getModel("JM_PRODHIER");
								vModel.read("/PH_LevelDescSet", {
									success: function(oData) {
										var oLevelMap = {};
										oData.results.forEach(function(oItem) {
											oLevelMap[oItem.LevelNo] = oItem.Description;
										});
										var oJsonModel = new sap.ui.model.json.JSONModel(oLevelMap);
										that.getView().setModel(oJsonModel, "JM_LevelDesc");
									},
									error: function() {

									}
								});
							}
							return;
						}
						// for uwl dashbard this logic will work
						if (oContextModel && Object.keys(oContextModel.getData() || {}).length > 0) {
							var oContextModeldata = oContextModel.getData();
							var oData = oContextModel.getData();
							this.fnInitializeScreen();
							if (oData.Ind === "T") {
								footerBtnModel = new sap.ui.model.json.JSONModel({
									sendBack: false,
									Reject: false,
									Draft: false,
									submit: false,
									CheckDup: true,
									cancel: false
								});
								this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");

							} else {
								if (oData.Ind === "I" || oData.Ind === "D") {
									footerBtnModel = new sap.ui.model.json.JSONModel({
										sendBack: false,
										Reject: false,
										Draft: false,
										submit: true,
										CheckDup: true,
										cancel: false
									});
									this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");
								} else {
									footerBtnModel = new sap.ui.model.json.JSONModel({
										sendBack: true,
										Reject: true,
										Draft: false,
										submit: true,
										CheckDup: true,
										cancel: false
									});
									this.getView().setModel(footerBtnModel, "JM_FooterBtnModel");
								}
							}
							var aProdFields = [
								"SID_STUFE_1", "SID_STUFE_1_des", "SID_STUFE_1_hier",
								"SID_STUFE_2", "SID_STUFE_2_des", "SID_STUFE_2_hier",
								"SID_STUFE_3", "SID_STUFE_3_des", "SID_STUFE_3_hier",
								"SID_STUFE_4", "SID_STUFE_4_des", "SID_STUFE_4_hier",
								"SID_STUFE_5", "SID_STUFE_5_des", "SID_STUFE_5_hier",
								"SID_STUFE_6", "SID_STUFE_6_des", "SID_STUFE_6_hier",
								"SID_STUFE_7", "SID_STUFE_7_des", "SID_STUFE_7_hier"
							];
							for (var i = 0; i < aProdFields.length; i++) {
								var oField = this.byId(aProdFields[i]);
								if (oField) {
									if (aProdFields[i].includes("_hier")) {
										oField.setEditable(false);
									} else {
										oField.setEditable(true);
									}
								}
							}
							var appid = oData.Appid;
							var transId = oData.Transid;
							// var ind = oData.Ind;
							// var msgType = oData.MsgType;
							var wiId = oData.WiId;
							// var level = oData.Level;
							// var sendBack = oData.Sendback;
							this.Transid = transId;
							this.workId = wiId;
							this.AppId = appid;
							this.level = oData.Level;
							var oPayload = {
								AppId: appid,
								Transid: transId,
								Client: "",
								Ind: "G",
								WiId: wiId,
								NavPHItems: [],
								NavPHComments: [],
								NavPHAttachments: []
							};
							this.fnDataGetFromBackend(oPayload, oContextModeldata);
						}
					}
				}.bind(this));
			} else {
				// this.fnDeqeueTrans();
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("search");
			}
		},

		fnDataGetFromBackend: function(oPayload, oContextModeldata) {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			busyDialog.open();
			oModel.create("/Product_KeyDataSet", oPayload, {
				success: function(oData) {
					busyDialog.close();
					if (oData.Msgtype !== "E") {
						that.vDescEdit = oData.Msgtype;
						that.fnsetTrphState(oData);
						var desc = oData.Description;
						if (desc) {
							that.getView().byId("ID_DES").setValue(desc);
						}
						var item = oData.NavPHItems.results[0];
						var highestFilled = 0;
						for (var i = 1; i <= 7; i++) {
							var levelVal = item["Level" + i] || "";
							var descVal = item["Vtext" + i] || "";
							var status = item["Status" + i];
							var indVal = that.getIndicatorStatus(status);
							var idCode = "SID_STUFE_" + i;
							var idDesc = "SID_STUFE_" + i + "_des";
							var idHier = "SID_STUFE_" + i + "_hier";
							var oCodeField = that.byId(idCode);
							var oDescField = that.byId(idDesc);
							if (levelVal) {
								highestFilled = i;
								that.updateIndicator(
									"SID_STUFE_" + i + "_IND", // HBox
									"SID_STUFE_" + i + "_BTN", // Button
									"SID_STUFE_" + i + "_des",
									indVal // available / new / change / clear
								);
								// Set code and description
								if (oCodeField) {
									oCodeField.setValue(levelVal);
									if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
										oCodeField.setEditable(false);
									}
								}
								if (oDescField) {
									oDescField.setValue(descVal);
									if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
										oDescField.setEditable(false);
									}
								}
								// Build hierarchy
								var hier = "";
								for (var j = 1; j <= i; j++) {
									hier += (item["Level" + j] || "");
								}

								var oHier = that.byId(idHier);
								if (oHier) {
									oHier.setValue(hier);
									if (oContextModeldata.Ind === "T") {
										oHier.setEditable(false);
									}
								}
							} else {
								that.updateIndicator(
									"SID_STUFE_" + i + "_IND", // HBox
									"SID_STUFE_" + i + "_BTN", // Button
									"SID_STUFE_" + i + "_des",
									"clear" // available / new / change / clear
								);
							}
							// IDs
						}
						var nextLevel = highestFilled + 1;

						if (nextLevel <= 7) {
							var nextCode = that.byId("SID_STUFE_" + nextLevel);
							var nextDesc = that.byId("SID_STUFE_" + nextLevel + "_des");

							if (nextCode) {
								nextCode.setEditable(true);
							}
							if (nextDesc) {
								nextDesc.setEditable(true);
							}
						}
						if (item["Status1P"]) {
							status = item["Status1P"];
							indVal = that.getIndicatorStatus(status);
							that.updateIndicator(
								"SID_MAGRV_IND", // HBox
								"SID_MAGRV_BTN", // Button
								"SID_MAGRV_des",
								indVal // available / new / change / clear
							);
						} else if (item["Status1M"]) {
							status = item["Status1M"];
							indVal = that.getIndicatorStatus(status);
							that.updateIndicator(
								"ID_PH_MATKL_IND", // HBox
								"ID_PH_MATKL_BTN", // Button
								"ID_PH_MATKL_des",
								indVal // available / new / change / clear
							);
						}
						var phInd = oData.Phind || ""; // Product Hierarchy indicator
						var mgInd = oData.Pmgind || ""; // Packaging Material Group indicator
						var vMatGrpInd = oData.Mgind || ""; // Material Group Indicator // Added by Jones on 16.12.2025

						// Radiobutton selection logic (start) 
						// Prodhier radio
						var oView = that.getView();
						var oVM = oView.getModel("viewModel");

						if (!oVM) {
							oVM = new sap.ui.model.json.JSONModel({});
							oView.setModel(oVM, "viewModel");
						}
						if (phInd === "X") {
							that.byId("id_kdradio").setSelectedIndex(0);
							oVM.setProperty("/showMatDiv", true);
						} else if (mgInd === "X") {
							that.byId("id_kdradio").setSelectedIndex(1);
							oVM.setProperty("/showMatDiv", false);
						} else if (vMatGrpInd === "X") {
							that.byId("id_kdradio").setSelectedIndex(2);
							oVM.setProperty("/showMatDiv", false);
						}
						// Radiobutton selection logic (end) 
						var mtart = oData.Mtart || "";
						var mtbez = oData.Mtbez || "";
						var vSpart = oData.Spart || ""; // Added by Jones on 16.12.2025
						var vSpartDesc = oData.SpartDesc || ""; // Added by Jones on 16.12.2025

						// Set MTART
						var oMtart = that.byId("KID_MTART");
						if (oMtart) {
							oMtart.setValue(mtart);
						}

						// Set MTART Description
						var oMtartDes = that.byId("KID_MTART_DES");
						if (oMtartDes) {
							oMtartDes.setValue(mtbez);
							if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
								oMtartDes.setEditable(false);
							}
						}
						// Added by Jones on 16.12.2025 (start)
						// Set Spart 
						var oSpart = that.byId("KID_SPART");
						if (oSpart) {
							oSpart.setValue(vSpart);
						}
						// Set SPART Description
						var oSpartDes = that.byId("KID_SPART_DES");
						if (oSpartDes) {
							oSpartDes.setValue(vSpartDesc);
							if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
								oSpartDes.setEditable(false);
							}
						}
						// Added by Jones on 16.12.2025 (end)

						var packmatgrp = oData.NavPHItems.results[0].Magrv;
						var packmatgrpdes = oData.NavPHItems.results[0].Bezei;
						if (packmatgrp) {
							var oWerks = that.byId("SID_MAGRV");
							if (oWerks) {
								oWerks.setValue(packmatgrp);
								if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
									oWerks.setEditable(false);
								}
							}
						}

						// Pack Mat Group - Description
						if (packmatgrpdes) {
							var oWerksDes = that.byId("SID_MAGRV_des");
							if (oWerksDes) {

								oWerksDes.setValue(packmatgrpdes);
								if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
									oWerksDes.setEditable(false);
								}
							}
						}
						// Added by Jones on 16.12.2025 (start)
						var vMatGrpValue = oData.NavPHItems.results[0].Matkl;
						var vMatGrpDesc = oData.NavPHItems.results[0].Wgbez;
						if (vMatGrpValue) {
							var oMatgrp = that.byId("ID_PH_MATKL");
							if (oMatgrp) {
								oMatgrp.setValue(vMatGrpValue);
								if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
									oMatgrp.setEditable(false);
								}
							}
						}

						//  Mat Group - Description
						if (vMatGrpDesc) {
							var oMatgrpDes = that.byId("ID_PH_MATKL_des");
							if (oMatgrpDes) {
								oMatgrpDes.setValue(vMatGrpDesc);
								if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
									oMatgrpDes.setEditable(false);
								}
							}
						}

						//  Description
						if (desc) {
							var ovDesc = that.byId("ID_DES");
							var oVDescCnt = that.byId("ID_DES_CNT");
							if (ovDesc) {
								ovDesc.setValue(desc);
								oVDescCnt.setValue(desc.length);
								if (oContextModeldata.Ind === "T" || oContextModeldata.Level === "R") {
									ovDesc.setEditable(false);
								}
							}
						}

						// Added by Jones on 16.12.2025 (End)
						var oCommentBox = that.getView().byId("id_commentbox");

						// Added by Jones on 16.12.2025 (start)
						if (vMatGrpInd) {
							var oGridDatacont = that.byId("id_mg_contGrid");
							oGridDatacont.setSpan("L12 M12 S12");
							var oGridInputcont = that.byId("id_mg_InpGrid");
							oGridInputcont.setSpan("L4 M8 S12");
							that.byId("id_matgrp_cont").setVisible(false);
							that.byId("id_prodhier_cont").setVisible(false);
							that.byId("id_image_container").setVisible(false);
							that.byId("id_mg_cont").setVisible(true);
						}
						// Added by Jones on 16.12.2025 (end)
						else if (phInd) {
							oGridDatacont = that.byId("id_matgrp_contGrid");
							oGridDatacont.setSpan("L4 M12 S12");
							oGridInputcont = that.byId("id_matgrp_InpGrid");
							oGridInputcont.setSpan("L8 M12 S12");
							that.byId("id_prodhier_cont").setVisible(true);
							that.byId("id_matgrp_cont").setVisible(false);
							that.byId("id_image_container").setVisible(true);
							that.byId("id_mg_cont").setVisible(false); // Added by Jones on 16.12.2025

							// if (bProdHier) {
							var vModel = that.getOwnerComponent().getModel("JM_PRODHIER");
							vModel.read("/PH_LevelDescSet", {
								success: function(oData) {
									var oLevelMap = {};
									oData.results.forEach(function(oItem) {
										oLevelMap[oItem.LevelNo] = oItem.Description;
									});
									var oJsonModel = new sap.ui.model.json.JSONModel(oLevelMap);
									that.getView().setModel(oJsonModel, "JM_LevelDesc");
								},
								error: function() {

								}
							});
							// }
						} else if (mgInd) {
							oGridDatacont = that.byId("id_matgrp_contGrid");
							oGridDatacont.setSpan("L12 M12 S12");
							oGridInputcont = that.byId("id_matgrp_InpGrid");
							oGridInputcont.setSpan("L4 M8 S12");
							that.byId("id_image_container").setVisible(false);
							that.byId("id_prodhier_cont").setVisible(false);
							that.byId("id_matgrp_cont").setVisible(true);
							that.byId("id_mg_cont").setVisible(false); // Added by Jones on 16.12.2025
						}
						that.fnBindComments(oData.NavPHComments.results, oCommentBox);
						that.fnBindAttachements(oData);
						that.fninitOldValues();
						that.fnLoadModelInitalData();
						var sendback = sap.ui.getCore().getModel("JM_ContextModel").getProperty("/Sendback");
						if (sendback === "X") {
							that.getView().getModel("JM_FooterBtnModel").setProperty("/sendBack", false);
							that.getView().getModel("JM_FooterBtnModel").refresh(true);
						}
						var Client = oData.Client;
						if (Client) {
							that.byId("idSelect").setSelectedKey(Client);
						}
					} else if (oData.Msgtype === "E") {
						ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},

		fnSetUsernameModel: function() {
			return new Promise(function(Resolve, Reject) {
				var oUserModel = this.getOwnerComponent().getModel("JM_CONFIG");
				oUserModel.read("/UsernameSet", {
					success: function(oData) {
						var oJsonModel = new sap.ui.model.json.JSONModel();
						oJsonModel.setData(oData.results[0]);
						this.getView().setModel(oJsonModel, "JM_UserModel");
						this.User = oData.results[0].Agent;
						Resolve(true);
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
		//		Function for to initilize screen
		// *-------------------------------------------------------------------------------------
		fnInitializeScreen: function() {
			var oView = this.getView();
			var oCtx = sap.ui.getCore().getModel("JM_ContextModel");
			var ctxData;
			if (oCtx) {
				ctxData = oCtx.getData();
				var state = ctxData.Level;
				var tranid = ctxData.Transid;
				var AppId = ctxData.Appid;
				var SendBack = ctxData.Sendback;
				var Progress = ctxData.Progress;
			} else {
				var oKeyDataModel = this.getOwnerComponent().getModel("JM_KEYDATA");
				var vPhValue = oKeyDataModel.getProperty("/ProdHier");
				var vPmgValue = oKeyDataModel.getProperty("/PackMatGrp");
				var vMgValue = oKeyDataModel.getProperty("/MatGrp");
				// var AppId;
				if (vPhValue === "X") {
					AppId = "PHC";
				} else if (vPmgValue === "X") {
					AppId = "PM";
				} else if (vMgValue === "X") {
					AppId = "MG";
				}
			}
			this.fnRefreshRoadMap();
			// -------------------------------------------------------------
			//  Helper function for building Page Title
			// -------------------------------------------------------------
			var getBaseTitle = function() {
				if (AppId === "PHC") {
					return "MDM : Product Hierarchy";
				} else if (AppId === "PM") {
					return "MDM : Package Material Group ";
				} else if (AppId === "MG") {
					return "MDM : Material Group";
				}
			};
			var getStatusTitle = function() {
				if (state === "R" && SendBack !== "X") {
					return "- Reviewer - " + tranid;
				}
				if (state === "A" && SendBack !== "X") {
					return "- Approver - " + tranid;
				}
				if (SendBack === "X") {
					return "- Send Back Record - " + tranid;
				}
				return "";
			};
			var getInitiatorTitle = function() {
				if (state !== "I") {
					return "";
				}
				if (Progress === "Complete") {
					return "- Completed Record - " + tranid;
				}
				if (Progress === "Inprogress") {
					return "- Inprogress Record - " + tranid;
				}
				if (Progress === "Draft") {
					return "- Drafted Record - " + tranid;
				}
				if (Progress === "SendBack" || SendBack === "X") {
					return "- Send Back Record - " + tranid;
				}
				if (Progress === "Reject") {
					return "- Rejected Record - " + tranid;
				}
				return " - Initiator ";
			};

			// -------------------------------------------------------------
			//  Initial Load (No ContextModel Data)
			// -------------------------------------------------------------
			if (!ctxData || Object.keys(ctxData).length === 0) {
				oView.byId("id_initiator").addItem(this.fnCreateRoadMapwithHighlight("Initiator"));
				oView.byId("id_reviewer").addItem(this.fnCreateRoadMapwihoutHighlight("Reviewer"));
				oView.byId("id_approver").addItem(this.fnCreateRoadMapwihoutHighlight("Approver"));
				var title = getBaseTitle();
				state = "I";
				title += getInitiatorTitle();
				title += getStatusTitle();
				oView.byId("id_title").setText(title);
				return;
			} else {
				// -------------------------------------------------------------
				//  Common Roadmap Setup
				// -------------------------------------------------------------
				var isInitiator = state === "I";
				var isReviewer = state === "R";
				var isApprover = state === "A";
				oView.byId("id_initiator").addItem(
					isInitiator ? this.fnCreateRoadMapwithHighlight("Initiator") : this.fnCreateRoadMapwihoutHighlight("Initiator")
				);
				oView.byId("id_reviewer").addItem(
					isReviewer ? this.fnCreateRoadMapwithHighlight("Reviewer") : this.fnCreateRoadMapwihoutHighlight("Reviewer")
				);
				oView.byId("id_approver").addItem(
					isApprover ? this.fnCreateRoadMapwithHighlight("Approver") : this.fnCreateRoadMapwihoutHighlight("Approver")
				);

				// -------------------------------------------------------------
				//  Button Adjustments
				// -------------------------------------------------------------
				if (isApprover) {
					oView.byId("id_saveDraft").setVisible(false);
					oView.byId("id_submit").setText("Approve").setWidth("6rem");
				} else if (isReviewer) {
					oView.byId("id_saveDraft").setVisible(false);
					oView.byId("id_submit").setText("Submit");
				} else if (isInitiator) {
					oView.byId("id_submit").setText("Submit");
				}

				// -------------------------------------------------------------
				//  Title Calculation
				// -------------------------------------------------------------
				title = getBaseTitle();
				if (isInitiator) {
					title += getInitiatorTitle();
				} else {
					title += getStatusTitle();
				}
				oView.byId("id_title").setText(title);
			}
		},

		fnRefreshRoadMap: function() {
			var reviewerRoadmapBox = this.getView().byId("id_reviewer");
			if (reviewerRoadmapBox) {
				reviewerRoadmapBox.destroyItems();
			}
			var ApproverRoadMapBox = this.getView().byId("id_approver");
			if (ApproverRoadMapBox) {
				ApproverRoadMapBox.destroyItems();
			}
			var InitiatorRoadMapBox = this.getView().byId("id_initiator");
			if (InitiatorRoadMapBox) {
				InitiatorRoadMapBox.destroyItems();
			}
		},

		fnCreateRoadMapwithHighlight: function(text) {

			var image = text;
			if (text === "PH Initiator") {
				image = "Initiator";

			}
			var oImageModel = this.getView().getModel("JM_ImageModel");
			var sBasePath = oImageModel.getProperty("/path");
			var sImg = image;
			var sSrc = sBasePath + sImg + ".svg";

			var oHBox = new sap.m.HBox({
				alignItems: "Center",
				justifyContent: "Center",
				items: [
					new sap.m.HBox({
						id: "id_roadmapHighlighter", // added by sabarish 20.11.2025
						alignItems: "Center",
						justifyContent: "Center",
						items: [
							new sap.m.Image({
								src: sSrc,
								tooltip: text
							}).addStyleClass("cl_ImageTopAlign_roadMap sapUiTinyMarginEnd"),
							new sap.m.Label({
								text: text,
								visible: "{RoadMapUI>/labelVisible}"
							}).addStyleClass("cl_HighlightText_roadMap")
						]
					}).addStyleClass("cl_Highlightborder_roadMap")
				]
			});
			return oHBox;
		},

		fnCreateRoadMapwihoutHighlight: function(text) {
			var image = text;
			var oImageModel = this.getView().getModel("JM_ImageModel");
			var sBasePath = oImageModel.getProperty("/path");
			var sImg = image;
			var sSrc = sBasePath + sImg + ".svg";
			var oHBox = new sap.m.HBox({
				alignItems: "Center",
				justifyContent: "Center",
				items: [
					new sap.m.Image({
						src: sSrc,
						tooltip: text
					}).addStyleClass("cl_ImageTopAlign_roadMap sapUiTinyMarginEnd"),
					new sap.m.Label({
						text: text,
						visible: "{RoadMapUI>/labelVisible}" // added by sabarish 20.11.2025
					}).addStyleClass("cl_textStyle_roadMap")
				]
			});
			return oHBox;
		},

		fninitOldValues: function() {
			var aFields = [
				"SID_MAGRV", "SID_MAGRV_des",
				"SID_STUFE_1", "SID_STUFE_1_des",
				"SID_STUFE_2", "SID_STUFE_2_des",
				"SID_STUFE_3", "SID_STUFE_3_des",
				"SID_STUFE_4", "SID_STUFE_4_des",
				"SID_STUFE_5", "SID_STUFE_5_des",
				"SID_STUFE_6", "SID_STUFE_6_des",
				"SID_STUFE_7", "SID_STUFE_7_des"
			];

			for (var i = 0; i < aFields.length; i++) {
				var oField = this.byId(aFields[i]);
				if (oField) {
					oField._oldValue = oField.getValue(); // Store backend value
					oField._oldValueStored = true; // Mark as stored
				}
			}
		},

		fnLoadModelInitalData: function() {
			var oData = {};
			var aFields = [
				"SID_MAGRV", "SID_MAGRV_des",
				"SID_STUFE_1", "SID_STUFE_1_des", "SID_STUFE_1_BTN",
				"SID_STUFE_2", "SID_STUFE_2_des", "SID_STUFE_2_BTN",
				"SID_STUFE_3", "SID_STUFE_3_des", "SID_STUFE_3_BTN",
				"SID_STUFE_4", "SID_STUFE_4_des", "SID_STUFE_4_BTN",
				"SID_STUFE_5", "SID_STUFE_5_des", "SID_STUFE_5_BTN",
				"SID_STUFE_6", "SID_STUFE_6_des", "SID_STUFE_6_BTN",
				"SID_STUFE_7", "SID_STUFE_7_des", "SID_STUFE_7_BTN"
			];
			for (var i = 0; i < aFields.length; i++) {
				var fieldId = aFields[i];
				var oControl = this.getView().byId(fieldId);

				if (oControl) {
					if (oControl.getValue) {
						oData[fieldId] = oControl.getValue();
					} else if (oControl.getText) {
						oData[fieldId] = oControl.getText();
					} else if (oControl.getSelectedKey) {
						oData[fieldId] = oControl.getSelectedKey();
					}
				}
			}

			var oModel = new sap.ui.model.json.JSONModel(oData);
			this.getView().setModel(oModel, "JM_InitialDataModel");
		},

		// added by sabarish 24-12-2025
		fnsetTrphState: function(odata) {
			var pHItem = odata.NavPHItems.results[0];
			var string = pHItem.Hier7;
			var model;
			var imageModel = this.getView().getModel("JM_ImageModel");
			if (odata.AppId === "MG" || odata.AppId === "PM") {
				model = this.getView().getModel("JM_KeyDataVisible");
				if (odata.TrNum !== "") {
					// this.getView().byId("id_dynamicTrvbox").setVisible(false);
					this.getView().byId("id_container").removeStyleClass("cl_init_Maincont");
					this.getView().byId("id_container").addStyleClass("cl_init_MaincontSS");
					model.setProperty("/dynamicSpanRb", "L9 M12 S12");
					model.setProperty("/trVisible", true);
					model.setProperty("/TrValue", odata.TrNum);
					if (odata.Ind === "X") {
						model.setProperty("/StatusText", "Success");
						this.getView().byId("id_tr_ind").removeStyleClass("cl_Tr_IndicatorR");
						this.getView().byId("id_tr_ind").addStyleClass("cl_Tr_IndicatorS");
						model.setProperty("/StatusImage", imageModel.getProperty("/path") + "NodesGrn.svg");
						model.setProperty("/StatusTooltip", odata.Message);
					} else {
						model.setProperty("/StatusText", "Error");
						this.getView().byId("id_tr_ind").removeStyleClass("cl_Tr_IndicatorS");
						this.getView().byId("id_tr_ind").addStyleClass("cl_Tr_IndicatorR");
						model.setProperty("/StatusImage", imageModel.getProperty("/path") + "NodesRed.svg");
						model.setProperty("/StatusTooltip", odata.Message);
					}
				}
			} else {
				if (string !== "") {
					model = this.getView().getModel("JM_KeyDataVisible");
					if (model) {
						model.setProperty("/dynamicSpanRb", "L9 M12 S12");
						model.setProperty("/phVisible", true);
						model.setProperty("/phValue", string);
						model.setProperty("/phValueLength", string.length);
					}
				}
				if (odata.TrNum !== "") {
					model.setProperty("/trVisible", true);
					model.setProperty("/TrValue", odata.TrNum);
					// this.getView().byId("id_dynamicTrvbox").setVisible(false);
					if (odata.Ind === "X") {
						model.setProperty("/StatusText", "Success");
						this.getView().byId("id_tr_ind").removeStyleClass("cl_Tr_IndicatorR");
						this.getView().byId("id_tr_ind").addStyleClass("cl_Tr_IndicatorS");
						model.setProperty("/StatusImage", imageModel.getProperty("/path") + "NodesGrn.svg");
						model.setProperty("/StatusTooltip", odata.Message);
					} else {
						model.setProperty("/StatusText", "Error");
						this.getView().byId("id_tr_ind").removeStyleClass("cl_Tr_IndicatorS");
						this.getView().byId("id_tr_ind").addStyleClass("cl_Tr_IndicatorR");
						model.setProperty("/StatusImage", imageModel.getProperty("/path") + "NodesRed.svg");
						model.setProperty("/StatusTooltip", odata.Message);
					}
				}
			}
		},
		// added by sabarish 29-12-2025
		fnIntialfieldSet: function(div) {
			var that = this;
			var sitem = "SID_STUFE_1";
			var vcurrenthier = this.getView().byId(sitem + "_hier").getValue();
			var vPayload = {};
			var aParts = sitem.split("_"); // ["SID", "STUFE", "1"]
			var fieldname = parseInt(aParts[2]);
			var vLevel1 = this.getView().byId("SID_STUFE_1").getValue();
			// var vLevel1 = this.getView().byId("SID_STUFE_1").getValue();
			var vLevel2 = this.getView().byId("SID_STUFE_2").getValue();
			var vLevel3 = this.getView().byId("SID_STUFE_3").getValue();
			var vLevel4 = this.getView().byId("SID_STUFE_4").getValue();
			var vLevel5 = this.getView().byId("SID_STUFE_5").getValue();
			var vLevel6 = this.getView().byId("SID_STUFE_6").getValue();
			var vLevel7 = this.getView().byId("SID_STUFE_7").getValue();
			var aNavItems = [{
				Level1: vLevel1,
				Level2: vLevel2,
				Level3: vLevel3,
				Level4: vLevel4,
				Level5: vLevel5,
				Level6: vLevel6,
				Level7: vLevel7

			}];
			vPayload = {
				AppId: "PHC",
				Ind: "L",
				Lvlind: "L" + fieldname,
				Spart: div,
				NavPHSearchHelp: [],
				NavPHItems: aNavItems

			};
			var vValueId = "SID_STUFE_" + fieldname;
			var descId = "SID_STUFE_" + fieldname + "_des";
			var hboxId = "SID_STUFE_" + fieldname + "_IND";
			var btnId = "SID_STUFE_" + fieldname + "_BTN";
			var hierId = "SID_STUFE_" + fieldname + "_hier";
			var vModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			vModel.create("/Product_KeyDataSet", vPayload, {
				success: function(oData) {
					busyDialog.close();
					var aResults = oData.NavPHSearchHelp.results;
					that.vDescEdit = oData.Msgtype;
					if (aResults.length === 1) {
						if (that.vDescEdit === "C") {
							that.getView().byId(descId).setEditable(true);
						} else {
							that.getView().byId(descId).setEditable(false);
						}
						that.getView().byId(vValueId).setValue(aResults[0].Value1);
						that.getView().byId(descId).setValue(aResults[0].Value2);
						that.getView().byId(hierId).setValue(vcurrenthier + aResults[0].Value1);
						that.selectedField = "SID_STUFE_1";
						that.fnLevelValidation().then(function(Status) {
							if (Status) {
								that._getNextLevelFields(aResults[0].Value1, 1).then(function(levelStats) {
									if (levelStats) {
										var nextId = "SID_STUFE_" + (that.lastLevelIndex);
										var nextDesId = "SID_STUFE_" + (that.lastLevelIndex) + "_des";
										// if (nextDesId && nextId) {
										if (that.getView().byId(nextId)) {
											that.getView().byId(nextId).setEditable(true);
											if (this.vDescEdit === "C") {
												that.getView().byId(nextDesId).setEditable(true);
											} else {
												that.getView().byId(nextDesId).setEditable(false);
											}
											that.updateIndicator(hboxId, btnId, descId, true);
										}
									}
									// }
								}.bind(that));
							}
						}.bind(that));
					} else {
						that.getView().byId(descId).setEditable(false);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
				}
			});
		},

		// *-------------------------------------------------------------------------------------
		//		Function for to bind the comments and attachemnts
		// *-------------------------------------------------------------------------------------
		fnBindComments: function(backendData, container) {
			var that = this;

			for (var c = 0; c < backendData.length; c++) {
				// Create the dot indicator and line logic VBox
				var Pos1 = (backendData[c].Pos === "") ? true : false;
				var Pos2 = (backendData[c].Pos === "Last") ? true : false;
				var oDotVBox = new sap.m.VBox({
					alignContent: "Start",
					alignItems: "Center",
					justifyContent: "Start",
					items: [
						new sap.m.Image({
							src: that.getView().getModel("JM_ImageModel").getProperty("/path") + "CommentDot.svg",
							width: "0.4rem"
						}),
						new sap.m.HBox({
							visible: Pos1
						}),
						new sap.m.HBox({
							visible: Pos2
						})
					]
				}).addStyleClass("sapUiTinyMarginBegin");
				// Create the right side (profile + comment)
				var oRightVBox = new sap.m.VBox({
					items: [
						new sap.m.HBox({
							items: [
								new sap.m.Image({
									src: that.getView().getModel("JM_ImageModel").getProperty("/path") + "profile.svg",
									width: "1.5rem"
								}).addStyleClass("sapUiTinyMarginBeginEnd"),
								new sap.m.Text({
									text: backendData[c].CreatedBy
								}).addStyleClass("cl_comm_nam"),
								new sap.m.Text({
									text: "Added A Comment"
								}).addStyleClass("sapUiTinyMarginBeginEnd cl_comm_subtx"),
								new sap.m.Image({
									src: that.getView().getModel("JM_ImageModel").getProperty("/path") + "dot_c2.svg",
									width: "0.4rem"
								}),
								new sap.m.Text({
									text: backendData[c].CrtdDate + " - " + backendData[c].CrtdTime
								}).addStyleClass("sapUiTinyMarginBeginEnd cl_comm_date")
							]
						}),
						new sap.m.Panel({
							// width: "10%",
							content: [
								new sap.m.Text({
									text: backendData[c].Comments,
									wrapping: true,
									width: "100%"
								}).addStyleClass("cl_cmt_txt")
							]
						}).addStyleClass("cl_cmmt_bx sapUiTinyMarginBegin sapUiSmallMarginBottom")
					]
				});

				// Combine left and right side into HBox
				var oCommentCard = new sap.m.HBox({
					width: "45%",
					items: [oDotVBox, oRightVBox]
				}).addStyleClass("cl_commt_hbx sapUiSmallMarginTop");

				// Add to container
				container.addItem(oCommentCard);
			}
		},

		fnBindAttachements: function(oData) {
			var vAttachmentDataArray = [];
			for (var b = 0; b < oData.NavPHAttachments.results.length; b++) {
				var serial = Number(oData.NavPHAttachments.results[b].SerialNo);
				var vObj = {
					"AttachmentNo": serial,
					"TagName": oData.NavPHAttachments.results[b].FileName,
					"DocType": oData.NavPHAttachments.results[b].FileName.split('.')[1],
					"Xstring": oData.NavPHAttachments.results[b].Xstring,
					"MimeType": oData.NavPHAttachments.results[b].MimeType,
					"Username": oData.NavPHAttachments.results[b].Username,
					"Size": oData.NavPHAttachments.results[b].FileSize,
					"CreatedOn": oData.NavPHAttachments.results[b].CreatedOn,
					"CreatedBy": oData.NavPHAttachments.results[b].CreatedBy
				};
				vAttachmentDataArray.push(vObj);
			}

			// var oJsonList2 = new sap.ui.model.json.JSONModel();
			var oJsonList2 = new sap.ui.model.json.JSONModel({
				List: vAttachmentDataArray
			});

			this.attachments = oData.NavPHAttachments.results;

			// oJsonList2.setData(vAttachmentDataArray);
			this.getView().setModel(oJsonList2, "JM_DocTypeModel");
		},

		// *-------------------------------------------------------------------------------------
		//		Function for Live change logic
		// *-------------------------------------------------------------------------------------
		_PkgMatGrpLivechange: function(oSrc, vValue) {
			var val = vValue.toUpperCase();
			oSrc.setValue(val);
			// var maxLength = oSrc.getMaxLength();
			var oIndicatorBtn = this.byId("SID_MAGRV_BTN");
			var sIndicatorText = oIndicatorBtn.getText();

			// Store old value if not already stored or update it before clearing
			if (!oSrc._oldValueStored) {
				oSrc._oldValue = val || "";
				oSrc._oldValueStored = true;
			} else if (!(sIndicatorText === "Available" || sIndicatorText === "Change")) {
				// update _oldValue only if we are not in a clear pending state
				oSrc._oldValue = val;
			}
			if (!val) {
				this.byId("SID_MAGRV_des").setValue("");
				this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "clear");
				return;
			}
			// If value exists and indicator shows Available/Change, Popup
			if (oSrc._oldValue && (sIndicatorText === "Available" || sIndicatorText === "Change")) {
				this._levelToClear = "MAGRV";
				this._sourceField = oSrc;
				this.fnOpenMessageClrAll("Do you want to clear Pack Material Group fields?", "S");
				return;
			}
			var id = "SID_MAGRV";

			clearTimeout(this._liveChangeTimer);
			this._liveChangeTimer = setTimeout(function() {
				// this.fnReadf4Cache("SID_MAGRV", val, "P");
				if (this.f4Cache[id]) {
					var rows = this.f4Cache[id].rows;
					var found = false;
					var vDesc;
					for (var m = 0; m < rows.length; m++) {
						if (rows[m].Value1 === val || rows[m].Value2 === val || rows[m].col1 === val || rows[m].col2 === val) {
							vDesc = rows[m].Value2 ? rows[m].Value2 : rows[m].col2;
							this.byId("SID_MAGRV_des").setValue(vDesc);
							this.byId("SID_MAGRV_des").setValueState("None");
							this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", true);
							found = true;
							break;
						}
					}
					if (!found) {
						this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "new");
					}

					this._ValidationPMG();
				} else {
					this._GetF4data("SID_MAGRV").then(function(Status) {
						if (Status) {
							// F4 cache logic
							if (this.f4Cache[id]) {
								var rows = this.f4Cache[id].rows;
								var found = false;
								var vDesc;
								for (var m = 0; m < rows.length; m++) {
									if (rows[m].Value1 === val || rows[m].Value2 === val || rows[m].col1 === val || rows[m].col2 === val) {
										vDesc = rows[m].Value2 ? rows[m].Value2 : rows[m].col2;
										this.byId("SID_MAGRV_des").setValue(vDesc);
										this.byId("SID_MAGRV_des").setValueState("None");
										this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", true);
										found = true;
										break;
									}
								}
								if (!found) {
									this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "new");
								}
							}
							this._ValidationPMG();
						}
					}.bind(this));
				}
			}.bind(this), 300);

		},

		_PkgMatGrpDesLiveChange: function(oSrc) {
			var vShort = this.byId("SID_MAGRV").getValue().trim();
			var vDesc = oSrc.getValue().trim();
			// If material group empty → clear
			if (!vShort) {
				this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "clear");
				return;
			}

			clearTimeout(this._liveChangeTimer);
			this._liveChangeTimer = setTimeout(function() {
				// this.fnReadf4Cache("SID_MAGRV", vShort, "P", true);
				if (this.f4Cache["SID_MAGRV"]) {
					var rows = this.f4Cache["SID_MAGRV"].rows;
					var matched = false;
					for (var i = 0; i < rows.length; i++) {
						if (rows[i].Value1 === vShort || rows[i].col1 === vShort) {
							if (rows[i].Value2 === vDesc || rows[i].col2 === vDesc) {
								this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", true);
							} else {
								this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "change");
							}
							matched = true;
							break;
						}
					}
					if (!matched) {
						this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "new");
					}

					this._ValidationPMG();
				} else {
					this._GetF4data("SID_MAGRV").then(function(Status) {
						if (Status) {
							// If F4 cache exists → validate
							if (this.f4Cache["SID_MAGRV"]) {
								var rows = this.f4Cache["SID_MAGRV"].rows;
								var matched = false;
								for (var i = 0; i < rows.length; i++) {
									if (rows[i].Value1 === vShort || rows[i].col1 === vShort) {
										if (rows[i].Value2 === vDesc || rows[i].col2 === vDesc) {
											this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", true);
										} else {
											this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "change");
										}
										matched = true;
										break;
									}
								}
								if (!matched) {
									this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "new");
								}
							}
							this._ValidationPMG();
						}
					}.bind(this));
				}
			}.bind(this), 300);

			return;
		},

		_MatGrpLiveChange: function(oSrc, vValue) {
			var val = vValue.toUpperCase();
			oSrc.setValue(val);
			var oIndicatorBtn = this.byId("ID_PH_MATKL_BTN");
			var sIndicatorText = oIndicatorBtn.getText();
			// Stoe old value if not already stored or update it before clearing
			if (!oSrc._oldValueStored) {
				oSrc._oldValue = val || "";
				oSrc._oldValueStored = true;
			} else if (!(sIndicatorText === "Available" || sIndicatorText === "Change")) {
				// update _oldValue only if we are not in a clear pending state
				oSrc._oldValue = val;
			}
			// If value exists and indicator shows Available/Change, Popup
			if (oSrc._oldValue && (sIndicatorText === "Available" || sIndicatorText === "Change")) {
				this._levelToClear = "MATKL";
				this._sourceField = oSrc;
				this.fnOpenMessageClrAll(
					"Do you want to clear the  Material Group field?",
					"S"
				);
				return;
			}
			if (!val) {
				this.byId("ID_PH_MATKL_des").setValue("");
				this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "clear");
				return;
			}

			clearTimeout(this._liveChangeTimer);
			this._liveChangeTimer = setTimeout(function() {
				if (this.f4Cache["ID_PH_MATKL"]) {
					var rows = this.f4Cache["ID_PH_MATKL"].rows;
					var found = false;
					// var vDesc;
					for (var m = 0; m < rows.length; m++) {
						if (rows[m].Value1 === val || rows[m].Value2 === val || rows[m].col1 === val || rows[m].col2 === val) {
							var vDesc = rows[m].Value2 ? rows[m].Value2 : rows[m].col2;
							this.byId("ID_PH_MATKL_des").setValue(vDesc);
							this.byId("ID_PH_MATKL_des").setValueState("None");
							this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", true);
							found = true;
							break;
						}
					}
					if (!found) this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "new");
					this._validationMG();
				} else {
					// this.fnReadf4Cache("ID_PH_MATKL", val, "P");
					this._GetF4data("ID_PH_MATKL").then(function(Status) {
						if (Status) {
							// F4 cache logic
							if (this.f4Cache["ID_PH_MATKL"]) {
								var rows = this.f4Cache["ID_PH_MATKL"].rows;
								var found = false;
								// var vDesc;
								for (var m = 0; m < rows.length; m++) {
									if (rows[m].Value1 === val || rows[m].Value2 === val || rows[m].col1 === val || rows[m].col2 === val) {
										var vDesc = rows[m].Value2 ? rows[m].Value2 : rows[m].col2;
										this.byId("ID_PH_MATKL_des").setValue(vDesc);
										this.byId("ID_PH_MATKL_des").setValueState("None");
										this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", true);
										found = true;
										break;
									}
								}
								if (!found) this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "new");
								return;
							}
							this._validationMG();
						}
					}.bind(this));
				}
			}.bind(this), 300);

			return;
		},

		_MatGrpDesLiveChange: function(oSrc) {
			var vShort = this.byId("ID_PH_MATKL").getValue().trim();
			var vDesc = oSrc.getValue().trim();
			// If material group empty → clear
			if (!vShort) {
				this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "clear");
				return;
			}
			clearTimeout(this._liveChangeTimer);
			this._liveChangeTimer = setTimeout(function() {
				if (this.f4Cache["ID_PH_MATKL"]) {
					var rows = this.f4Cache["ID_PH_MATKL"].rows;
					var matched = false;
					for (var i = 0; i < rows.length; i++) {
						if (rows[i].Value1 === vShort || rows[i].col1 === vShort) {
							if (rows[i].Value2.toUpperCase() === vDesc.toUpperCase() || rows[i].col2.toUpperCase() === vDesc.toUpperCase()) {
								this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", true);
							} else {
								this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "change");
							}
							matched = true;
							break;
						}
					}
					if (!matched) {
						this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "new");
					}
					this._validationMG();
				} else {
					this._GetF4data("ID_PH_MATKL").then(function(Status) {
						if (status) {
							if (this.f4Cache["ID_PH_MATKL"]) {
								var rows = this.f4Cache["ID_PH_MATKL"].rows;
								var matched = false;
								for (var i = 0; i < rows.length; i++) {
									if (rows[i].Value1 === vShort || rows[i].col1 === vShort) {
										if (rows[i].Value2 === vDesc || rows[i].col2 === vDesc) {
											this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", true);
										} else {
											this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "change");
										}
										matched = true;
										break;
									}
								}
								if (!matched) {
									this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "new");
								}
							}
							this._validationMG();
						}
					}.bind(this), 300);
				}
			}.bind(this), 300);

		},

		_ValidationPMG: function() {
			var payload = {
				AppId: "PM",
				Ind: "V",
				"Transid": this.Transid,
				"WiId": this.workId

			};
			var status = this.getView().byId("ID_PH_MATKL_BTN").getText();
			if (status === "Available") {
				status = "A";
			} else if (status === "Change") {
				status = "C";
			} else {
				status = "N";
			}

			payload.NavPHItems = [{
				Magrv: this.getView().byId("SID_MAGRV").getValue(),
				Bezei: this.getView().byId("SID_MAGRV_des").getValue(),
				Status1P: status
			}];
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			oModel.create("/Product_KeyDataSet", payload, {
				success: function(oData) {
					if (oData.Msgtype === "E") {
						ErrorHandler.showCustomSnackbar(
							oData.Message,
							"Error",
							that
						);
						that.getView().byId("SID_MAGRV").setValueState("Error");
						that.getView().byId("SID_MAGRV").setValueStateText(oData.Message);
					}
				}
			});
		},

		_validationMG: function() {
			var payload = {
				AppId: "PM",
				Ind: "V",
				"Transid": this.Transid,
				"WiId": this.workId
			};

			var status = this.getView().byId("ID_PH_MATKL_BTN").getText();
			if (status === "Available") {
				status = "A";
			} else if (status === "Change") {
				status = "C";
			} else {
				status = "N";
			}

			payload.NavPHItems = [{
				Matkl: this.getView().byId("ID_PH_MATKL").getValue(),
				DescC: this.getView().byId("ID_PH_MATKL_des").getValue(),
				Status1P: status
			}];
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			oModel.create("/Product_KeyDataSet", payload, {
				success: function(oData) {
					if (oData.Msgtype === "E") {
						ErrorHandler.showCustomSnackbar(
							oData.Message,
							"Error",
							that
						);
						that.getView().byId("SID_MAGRV").setValueState("Error");
						that.getView().byId("SID_MAGRV").setValueStateText(oData.Message);
					}
				}
			});
		},

		_lvlDesEditLiveChange: function(oSrc, oMatch, vValue) {
			var lvl = parseInt(oMatch[1]);
			var shortId = "SID_STUFE_" + lvl;
			var btnId = "SID_STUFE_" + lvl + "_BTN";
			var descId = "SID_STUFE_" + lvl + "_des";
			var maxLen = this.byId(shortId).getMaxLength();
			var vShort = this.byId(shortId).getValue().trim();
			var vDesc = this.byId(descId).getValue().trim();
			var buttonState;
			var currectLvlCode;
			var f4Data;
			var result;

			oSrc._oldValue = vShort; //line added on 18-12-2025
			oSrc.setValue(vValue.toUpperCase());

			function safeUpper(val) {
				return (val || "").toString().toUpperCase();
			}

			// var checkOldValue = this.byId(descId)._oldValue;
			if (this.State === "I") { // initiator logive we donn't store the old value 
				if (this.f4Cache[lvl]) {
					currectLvlCode = this.getView().byId(shortId).getValue();
					f4Data = this.f4Cache[lvl].rows;
					result = f4Data.filter(function(item) {
						return item.Value1 === currectLvlCode || item.col1 === currectLvlCode;
					});
					if (result.length > 0) {
						var indChanged = false;
						for (var i = 0; i < result.length; i++) {
							if (safeUpper(result[i].Value2) === safeUpper(vValue) ||
								safeUpper(result[i].col2) === safeUpper(vValue)) {
								this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", true);
								indChanged = true;
							}
						}
						if (!indChanged) {
							this._changeAndNewCheck(lvl, vValue, oSrc);
							this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "change");
						}
					}
				} else {
					this._GetlevelF4data(lvl).then(function(Status) {
						currectLvlCode = this.getView().byId(shortId).getValue();
						f4Data = this.f4Cache[lvl].rows;
						result = f4Data.filter(function(item) {
							return item.Value1 === currectLvlCode;
						});
						if (result.length > 0) {
							if (result[0].Value2 === vValue) {
								this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", true);
							} else {
								this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "change");
							}
						}
					}.bind(this));
				}
			} else { // Reviewer And Approver logic
				var model = this.getView().getModel("JM_InitialDataModel");
				if (model) {
					var oldValue = model.getProperty("/" + descId);
					if (oldValue === vValue) {
						var buttonSts = model.getProperty("/" + btnId);
						if (buttonSts === "Available") {
							this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", true);
						} else if (buttonSts === "Change") {
							this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "change");
						} else if (buttonSts === "new") {
							this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "new");
						}
						// get eidtable if the indeicator willbe new
						buttonState = model.getProperty("/" + btnId);
						if (buttonState === "new") {
							this.getView().byId(descId).setEditable(true);
						}
					} else {
						if (this.f4Cache[lvl]) {
							currectLvlCode = this.getView().byId(shortId).getValue();
							f4Data = this.f4Cache[lvl].rows;
							result = f4Data.filter(function(item) {
								return item.Value1 === currectLvlCode;
							});
							if (result.length > 0) {
								if (result[0].Value2 === vValue) {
									this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", true);
								} else {
									this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "change");
								}
							} else {
								buttonState = this.getView().byId(btnId).getText();
								if (buttonState === "new") {
									this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "new");
								} else if (buttonState === "Available") {
									this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", true);
								} else if (buttonState === "Change") {
									this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "change");
								}
							}
						} else {
							this._GetlevelF4data(lvl).then(function(Status) {
								currectLvlCode = this.getView().byId(shortId).getValue();
								f4Data = this.f4Cache[lvl].rows;
								result = f4Data.filter(function(item) {
									return item.Value1 === currectLvlCode;
								});
								if (result.length > 0) {
									if (result[0].Value2 === vValue) {
										this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", true);
									} else {
										this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "change");
									}
								} else {
									// this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "change");
									buttonState = this.getView().byId(btnId).getText();
									if (buttonState === "new") {
										this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "new");
									} else if (buttonState === "Available") {
										this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", true);
									} else if (buttonState === "Change") {
										this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "change");
									}
								}
							}.bind(this));
						}
					}
				}

			}
			if (this.byId(shortId).getValue().trim() && this.byId(descId).getValue().trim() && vShort.length === maxLen) {
				var nextLvl = lvl + 1;
				var oNextShort = this.byId("SID_STUFE_" + nextLvl);
				var oNextDesc = this.byId("SID_STUFE_" + nextLvl + "_des");
				// if (nextLvl > 7) {
				// 	clearTimeout(this._liveChangeTimer);
				// 	this._liveChangeTimer = setTimeout(function() {
				// 		this.fnLevelValidation().then(function(Status) {
				// 			if (Status) {
				// 				// oSrc._oldValue = vShort; //line added on 18-12-2025
				// 				// oSrc.setValue(vValue.toUpperCase());
				// 			}
				// 		}.bind(this));
				// 	}.bind(this), 300);
				// 	return;
				// }
				oNextShort.setEditable(true);
				if (this.vDescEdit === "C") {
					oNextDesc.setEditable(true);
				} else {
					oNextDesc.setEditable(false);
				}
			}

			clearTimeout(this._liveChangeTimer);
			this._liveChangeTimer = setTimeout(function() {
				this.fnLevelValidation().then(function(Status) {
					if (Status) {
						var text = this.getView().byId(btnId).getText();
						if (text === "new") {
							this._changeAndNewCheck(lvl, vValue, oSrc);
						}
					}
				}.bind(this));
			}.bind(this), 300);
		},

		_changeAndNewCheck: function(lvl, vValue, oSrc) {
			var aData = this.f4Cache[lvl].rows || [];
			var bDuplicateFound = false;
			var oMatchedItem = null;

			var sInputValue = (vValue || "").replace(/\s+/g, "").toUpperCase();

			for (var i = 0; i < aData.length; i++) {
				var oItem = aData[i];
				var sText = oItem.col2 || oItem.Value2 || "";
				var sF4Value = sText.replace(/\s+/g, "").toUpperCase();

				if (sF4Value === sInputValue) {
					oMatchedItem = oItem;
					bDuplicateFound = true;
					break;
				}
			}
			if (bDuplicateFound) {
				oSrc.setValueState(sap.ui.core.ValueState.Error);
				oSrc.setValueStateText("This value already exists for code " + (oMatchedItem.col1 || oMatchedItem.Value1 || ""));
				ErrorHandler.showCustomSnackbar("This value already exists for code " + (oMatchedItem.col1 || oMatchedItem.Value1 || ""), "Error",
					this);
			}
		},

		_levelliveChange: function(lvl, vValue) {
			var currentDes = "SID_STUFE_" + lvl + "_des";
			var currenthier = "SID_STUFE_" + lvl + "_hier";
			var level = String(lvl);
			this._GetlevelDesc(level).then(function(descSts) {
				if (descSts) {
					this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "true");
					this.fnLevelValidation().then(function(Status) {
						if (Status) {
							if (this.vDescEdit === "C") {
								this.getView().byId(currentDes).setEditable(true);
							} else {
								this.getView().byId(currentDes).setEditable(false);
							}
							// var level = "L" + level;
							this._getNextLevelFields(vValue, level).then(function(levelStats) {
								if (levelStats) {
									// var nextHierId = "SID_STUFE_" + level + "_hier";
									
									// ---- Hierarchy build ----
								if (this.getView().byId(this.selectedField + "_hier")) {
									var levelNum = parseInt(level);
									var prevValue = "";
									if (levelNum > 1) {
										var prevFieldId = "SID_STUFE_" + (levelNum - 1) + "_hier";
										var prevField = this.getView().byId(prevFieldId);
										if (prevField) prevValue = prevField.getValue();
									}
									this.getView().byId(currenthier).setValue(prevValue + vValue);
								}
									
									
									var nextId = "SID_STUFE_" + (this.lastLevelIndex);
									var nextDesId = "SID_STUFE_" + (this.lastLevelIndex) + "_des";
									if (this.getView().byId(nextId)) {
										this.getView().byId(nextId).setEditable(true);
										this.getView().byId(nextId).setValueState("None");
										if (this.vDescEdit === "C") {
											this.getView().byId(nextDesId).setEditable(true);
											this.getView().byId(nextDesId).setValueState("None");
										} else {
											this.getView().byId(nextDesId).setEditable(false);
											this.getView().byId(nextDesId).setValueState("None");
										}
									}
								}
							}.bind(this));
						}
					}.bind(this));
				} else {
					this.updateIndicator("SID_STUFE_" + lvl + "_IND", "SID_STUFE_" + lvl + "_BTN", "SID_STUFE_" + lvl + "_des", "new");
					if (lvl !== 1) {
						this.fnLevelValidation().then(function(Status) {
							if (!Status) {
								this.getView().byId(currentDes).setEditable(false);
							} else {
								var str = "";
								for (var i = 1; i < lvl; i++) {
									var id = "SID_STUFE_" + i;
									str += this.getView().byId(id).getValue();
								}
								str += vValue;
								this.getView().byId(currenthier).setValue(str);
								this.getView().byId(currentDes).setEditable(true);
							}
						}.bind(this));
					}
				}
			}.bind(this));
		},

		fnLiveChange: function(oEvent) {
			var oSrc = oEvent.getSource();
			var sFieldId = oSrc.getId().split("--")[1];
			oSrc.setValueState("None");
			this.selectedField = sFieldId;

			if (!oSrc._oldValueStored) {
				oSrc._oldValue = oSrc.getValue();
				oSrc._oldValueStored = true;
			}

			var vValue = oSrc.getValue();
			oSrc.setValue(vValue);

			var aShort = ["SID_STUFE_1", "SID_STUFE_2", "SID_STUFE_3", "SID_STUFE_4", "SID_STUFE_5", "SID_STUFE_6", "SID_STUFE_7"];
			var aDesc = ["SID_STUFE_1_des", "SID_STUFE_2_des", "SID_STUFE_3_des", "SID_STUFE_4_des", "SID_STUFE_5_des", "SID_STUFE_6_des",
				"SID_STUFE_7_des"
			];
			var aHier = ["SID_STUFE_1_hier", "SID_STUFE_2_hier", "SID_STUFE_3_hier", "SID_STUFE_4_hier", "SID_STUFE_5_hier", "SID_STUFE_6_hier",
				"SID_STUFE_7_hier"
			];

			var oMatch = sFieldId.match(/SID_STUFE_(\d+)/);
			if (sFieldId === "SID_MAGRV") {
				this._PkgMatGrpLivechange(oSrc, vValue);
				return;
			}
			if (sFieldId === "SID_MAGRV_des") {
				this._PkgMatGrpDesLiveChange(oSrc);
				oSrc.setValue(vValue.toUpperCase());
			}

			if (sFieldId === "ID_PH_MATKL") {
				this._MatGrpLiveChange(oSrc, vValue);
			}
			if (sFieldId === "ID_PH_MATKL_des") {
				this._MatGrpDesLiveChange(oSrc);
				oSrc.setValue(vValue.toUpperCase());
			}

			// =========================
			// LEVEL-BASED LOGIC
			// =========================
			if (oMatch) {
				var lvl = parseInt(oMatch[1]);
				var isDescField = sFieldId.indexOf("_des") > -1;
				var shortId = "SID_STUFE_" + lvl;
				var descId = "SID_STUFE_" + lvl + "_des";
				var hierId = "SID_STUFE_" + lvl + "_hier";
				var maxLen = this.byId(shortId).getMaxLength();
				var vShort = this.byId(shortId).getValue().trim();
				var oIndicatorBtn = this.byId("SID_STUFE_" + lvl + "_BTN");
				var sIndicatorText = oIndicatorBtn.getText();

				// =========================
				// CHECK FOR CHARACTER DELETION
				// =========================
				if (!isDescField) {
					if (sIndicatorText === "Available" || sIndicatorText === "Change") {
						// Store level to clear on confirm
						this._levelToClear = lvl;
						this._sourceField = oSrc;
						this.fnOpenMessageClrAll(i18n.getText("levelclear"), "S");
						return; // stop further processing
					}
				}
				// =========================
				// DESCRIPTION EDIT
				// =========================
				if (isDescField) {
					this._lvlDesEditLiveChange(oSrc, oMatch, vValue);
					return;
				}

				// =========================
				// SHORT CODE EDIT
				// =========================
				//line added 
				if (vShort === "") {
					this._levelToClear = lvl;
					this._sourceField = oSrc;
					var model;
					model = this.getView().getModel("JM_KeyDataVisible");
					if (model) {
						model.setProperty("/dynamicSpanRb", "L12 M12 S12");
						model.setProperty("/phVisible", false);
						// model.setProperty("/phValue", string);
						// model.setProperty("/phValueLength", string.length);
					}
					this.fnOpenMessageClrAll(
						i18n.getText("levelclear"),
						"S"
					);
					return;
				}
				if (shortId === "SID_STUFE_1" || shortId === "SID_STUFE_2" || shortId === "SID_STUFE_3" || shortId === "SID_STUFE_4" || shortId ===
					"SID_STUFE_5" || shortId === "SID_STUFE_6" || shortId === "SID_STUFE_7") {
					if (maxLen === vValue.length) {
						this._levelliveChange(Number(lvl), vValue);
					} else {
						this.getView().byId(descId).setEditable(false);
					}
				}
				if (shortId === "SID_STUFE_7") {
					var model;
					if (maxLen === vValue.length) {
						var string = "";
						for (var i = 1; i <= 7; i++) {
							var id = "SID_STUFE_" + i;
							string += this.getView().byId(id).getValue();
						}
						model = this.getView().getModel("JM_KeyDataVisible");
						if (model) {
							model.setProperty("/dynamicSpanRb", "L9 M12 S12");
							model.setProperty("/phVisible", true);
							model.setProperty("/phValue", string);
							model.setProperty("/phValueLength", string.length);
						}
					} else {
						model = this.getView().getModel("JM_KeyDataVisible");
						if (model) {
							model.setProperty("/dynamicSpanRb", "L12 M12 S12");
							model.setProperty("/phVisible", false);
							// model.setProperty("/phValue", string);
							// model.setProperty("/phValueLength", string.length);
						}
					}
				}

				return;
			}
		},

		_GetF4data: function(id) {
			return new Promise(function(Resolve, Reject) {
				var that = this;
				var filter;
				var oModel = this.getOwnerComponent().getModel("JM_CONFIG");

				var oPayload = {
					FieldId: id,
					F4Type: "P",
					Process: "X"
				};
				oPayload.NavSerchResult = [];
				busyDialog.open();
				oModel.create("/SearchHelpSet", oPayload, {
					filters: filter,
					success: function(oData) {
						busyDialog.close();
						// that.f4Cache[vId] = oData.NavSerchResult.results;
						that.f4Cache[id] = {
							rows: oData.NavSerchResult.results
						};
						Resolve(true);
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
					}
				});
			}.bind(this));

		},

		_GetlevelF4data: function(lvl) {
			return new Promise(function(Resolve, Reject) {
				var vPayload;
				var currInputId = "SID_STUFE_" + lvl;
				var item = {};
				for (var i = 1; i <= lvl; i++) {
					var lvlProperty = "Level" + i;
					var inputId = "SID_STUFE_" + i;
					item[lvlProperty] = this.getView().byId(inputId).getValue();
				}
				var vSpart = this.getView().byId("KID_SPART").getValue();
				var aNavItems = [];
				aNavItems.push(item);
				vPayload = {
					AppId: "PHC",
					Ind: "L",
					Lvlind: "L" + lvl,
					NavPHSearchHelp: [],
					NavPHItems: aNavItems,
					Spart: vSpart
				};
				var that = this;
				var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
				oModel.create("/Product_KeyDataSet", vPayload, {
					success: function(oData) {
						var aResults = oData.NavPHSearchHelp.results;
						that.f4Cache[lvl] = {
							rows: aResults
						};
						Resolve(true);
					}

				});
			}.bind(this));
		},

		_GetlevelDesc: function(lvl) {
			return new Promise(function(Resolve, Reject) {
				var vPayload;
				var currInputId = "SID_STUFE_" + lvl;
				var currentDecId = "SID_STUFE_" + lvl + "_des";
				var currentHierId = "SID_STUFE_" + lvl + "_hier";

				var item = {};

				for (var i = 1; i <= lvl; i++) {
					var lvlProperty = "Level" + i;
					var inputId = "SID_STUFE_" + i;
					item[lvlProperty] = this.getView().byId(inputId).getValue();
				}

				var vLevel1 = this.getView().byId(currInputId).getValue();
				var vSpart = this.getView().byId("KID_SPART").getValue();

				var aNavItems = [];
				aNavItems.push(item);
				vPayload = {
					AppId: "PHC",
					Ind: "L",
					Lvlind: "L" + lvl,
					NavPHSearchHelp: [],
					NavPHItems: aNavItems,
					Spart: vSpart
				};
				var vLength;
				var that = this;
				var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
				oModel.create("/Product_KeyDataSet", vPayload, {
					success: function(oData) {
						var aResults = oData.NavPHSearchHelp.results;
						var results = aResults.filter(function(oItem) {
							return oItem.Value1 === vLevel1;
						});
						that.f4Cache[lvl] = {
							rows: aResults
						};
						if (results.length > 0) {
							if (results[0].Value2 === "") {
								that.getView().byId(currentDecId).setEditable(true);
								Resolve(false);
							} else {
								that.getView().byId(currentDecId).setValue(results[0].Value2);
								that.getView().byId(currentHierId).setValue(results[0].Value1);
								Resolve(true);
							}
						} else {
							if (lvl === '1') {
								that.getView().byId(currInputId).setValueState("Error");
								that.getView().byId(currentDecId).setEditable(false);
								that.getView().byId(currInputId).setValueStateText("code is not maintained in the division table");
							}
							Resolve(false);
						}
					}
				});
			}.bind(this));

		},

		_getNextLevelFields: function(vValue, level) {
			return new Promise(function(Resolve, Reject) {
				var vPayload;
				var vLevel1 = this.getView().byId("SID_STUFE_1").getValue();
				var aNavItems = [{
					Level1: vLevel1
				}];
				vPayload = {
					AppId: "PHC",
					Ind: "M",
					Lvlind: "L" + level,
					NavPHSearchHelp: [],
					NavPHItems: aNavItems
				};
				var that = this;
				var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
				oModel.create("/Product_KeyDataSet", vPayload, {
					success: function(oData) {
						var aResults = oData.NavPHItems.results[0];
						var previousText = "";
						for (var i = Number(level); i <= 7; i++) {
							// for (var j = Number(level); j <= i; j++) {
							// 	var id = "SID_STUFE_" + j;
							// 	previousText += that.getView().byId(id).getValue();
							// }
							var inputId = "SID_STUFE_" + i;
							var descId = "SID_STUFE_" + i + "_des";
							var heirId = "SID_STUFE_" + i + "_hier";
							var level1 = "Level" + i; // property name in response
							var description = "Vtext" + i;
							if (aResults[level1]) {
								// previousText += aResults[level1];
								that.getView().byId(inputId).setValue(aResults[level1]);
								that.getView().byId(inputId).setValueState("None");
								// that.getView().byId(heirId).setValue(previousText);
								that.getView().byId(inputId).setEditable(true);
								if (that.vDescEdit === "C") {
									that.getView().byId(descId).setValue(aResults[description]);
									that.getView().byId(descId).setValueState("None");
									that.getView().byId(descId).setEditable(true);
								} else {
									that.getView().byId(descId).setValue(aResults[description]);
									that.getView().byId(descId).setValueState("None");
									that.getView().byId(descId).setEditable(false);
								}
								that.lastLevelIndex = i;
								that.updateIndicator("SID_STUFE_" + i + "_IND", "SID_STUFE_" + i + "_BTN", "SID_STUFE_" + i + "_des", "true");

								if (i === 7) {
									var model;
									model = that.getView().getModel("JM_KeyDataVisible");
									if (model) {
										model.setProperty("/dynamicSpanRb", "L9 M12 S12");
										model.setProperty("/phVisible", true);
										model.setProperty("/phValue", previousText);
										model.setProperty("/phValueLength", previousText.length);
									}
								}
							} else {
								var value = String(i);
								if (level === value) {
									that.lastLevelIndex = i + 1;
								} else {
									that.lastLevelIndex = i;
								}
								break;
							}
						}
						Resolve(true);
					},
					error: function(oResponse) {

					}
				});
			}.bind(this));
		},

		fnLevelValidation: function() {
			var that = this;
			return new Promise(function(Resolve, Reject) {
				var items = {};
				var sFieldId = that.selectedField;
				var iMaxLevel = parseInt(sFieldId.split("_")[2], 10);
				for (var i = 1; i <= iMaxLevel; i++) {
					var sLevelId = "SID_STUFE_" + i;
					var sStatusBtnId = "SID_STUFE_" + i + "_BTN";
					var oLevelCtrl = that.getView().byId(sLevelId);
					var oStatusCtrl = that.getView().byId(sStatusBtnId);
					if (!oLevelCtrl || !oStatusCtrl) {
						continue;
					}
					var sLevelValue = "";
					if (typeof oLevelCtrl.getValue === "function") {
						sLevelValue = oLevelCtrl.getValue();
					} else if (typeof oLevelCtrl.getText === "function") {
						sLevelValue = oLevelCtrl.getText();
					}
					var sStatusText = oStatusCtrl.getText() || "";
					sStatusText = sStatusText.toUpperCase();
					var sStatusChar = "C"; // default
					if (sStatusText === "NEW") {
						sStatusChar = "N";
					} else if (sStatusText === "AVAILABLE") {
						sStatusChar = "A";
					}
					items["Level" + i] = sLevelValue;
					items["Status" + i] = sStatusChar;
				}
				var oPayload = {
					AppId: "PHC",
					Ind: "V",
					"Transid": that.Transid,
					"WiId": that.workId,
					NavPHItems: [items]
				};

				var oModel = that.getOwnerComponent().getModel("JM_PRODHIER");
				oModel.create("/Product_KeyDataSet", oPayload, {
					success: function(oData) {
						if (oData.Msgtype === "E") {
							ErrorHandler.showCustomSnackbar(
								oData.Message,
								"Error",
								that
							);
							that.getView().byId("SID_STUFE_" + iMaxLevel).setValueState("Error");
							that.getView().byId("SID_STUFE_" + iMaxLevel).setValueStateText(oData.Message);
							Resolve(false);
						} else {
							Resolve(true);
						}
					},
					error: function(oError) {
						Resolve(false);
					}
				});

			});
		},

		fncodeCheckliveChange: function(oEvent) {
			var oSrc = oEvent.getSource();
			var sValue = oSrc.getValue().trim();
			oSrc.setValueState("None");
			oSrc.setValueStateText("");
			if (!sValue) {
				this.getView().byId("SID_STUFE_des").setValue("");
				this.getView().byId("SID_STUFE_lev").setValue("");
				this.updateIndicator(
					"SID_STUFE_IND", // HBox
					"SID_STUFE_BTN", // Button
					"SID_STUFE_des",
					"clear"
				);
				return;
			}
		},

		fnReadf4Cache: function(vId, vValue, f4type, descriptioncheck) {
			var that = this;
			var match;
			var descriptionField;

			var updateDesc = function(results) {
				if (f4type === "P") {
					match = results.find(function(item) {
						return item.Value1 === vValue.toUpperCase();
					});
					if (match) {
						descriptionField = that.getView().byId(that.selectedField + "_des");
						if (descriptionField) {
							descriptionField.setValue(match.Value2);
						}
					} else {
						descriptionField = that.getView().byId(that.selectedField + "_des");
						if (descriptionField) {
							descriptionField.setValue("");
						}
					}
				}
			};
			if (this.f4Cache[vId] && this.f4Cache[vId].rows && this.f4Cache[vId].rows.length > 0) {
				updateDesc(this.f4Cache[vId].rows);
			} else {
				this.f4descriptionGet(vId, vValue, f4type, function(results) {
					that.f4Cache[vId] = {
						rows: results
					}; // STORE CACHE
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
					// that.f4Cache[vId] = oData.NavSerchResult.results;
					that.f4Cache[vId] = {
						rows: oData.NavSerchResult.result
					};
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
		//		Function logic for F4 functionality
		// *-------------------------------------------------------------------------------------

		fncodef4press: function(oEvent) {
			var sitem = oEvent.getSource().getId().split("--")[1];
			this.selectedField = sitem;
			var vProdHierClient = this.byId("idSelect").getSelectedKey();
			var oPayload = {
				"Ind": "C",
				"Client": vProdHierClient,
				NavPHItems: []
			};
			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			var oLabels = {};
			var oJsonModel;
			var vTitle;
			var vLength;
			this.sitem = sitem;
			var aFormattedRows = [];
			oModel.create("/Product_KeyDataSet", oPayload, {
				success: function(oData) {
					var aResults = oData.NavPHItems.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						if (oFirst && (oFirst.DomvalueL || oFirst.Ddtext)) {
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								// ErrorHandler.showCustomSnackbar(oFirst.Message, "Error");
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
							this.fnNewFragopen(oEvent, vTitle).open();
							// this.fnNewFragopen(oEvent, vTitle).open();
						} else {
							vLength = oData.NavPHItems.results.length;
							if (oFirst.MsgType === "I" || oFirst.MsgType === "E") {
								// ErrorHandler.showCustomSnackbar(oFirst.Message, "Error");
								return;
							}
							oLabels.col1 = "Product Hierarchy";
							oLabels.col2 = "Description";
							oLabels.col3 = "Level";
							aResults.forEach(function(item) {
								var row = {};
								if (oLabels.col1) {
									row.col1 = item.Hier1;
								}
								if (oLabels.col2) {
									row.col2 = item.Vtext1;
								}
								if (oLabels.col3) {
									row.col3 = item.Level1;
								}
								aFormattedRows.push(row);
							});
							oJsonModel = new sap.ui.model.json.JSONModel({
								labels: oLabels,
								rows: aFormattedRows
							});
							this.getView().setModel(oJsonModel, "JM_F4Model");
							this.getView().getModel("JM_F4Model");
							vTitle = this.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";
							this.fnNewFragopen(oEvent, vTitle).open();

						}
					}
				}.bind(this),
				error: function(oResponse) {}
			});
		},

		fnNewFragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "PRDH.fragment.LevelHelp", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			var oModel = this.getView().getModel("JM_F4Model");
			if (!oModel) {
				return;
			}

			var oTable = this.byId("id_F4Table");
			var oLabels = oModel.getProperty("/labels");

			oTable.removeAllColumns();

			Object.keys(oLabels).forEach(function(sColKey) {
				var sHeaderText = oLabels[sColKey];

				// create column only if label has value
				if (sHeaderText && sHeaderText.trim() !== "") {
					oTable.addColumn(new sap.ui.table.Column({
						label: new sap.m.Label({
							text: "{JM_F4Model>/labels/" + sColKey + "}"
						}),
						template: new sap.m.Label({
							text: "{JM_F4Model>" + sColKey + "}"
						}).addStyleClass("sapUiTinyMarginBegin cl_table_label"),
						sortProperty: sColKey,
						filterProperty: sColKey
					}));
				}
			});
			// this.fnDynamicColunmBind();

			this.fnDynmaicLevelDetails(); // added by Jones on 12.12.2025
			this.f4HelpFrag.setTitle(vTitle);

			return this.f4HelpFrag;
		},

		fnrowSelected: function(oEvent) {

			// var oItem = oEvent.getSource();
			var index = oEvent.getParameter("rowIndex");
			var oContext = oEvent.getSource().getContextByIndex(index).getObject();

			var level = this.selectedField.split("_")[2];
			var hboxId = "SID_STUFE_" + level + "_IND";
			var btnId = "SID_STUFE_" + level + "_BTN";
			var descId = "SID_STUFE_" + level + "_des";

			var item = oContext.col1;
			var item1 = oContext.col2;
			var item2 = oContext.col3;
			var oShort = this.getView().byId(this.selectedField);
			var oDesc = this.getView().byId(this.selectedField + "_des");
			// ---- Setting Level ---------------------- //
			if (this.selectedField === "SID_STUFE") {
				this.byId("SID_STUFE_lev").setValue(item2);
				this.updateIndicator(
					"SID_STUFE_IND", // HBox
					"SID_STUFE_BTN", // Button
					"SID_STUFE_des",
					true
				);
				// ---- Correctly apply selection ----
				oShort.setValue(item);
				oShort.setValueState("None");

				oDesc.setValue(item1);
				oDesc.setValueState("None");
				this.fnAfterCloseFragment();
				return;
			} else if (this.selectedField === "SID_MAGRV") {
				// ---- Correctly apply selection ----
				oShort.setValue(item);
				oShort.setValueState("None");

				oDesc.setValue(item1);
				oDesc.setValueState("None");
				this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", true);
				this.fnAfterCloseFragment();
				return;
			} else if (this.selectedField === "ID_PH_MATKL") {
				// ---- Correctly apply selection ----
				oShort.setValue(item);
				oShort.setValueState("None");

				oDesc.setValue(item1);
				oDesc.setValueState("None");
				this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", true);
				this.fnAfterCloseFragment();
				return;
			} else {

				//Update oldValue so liveChange works properly ----
				oShort._oldValue = item;
				oShort._oldValueStored = true;

				oDesc._oldValue = item1;
				oDesc._oldValueStored = true;

				// ---- Correctly apply selection ----
				oShort.setValue(item);
				oShort.setValueState("None");
				// added by sabarish 24-12-2025
				if (item1 === "") {
					this.updateIndicator(hboxId, btnId, descId, "new");
				} else {
					this.updateIndicator(hboxId, btnId, descId, true);
				}

				oDesc.setValue(item1);
				oDesc.setValueState("None");
				this.fnAfterCloseFragment();
				this.fnLevelValidation().then(function(Status) {
					if (Status) {
						this._getNextLevelFields(item, level).then(function(levelStats) {
							if (levelStats) {
								// ---- Hierarchy build ----
								if (this.getView().byId(this.selectedField + "_hier")) {
									var levelNum = parseInt(level);
									var prevValue = "";
									if (levelNum > 1) {
										var prevFieldId = "SID_STUFE_" + (levelNum - 1) + "_hier";
										var prevField = this.getView().byId(prevFieldId);
										if (prevField) prevValue = prevField.getValue();
									}
									this.getView().byId(this.selectedField + "_hier").setValue(prevValue + item);
								}
								// var level = "L" + level;
								this._getNextLevelFields(item, level).then(function(levelStats1) {
									if (levelStats1) {
										var nextId = "SID_STUFE_" + (this.lastLevelIndex);
										var nextDesId = "SID_STUFE_" + (this.lastLevelIndex) + "_des";
										if (this.getView().byId(nextId)) {
											this.getView().byId(nextId).setEditable(true);
											if (this.vDescEdit === "C") {
												this.getView().byId(nextDesId).setEditable(true);
											} else {
												this.getView().byId(nextDesId).setEditable(false);
											}
										}

									}
								}.bind(this));

								// this.fnupdateNextLevel();
							}
						}.bind(this));
					}
				}.bind(this));
			}

			this.fnAfterCloseFragment();
		},

		fnSamplepress: function(oEvent, olivechange, skipAutoFill) {
			var oSrc = oEvent.getSource();
			if (!oSrc._oldValueStored) {
				oSrc._oldValue = oSrc.getValue();
				oSrc._oldValueStored = true;
			}
			var sitem = oEvent.getSource().getId().split("--")[1];
			if (olivechange !== true) {
				var aProdFields = [
					"SID_STUFE_1",
					"SID_STUFE_2",
					"SID_STUFE_3",
					"SID_STUFE_4",
					"SID_STUFE_5",
					"SID_STUFE_6",
					"SID_STUFE_7"
				];
				for (var i = 0; i < aProdFields.length; i++) {
					if (sitem === aProdFields[i]) {
						var inputval = this.byId(aProdFields[i]).getValue();
						if (inputval) {
							this._levelToClear = i + 1; // store the level to clear
							this._sourceField = sitem;
							this.fnOpenMessageClrAll(
								i18n.getText("levelclear"),
								"S"
							);
							return; // stop F4 until user clears
						}
					}
				}
			}
			var vPayload = {};
			if (sitem === "SID_MAGRV") {
				this.selectedField = sitem;
				vPayload = {
					AppId: "PM",
					Ind: "L",
					NavPHSearchHelp: []
				};
			} else if (sitem === "ID_PH_MATKL") {
				this.selectedField = sitem;
				vPayload = {
					AppId: "MG",
					Ind: "L",
					NavPHSearchHelp: []
				};
			} else {
				this.selectedField = sitem;
				var aParts = sitem.split("_"); // ["SID", "STUFE", "1"]
				var fieldname = aParts[2];
				var field = aParts[1];
				var vLevel1 = this.getView().byId("SID_STUFE_1").getValue();
				var vLevel2 = this.getView().byId("SID_STUFE_2").getValue();
				var vLevel3 = this.getView().byId("SID_STUFE_3").getValue();
				var vLevel4 = this.getView().byId("SID_STUFE_4").getValue();
				var vLevel5 = this.getView().byId("SID_STUFE_5").getValue();
				var vLevel6 = this.getView().byId("SID_STUFE_6").getValue();
				var vLevel7 = this.getView().byId("SID_STUFE_7").getValue();
				var vSpart = this.getView().byId("KID_SPART").getValue();
				var aNavItems = [{
					Level1: vLevel1,
					Level2: vLevel2,
					Level3: vLevel3,
					Level4: vLevel4,
					Level5: vLevel5,
					Level6: vLevel6,
					Level7: vLevel7
				}];
				vPayload = {
					AppId: "PHC",
					Ind: "L",
					Lvlind: "L" + fieldname,
					NavPHSearchHelp: [],
					NavPHItems: aNavItems,
					Spart: vSpart
				};
			}
			this.levelValue = fieldname;

			this._bindF4Data(vPayload, fieldname, field, oEvent, olivechange, skipAutoFill);

		},

		_bindF4Data: function(vPayload, fieldname, field, oEvent, olivechange, skipAutoFill) {
			var sitem = oEvent.getSource().getId().split("--")[1];
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			var oLabels = {};
			var aFormattedRows = [];
			var vTitle;
			var vLength;
			var iLevel = fieldname;
			var oJsonModel;
			oModel.create("/Product_KeyDataSet", vPayload, {
				success: function(oData) {
					busyDialog.close();
					that.vDescEdit = oData.Msgtype;
					var aResults = oData.NavPHSearchHelp.results;
					if (aResults.length > 0) {
						var oFirst = aResults[0];
						vLength = oData.NavPHSearchHelp.results.length;
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
						if (field === "STUFE") {
							that.f4Cache[iLevel] = {
								labels: oLabels,
								rows: aFormattedRows
							};
						} else {
							that.f4Cache[sitem] = {
								labels: oLabels,
								rows: aFormattedRows
							};
						}
						oJsonModel = new sap.ui.model.json.JSONModel({
							labels: oLabels,
							rows: aFormattedRows
						});
						that.getView().setModel(oJsonModel, "JM_F4Model");
						that.getView().getModel("JM_F4Model");
						vTitle = that.getView().getModel("JM_F4Model").getData().labels.col1 + " (" + vLength + ")";

						if (that.selectedField === "SID_MAGRV" || that.selectedField === "ID_PH_MATKL") {
							that.fnF4fragopen(oEvent, vTitle).open();
						} else {
							that.fnNewFragopen(oEvent, vTitle).open();
						}

						// var fieldname = this.levelValue;
						// var scrollVbox = that.f4HelpFrag.getContent()[2];
						// remove all scroll classes at once
						var aClasses = [
							"cl_f4tableScroll",
							"cl_f4tableScrollL2",
							"cl_f4tableScrollL3",
							"cl_f4tableScrollL4",
							"cl_f4tableScrollL5",
							"cl_f4tableScrollL6",
							"cl_f4tableScrollL7"
						];
						var levelNumber = Number(fieldname);
						if (levelNumber > 1) {
							// aClasses.forEach(function(sClass) {
							// 	scrollVbox.removeStyleClass(sClass);
							// });

							if (fieldname >= "2" && fieldname <= "7") {
								// scrollVbox.addStyleClass("cl_f4tableScrollL" + fieldname);
								if (fieldname === "3") {
									that.getView().byId("id_F4Table").setVisibleRowCount(12);
								} else if (fieldname === "4") {
									that.getView().byId("id_F4Table").setVisibleRowCount(11);
								} else if (fieldname === "5") {
									that.getView().byId("id_F4Table").setVisibleRowCount(10);
								} else if (fieldname === "6") {
									that.getView().byId("id_F4Table").setVisibleRowCount(9);
								} else if (fieldname === "7") {
									that.getView().byId("id_F4Table").setVisibleRowCount(8);
								}
							}
						}
					} else {
						if (skipAutoFill !== true) {
							ErrorHandler.showCustomSnackbar("No Data Found", "Error", that);
						}
						return;
					}
				},
				error: function(oResponse) {
					busyDialog.close();

				}
			});
		},

		fnF4fragopen: function(oEvent, vTitle) {
			if (!this.f4HelpFrag) {
				this.f4HelpFrag = sap.ui.xmlfragment(this.getView().getId(), "PRDH.fragment.F4Help", this);
				this.getView().addDependent(this.f4HelpFrag);
			}
			var oModel = this.getView().getModel("JM_F4Model");
			if (!oModel) {
				return;
			}

			var oTable = this.byId("id_F4Table");
			var oLabels = oModel.getProperty("/labels");

			oTable.removeAllColumns();

			Object.keys(oLabels).forEach(function(sColKey) {
				var sHeaderText = oLabels[sColKey];

				// create column only if label has value
				if (sHeaderText && sHeaderText.trim() !== "") {
					oTable.addColumn(new sap.ui.table.Column({
						label: new sap.m.Label({
							text: "{JM_F4Model>/labels/" + sColKey + "}"
						}),
						template: new sap.m.Label({
							text: "{JM_F4Model>" + sColKey + "}"
						}).addStyleClass("sapUiTinyMarginBegin cl_table_label"),
						sortProperty: sColKey,
						filterProperty: sColKey
					}));
				}
			});
			this.f4HelpFrag.setTitle(vTitle);

			return this.f4HelpFrag;
		},

		fnDynmaicLevelDetails: function() {
			var fieldId = this.selectedField;
			if (!fieldId) {
				return;
			}
			// Extract level number (SID_STUFE_3 → 3)
			var levelNumber = parseInt(fieldId.split("_")[2], 10);
			// If Level 1 → clear table
			if (levelNumber === 1) {
				this.getView().setModel(
					new sap.ui.model.json.JSONModel({
						rows: []
					}),
					"JM_LevelDetailsRow"
				);
				return;
			}
			var aRows = [];
			// Loop previous levels
			for (var i = 1; i < levelNumber; i++) {
				var valueField = "SID_STUFE_" + i;
				var desField = "SID_STUFE_" + i + "_des";
				var oValueCtrl = this.getView().byId(valueField);
				var oDescCtrl = this.getView().byId(desField);
				if (!oValueCtrl || !oDescCtrl) {
					continue;
				}
				aRows.push({
					labelText1: "Level " + i,
					labelText2: oDescCtrl.getValue(),
					labelText3: oValueCtrl.getValue()
				});
			}
			// Set model for table
			var oTableModel = new sap.ui.model.json.JSONModel({
				rows: aRows
			});
			this.getView().setModel(oTableModel, "JM_LevelDetailsRow");
		},
		// to close the fragment 
		fnf4HelpCancel: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},

		fnF4Itempress: function(oEvent) {
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext("JM_F4Model");
			var level = this.selectedField.split("_")[2];
			var hboxId = "SID_STUFE_" + level + "_IND";
			var btnId = "SID_STUFE_" + level + "_BTN";
			var descId = "SID_STUFE_" + level + "_des";

			if (!oContext) {
				return;
			}

			var item = oContext.getProperty("col1");
			var item1 = oContext.getProperty("col2");
			var item2 = oContext.getProperty("col3");

			var oShort = this.getView().byId(this.selectedField);
			var oDesc = this.getView().byId(this.selectedField + "_des");
			// ---- Setting Level ---------------------- //
			if (this.selectedField === "SID_STUFE") {
				this.byId("SID_STUFE_lev").setValue(item2);
				this.updateIndicator(
					"SID_STUFE_IND", // HBox
					"SID_STUFE_BTN", // Button
					"SID_STUFE_des",
					true
				);
				// ---- Correctly apply selection ----
				oShort.setValue(item);
				oShort.setValueState("None");

				oDesc.setValue(item1);
				oDesc.setValueState("None");
				this.fnAfterCloseFragment();
				return;
			} else if (this.selectedField === "SID_MAGRV") {
				// ---- Correctly apply selection ----
				oShort.setValue(item);
				oShort.setValueState("None");

				oDesc.setValue(item1);
				oDesc.setValueState("None");
				this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", true);
				this.fnAfterCloseFragment();
				return;
			} else if (this.selectedField === "ID_PH_MATKL") {
				// ---- Correctly apply selection ----
				oShort.setValue(item);
				oShort.setValueState("None");

				oDesc.setValue(item1);
				oDesc.setValueState("None");
				this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", true);
				this.fnAfterCloseFragment();
				return;
			} else {
				//Update oldValue so liveChange works properly ----
				oShort._oldValue = item;
				oShort._oldValueStored = true;

				oDesc._oldValue = item1;
				oDesc._oldValueStored = true;

				// ---- Correctly apply selection ----
				oShort.setValue(item);
				oShort.setValueState("None");
				// added by sabarish 24-12-2025
				if (item1 === "") {
					this.updateIndicator(hboxId, btnId, descId, "new");
				} else {
					this.updateIndicator(hboxId, btnId, descId, true);
				}

				oDesc.setValue(item1);
				oDesc.setValueState("None");
				this.fnAfterCloseFragment();
				this.fnLevelValidation().then(function(Status) {
					if (Status) {
						this._getNextLevelFields(item, level).then(function(levelStats) {
							if (levelStats) {
								// ---- Hierarchy build ----
								if (this.getView().byId(this.selectedField + "_hier")) {
									var levelNum = parseInt(level);
									var prevValue = "";
									if (levelNum > 1) {
										var prevFieldId = "SID_STUFE_" + (levelNum - 1) + "_hier";
										var prevField = this.getView().byId(prevFieldId);
										if (prevField) prevValue = prevField.getValue();
									}
									this.getView().byId(this.selectedField + "_hier").setValue(prevValue + item);
								}
								// var level = "L" + level;
								this._getNextLevelFields(item, level).then(function(levelStats1) {
									if (levelStats1) {
										var nextId = "SID_STUFE_" + (this.lastLevelIndex);
										var nextDesId = "SID_STUFE_" + (this.lastLevelIndex) + "_des";
										if (this.getView().byId(nextId)) {
											this.getView().byId(nextId).setEditable(true);
											if (this.vDescEdit === "C") {
												this.getView().byId(nextDesId).setEditable(true);
											} else {
												this.getView().byId(nextDesId).setEditable(false);
											}
										}

									}
								}.bind(this));

								// this.fnupdateNextLevel();
							}
						}.bind(this));
					}
				}.bind(this));

			}
			// this.fnnextfield();
		},

		fnAfterCloseFragment: function(oEvent) {
			this.fnF4fragopen().close();
			this.f4HelpFrag.destroy();
			this.f4HelpFrag = null;
		},

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
				if (this.selectedField === "SID_STUFE") {
					var op = !isNaN(sValue) ? sap.ui.model.FilterOperator.EQ : sap.ui.model.FilterOperator.Contains;

					aFilters.push(new sap.ui.model.Filter({
						filters: [
							new sap.ui.model.Filter("col1", op, sValue),
							new sap.ui.model.Filter("col2", op, sValue),
							new sap.ui.model.Filter("col3", op, sValue)
						],
						and: false
					}));
				} else {
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
			}

			oBinding.filter(aFilters, sap.ui.model.FilterType.Application);
		},

		// *-------------------------------------------------------------------------------------
		//				Function when Submit button press
		// *-------------------------------------------------------------------------------------
		fnSubmit: function() {
			var that = this;
			var vRadioSelectedIndex = this.byId("id_kdradio").getSelectedIndex();
			if (vRadioSelectedIndex === 0) {
				var bProdHier = "X";
			} else if (vRadioSelectedIndex === 1) {
				var bPackMatGrp = "X";
			} else if (vRadioSelectedIndex === 2) {
				var bMatGrp = "X";
			}
			// ------------------------------------------------------
			// 2. Build final code/desc field arrays
			// ------------------------------------------------------
			var aFinalCodes = [];
			var aFinalDescs = [];

			var aProdHierCodes = [
				"SID_STUFE_1", "SID_STUFE_2", "SID_STUFE_3",
				"SID_STUFE_4", "SID_STUFE_5", "SID_STUFE_6", "SID_STUFE_7", "ID_DES"
			];

			var aProdHierDescs = [
				"SID_STUFE_1_des", "SID_STUFE_2_des", "SID_STUFE_3_des",
				"SID_STUFE_4_des", "SID_STUFE_5_des", "SID_STUFE_6_des", "SID_STUFE_7_des"
			];

			var aPackCodes = ["SID_MAGRV"];
			var aPackDescs = ["SID_MAGRV_des"];
			// Added by Jones on 17.12.2025 (start)
			var aMatGrpCodes = ["ID_PH_MATKL"];
			var aMatGrpDesc = ["ID_PH_MATKL_des"];
			// Added by Jones on 17.12.2025 (end)

			if (bProdHier) {
				aFinalCodes = aProdHierCodes;
				aFinalDescs = aProdHierDescs;
			} else if (bPackMatGrp) {
				aFinalCodes = aPackCodes;
				aFinalDescs = aPackDescs;
			} else if (bMatGrp) {
				aFinalCodes = aMatGrpCodes;
				aFinalDescs = aMatGrpDesc;
			}

			// ------------------------------------------------------
			// 3. VALIDATE ALL MANDATORY FIELDS FIRST
			// ------------------------------------------------------
			var hasFrontendError = false;
			var VFirstErrorField = null; // for focusing
			for (var i = 0; i < aFinalCodes.length; i++) {
				var oCode = this.byId(aFinalCodes[i]);
				var oDesc = this.byId(aFinalDescs[i]);
				var sCode = oCode ? oCode.getValue().trim() : "";
				var sDesc = oDesc ? oDesc.getValue().trim() : "";
				// Validate code
				if (!sCode) {
					oCode.setValueState("Error");
					oCode.setValueStateText("Required");
					hasFrontendError = true;
					if (!VFirstErrorField) {
						VFirstErrorField = oCode;
					}
				} else {
					oCode.setValueState("None");
				}
				// Validate description
				if (oDesc) {
					if (!sDesc) {
						oDesc.setValueState("Error");
						oDesc.setValueStateText("Required");
						hasFrontendError = true;
						if (!VFirstErrorField) {
							VFirstErrorField = oDesc;
						}
					} else {
						oDesc.setValueState("None");
					}
				}
			}

			// STOP here if fields are not valid
			if (hasFrontendError) {
				if (VFirstErrorField) {
					VFirstErrorField.focus(); // <--- Focus first invalid field
				}
				ErrorHandler.showCustomSnackbar("Please enter all mandatory fields.", "Error", that);
				return;
			}

			var aPHBtns = [
				"SID_STUFE_1_BTN", "SID_STUFE_2_BTN", "SID_STUFE_3_BTN",
				"SID_STUFE_4_BTN", "SID_STUFE_5_BTN", "SID_STUFE_6_BTN",
				"SID_STUFE_7_BTN"
			];
			var aPMBtns = ["SID_MAGRV_BTN"];
			var aMgBtns = ["ID_PH_MATKL_BTN"];
			// Helper function to check if ANY button is NOT Available
			function hasNonAvailable(aBtns) {
				for (var j = 0; j < aBtns.length; j++) {
					var oBtn = that.byId(aBtns[j]);
					if (oBtn && oBtn.getText() !== "Available") {
						return true; // Found at least one non-available
					}
				}
				return false; // All were Available
			}

			// ------------------------------------------------------
			// CASE 1 → Only Product Hierarchy selected
			// ------------------------------------------------------
			if (bProdHier) {
				if (!hasNonAvailable(aPHBtns)) {
					ErrorHandler.showCustomSnackbar(
						"All Product Hierarchy levels are already Available. Submit is not allowed.",
						"Error",
						that
					);
					return;
				}
			}

			// ------------------------------------------------------
			// CASE 2 → Only Package Material Group selected
			// ------------------------------------------------------
			if (bPackMatGrp) {
				if (!hasNonAvailable(aPMBtns)) {
					ErrorHandler.showCustomSnackbar(
						"Package Material Group is already Available. Submit is not allowed.",
						"Error",
						that
					);
					return;
				}
			}
			// ------------------------------------------------------
			// CASE 3 → Only  Material Group selected
			// ------------------------------------------------------
			if (bMatGrp) {
				if (!hasNonAvailable(aMgBtns)) {
					ErrorHandler.showCustomSnackbar(
						"Material Group is already Available. Submit is not allowed.",
						"Error",
						that
					);
					return;
				}
			}

			var oKeyDataModel = this.getOwnerComponent().getModel("JM_KEYDATA");
			var vLevel = oKeyDataModel.getProperty("/Indicator");
			if (vLevel === undefined) {
				var oCtx = sap.ui.getCore().getModel("JM_ContextModel");
				var sLevel = oCtx.getProperty("/Level"); {
					vLevel = sLevel;
				}
			}
			if (vLevel === 'I') {
				this.fnCheckDuplicates(function(sStatus) {
					if (sStatus === "E") {
						return;
					} else {
						// ------------------------------------------------------
						// 5. Open Confirmation Popup
						// ------------------------------------------------------
						var oPopupModel = new sap.ui.model.json.JSONModel({
							title: "Confirmation",
							text: "Do you want to Submit this Request ?",
							negativeButton: "Cancel",
							negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
							positiveButton: "Proceed",
							positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Duplicate.svg",
							Indicator: "Save"
						});
						that.getView().setModel(oPopupModel, "JM_Popup");
						if (!that.oDialog) {
							that.oDialog = sap.ui.xmlfragment(
								that.getView().getId(),
								"PRDH.Fragment.ConfirmationExitPopup",
								that
							);
							that.getView().addDependent(that.oDialog);
						}
						that.oDialog.open();
					}
				});
			} else {
				var oPopupModel = new sap.ui.model.json.JSONModel({
					title: "Confirmation",
					text: "Do you want to Submit this Request ?",
					negativeButton: "Cancel",
					negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
					positiveButton: "Proceed",
					positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Duplicate.svg",
					Indicator: "Save"
				});
				that.getView().setModel(oPopupModel, "JM_Popup");
				if (!that.oDialog) {
					that.oDialog = sap.ui.xmlfragment(
						that.getView().getId(),
						"PRDH.Fragment.ConfirmationExitPopup",
						that
					);
					that.getView().addDependent(that.oDialog);
				}
				that.oDialog.open();
			}
		},
		// Added by Jones on 18.12.2025 (start)
		fnCheckDuplicates: function(fnCallback) {
			var that = this;

			function getIndicator(btnId) {
				var oBtn = that.byId(btnId);
				if (!oBtn) return "";

				var txt = oBtn.getText();

				if (txt === "Available") return "A";
				if (txt === "Change") return "C";
				if (txt === "new") return "N";

				return "";
			}

			var Ind1 = getIndicator("SID_STUFE_1_BTN");
			var Ind2 = getIndicator("SID_STUFE_2_BTN");
			var Ind3 = getIndicator("SID_STUFE_3_BTN");
			var Ind4 = getIndicator("SID_STUFE_4_BTN");
			var Ind5 = getIndicator("SID_STUFE_5_BTN");
			var Ind6 = getIndicator("SID_STUFE_6_BTN");
			var Ind7 = getIndicator("SID_STUFE_7_BTN");
			var IndM = getIndicator("SID_MAGRV_BTN");
			var IndMG = getIndicator("ID_PH_MATKL_BTN");

			var vMaterialGrp = this.byId("KID_MTART").getValue();
			var vMaterialGrpdes = this.byId("KID_MTART_DES").getValue();
			// Added by jones on 15.12.2025 (start)
			var vDivision = this.byId("KID_SPART").getValue();
			var vDivisionDesc = this.byId("KID_SPART_DES").getValue();
			// Added by jones on 15.12.2025 (end)
			var sTransid = this.Transid || "";
			var sWorkId = this.workId || "";
			// flags
			// Added by jones on 15.12.2025 (start)
			var vRadioValue = this.byId("id_kdradio").getSelectedIndex();
			var sPhind = vRadioValue === 0 ? "X" : "";
			var sPMgind = vRadioValue === 1 ? "X" : "";
			var sMgind = vRadioValue === 2 ? "X" : "";
			// Added by jones on 15.12.2025 (end)
			var vAppid = "";
			if (sPhind === "X") {
				vAppid = "PHC";
			} else if (sPMgind === "X") {
				vAppid = "PM";
			} else if (sMgind === "X") {
				vAppid = "MG";
			}
			// ----- Collect Product Hierarchy Fields -----
			var Level1 = this.byId("SID_STUFE_1").getValue();
			var Vtext1 = this.byId("SID_STUFE_1_des").getValue();

			var Level2 = this.byId("SID_STUFE_2").getValue();
			var Vtext2 = this.byId("SID_STUFE_2_des").getValue();

			var Level3 = this.byId("SID_STUFE_3").getValue();
			var Vtext3 = this.byId("SID_STUFE_3_des").getValue();
			var Level4 = this.byId("SID_STUFE_4").getValue();
			var Vtext4 = this.byId("SID_STUFE_4_des").getValue();
			var Level5 = this.byId("SID_STUFE_5").getValue();
			var Vtext5 = this.byId("SID_STUFE_5_des").getValue();
			var Level6 = this.byId("SID_STUFE_6").getValue();
			var Vtext6 = this.byId("SID_STUFE_6_des").getValue();
			var Level7 = this.byId("SID_STUFE_7").getValue();
			var Vtext7 = this.byId("SID_STUFE_7_des").getValue();
			var VHier1 = this.byId("SID_STUFE_1_hier").getValue().trim();
			var VHier2 = this.byId("SID_STUFE_2_hier").getValue().trim();
			var VHier3 = this.byId("SID_STUFE_3_hier").getValue().trim();
			var VHier4 = this.byId("SID_STUFE_4_hier").getValue().trim();
			var VHier5 = this.byId("SID_STUFE_5_hier").getValue().trim();
			var VHier6 = this.byId("SID_STUFE_6_hier").getValue().trim();
			var VHier7 = this.byId("SID_STUFE_7_hier").getValue().trim();
			// ----- Collect PackMatGrp -----
			var Magrv = "";
			var Bezei = "";
			var oWerks = this.byId("SID_MAGRV");
			if (oWerks) {
				Magrv = oWerks.getValue();
			}

			var oWerksDes = this.byId("SID_MAGRV_des");
			if (oWerksDes) {
				Bezei = oWerksDes.getValue();
			}
			// Added by Jones on 15.11.2025 (start)
			var vMatkl = this.byId("ID_PH_MATKL").getValue();
			var vWgbez = this.byId("ID_PH_MATKL_des").getValue();
			var vAppid = "";
			var vRadioSelected = this.getView().byId("id_kdradio").getSelectedIndex();
			if (vRadioSelected === 0) {
				vAppid = "PHC";
			} else if (vRadioSelected === 1) {
				vAppid = "PM";
			} else if (vRadioSelected === 2) {
				vAppid = "MG";
			}
			var vHier7 = this.getView().byId("SID_STUFE_7_hier").getValue();
			var vMatkl = this.getView().byId("ID_PH_MATKL").getValue();
			var vMagrv = this.getView().byId("SID_MAGRV").getValue();
			var aNavItems = [{
				Level1: Level1,
				Vtext1: Vtext1,
				Level2: Level2,
				Vtext2: Vtext2,
				Level3: Level3,
				Vtext3: Vtext3,
				Level4: Level4,
				Vtext4: Vtext4,
				Level5: Level5,
				Vtext5: Vtext5,
				Level6: Level6,
				Vtext6: Vtext6,
				Level7: Level7,
				Vtext7: Vtext7,
				Magrv: Magrv,
				Bezei: Bezei,
				Transid: sTransid,
				Status1: Ind1,
				Status2: Ind2,

				Status3: Ind3,
				Status4: Ind4,
				Status5: Ind5,
				Status6: Ind6,
				Status7: Ind7,
				Status1P: IndM,
				Hier1: VHier1,
				Hier2: VHier2,
				Hier3: VHier3,
				Hier4: VHier4,
				Hier5: VHier5,
				Hier6: VHier6,
				Hier7: VHier7,
				Matkl: vMatkl
			}];
			var vPayload = {
				AppId: vAppid,
				Msgtype: "",
				Transid: this.Transid,
				Message: "",
				Ind: "I",
				"NavPHItems": aNavItems
			};
			var that = this;

			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			oModel.create("/Product_KeyDataSet", vPayload, {
				success: function(oData) {

					busyDialog.close();
					if (oData.Msgtype === "E") {
						ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);
						fnCallback("E");
					} else {
						fnCallback("S");
					}
				},
				error: function(oResponse) {
					busyDialog.close();

				}
			});
			return status;
		},
		// Added by Jones on 18.12.2025 (end)
		fnConfirmationFragmentClose: function() {
			if (this.oDialog) {
				this.oDialog.close();
				this.oDialog.destroy();
				this.oDialog = null;
			}
		},

		fnSubmitConfirmation: function() {
			var state = this.getView().getModel("JM_Popup").getProperty("/Indicator");
			if (state === "Save") {
				if (this.level) {
					this.fnSendInitiatorData(this.level);
				} else {
					this.fnSendInitiatorData("I");
				}
			}
			if (state === "Reject") {
				this.fnreject_press();
			}
			if (state === "Draft") {
				this.fnSendInitiatorData("D");
			}
			this.fnConfirmationFragmentClose();
			if (state === "Exit") {

				var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				var oKeyDataModel = this.getOwnerComponent().getModel("JM_KEYDATA");
				var oContextModel = sap.ui.getCore().getModel("JM_ContextModel");
				if (oContextModel) {
					var ContextData = oContextModel.getData();
				}
				if (this.workId) {
					this.fnDeqeueTrans().then(function(status) {
						// oRouter.navTo("UWL");
						oCrossAppNav.toExternal({
							target: {
								semanticObject: "ZMDM_UWL_DB",
								action: "display"
							},
							appSpecificRoute: "uwl"
						});
					}.bind(this));

				} else if (oContextModel && Object.keys(oContextModel.getData() || {}).length > 0) {
					if (ContextData.Ind === "D" || ContextData.Ind === "T") {
						this.fnClearAllfields();
						oCrossAppNav.toExternal({
							target: {
								semanticObject: "ZMDM_UWL_DB",
								action: "display"
							},
							appSpecificRoute: "dashboard"

						});
					} else {
						oRouter.navTo("search");
					}
				} else if (oKeyDataModel) {
					var oViewstateModel = new sap.ui.model.json.JSONModel({
						fromSearch: false,
						fromKeyData: false,
						fromInitiator: true,
						fromUWL: false
					});
					sap.ui.getCore().setModel(oViewstateModel, "JM_ViewStateModel");
					oRouter.navTo("keydata");
				} else {
					oRouter.navTo("search");
				}
				this.fnClearAllfields();
			}
		},

		fnDeqeueTrans: function() {
			return new Promise(function(Resolve, Reject) {
				var oPayload = {
					Ind: "X",
					"Transid": this.Transid,
					"WiId": this.workId,
					"NavPHComments": [],
					"NavPHAttachments": []
				};
				var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
				oModel.create("/Product_KeyDataSet", oPayload, {
					success: function(oData) {
						Resolve(true);
					},
					error: function(oResponse) {

					}
				});
			}.bind(this));
		},

		fnSendInitiatorData: function(sInd) {
			var that = this;

			function getIndicator(btnId) {
				var oBtn = that.byId(btnId);
				if (!oBtn) return "";

				var txt = oBtn.getText();

				if (txt === "Available") return "A";
				if (txt === "Change") return "C";
				if (txt === "new") return "N";

				return "";
			}

			var Ind1 = getIndicator("SID_STUFE_1_BTN");
			var Ind2 = getIndicator("SID_STUFE_2_BTN");
			var Ind3 = getIndicator("SID_STUFE_3_BTN");
			var Ind4 = getIndicator("SID_STUFE_4_BTN");
			var Ind5 = getIndicator("SID_STUFE_5_BTN");
			var Ind6 = getIndicator("SID_STUFE_6_BTN");
			var Ind7 = getIndicator("SID_STUFE_7_BTN");
			var IndM = getIndicator("SID_MAGRV_BTN");
			var IndMG = getIndicator("ID_PH_MATKL_BTN");

			var vMaterialGrp = this.byId("KID_MTART").getValue();
			var vMaterialGrpdes = this.byId("KID_MTART_DES").getValue();
			// Added by jones on 15.12.2025 (start)
			var vDivision = this.byId("KID_SPART").getValue();
			var vDivisionDesc = this.byId("KID_SPART_DES").getValue();
			// Added by jones on 15.12.2025 (end)
			var sTransid = this.Transid || "";
			var sWorkId = this.workId || "";
			// flags
			// Added by jones on 15.12.2025 (start)
			var vRadioValue = this.byId("id_kdradio").getSelectedIndex();
			var sPhind = vRadioValue === 0 ? "X" : "";
			var sPMgind = vRadioValue === 1 ? "X" : "";
			var sMgind = vRadioValue === 2 ? "X" : "";
			// Added by jones on 15.12.2025 (end)
			var vAppid = "";
			if (sPhind === "X") {
				vAppid = "PHC";
			} else if (sPMgind === "X") {
				vAppid = "PM";
			} else if (sMgind === "X") {
				vAppid = "MG";
			}
			// ----- Collect Product Hierarchy Fields -----
			var Level1 = this.byId("SID_STUFE_1").getValue();
			var Vtext1 = this.byId("SID_STUFE_1_des").getValue();

			var Level2 = this.byId("SID_STUFE_2").getValue();
			var Vtext2 = this.byId("SID_STUFE_2_des").getValue();

			var Level3 = this.byId("SID_STUFE_3").getValue();
			var Vtext3 = this.byId("SID_STUFE_3_des").getValue();
			var Level4 = this.byId("SID_STUFE_4").getValue();
			var Vtext4 = this.byId("SID_STUFE_4_des").getValue();
			var Level5 = this.byId("SID_STUFE_5").getValue();
			var Vtext5 = this.byId("SID_STUFE_5_des").getValue();
			var Level6 = this.byId("SID_STUFE_6").getValue();
			var Vtext6 = this.byId("SID_STUFE_6_des").getValue();
			var Level7 = this.byId("SID_STUFE_7").getValue();
			var Vtext7 = this.byId("SID_STUFE_7_des").getValue();
			var VHier1 = this.byId("SID_STUFE_1_hier").getValue().trim();
			var VHier2 = this.byId("SID_STUFE_2_hier").getValue().trim();
			var VHier3 = this.byId("SID_STUFE_3_hier").getValue().trim();
			var VHier4 = this.byId("SID_STUFE_4_hier").getValue().trim();
			var VHier5 = this.byId("SID_STUFE_5_hier").getValue().trim();
			var VHier6 = this.byId("SID_STUFE_6_hier").getValue().trim();
			var VHier7 = this.byId("SID_STUFE_7_hier").getValue().trim();
			// ----- Collect PackMatGrp -----
			var Magrv = "";
			var Bezei = "";
			var oWerks = this.byId("SID_MAGRV");
			if (oWerks) {
				Magrv = oWerks.getValue();
			}

			var oWerksDes = this.byId("SID_MAGRV_des");
			if (oWerksDes) {
				Bezei = oWerksDes.getValue();
			}
			// Added by Jones on 15.11.2025 (start)
			var vMatkl = this.byId("ID_PH_MATKL").getValue();
			var vWgbez = this.byId("ID_PH_MATKL_des").getValue();
			// Added by Jones on 15.11.2025 (End)
			// ----- NAV ITEMS -----
			var aNavItems = [{
				Level1: Level1,
				Vtext1: Vtext1,
				Level2: Level2,
				Vtext2: Vtext2,
				Level3: Level3,
				Vtext3: Vtext3,
				Level4: Level4,
				Vtext4: Vtext4,
				Level5: Level5,
				Vtext5: Vtext5,
				Level6: Level6,
				Vtext6: Vtext6,
				Level7: Level7,
				Vtext7: Vtext7,
				Magrv: Magrv,
				Bezei: Bezei,
				Transid: sTransid,
				Status1: Ind1,
				Status2: Ind2,

				Status3: Ind3,
				Status4: Ind4,
				Status5: Ind5,
				Status6: Ind6,
				Status7: Ind7,
				Status1P: IndM,
				Hier1: VHier1,
				Hier2: VHier2,
				Hier3: VHier3,
				Hier4: VHier4,
				Hier5: VHier5,
				Hier6: VHier6,
				Hier7: VHier7,
				Matkl: vMatkl, // Added by jones on 15.12.2025
				Wgbez: vWgbez, // Added by jones on 15.12.2025
				Status1M: IndMG // Added by jones on 16.12.2025

			}];
			var commentsValue = this.getView().byId("id_textarea").getValue();
			// ----- FINAL PAYLOAD -----
			var oPayload = {
				"AppId": vAppid,
				"Transid": this.Transid,
				"WiId": "",
				"Msgtype": "",
				"Message": "",
				"Ind": sInd,
				"Mtart": vMaterialGrp,
				"Mtbez": vMaterialGrpdes,
				"Phind": sPhind,
				"Mgind": sMgind,
				"Pmgind": sPMgind, // Added by jones on 15.12.2025
				"Spart": vDivision, // Added by jones on 15.12.2025
				"SpartDesc": vDivisionDesc, // Added by jones on 15.12.2025
				"NavPHItems": aNavItems,
				"NavPHComments": [],
				"NavPHAttachments": []
			};
			oPayload.NavPHComments.push({
				"Comments": commentsValue
			});
			if (sTransid !== "") {
				oPayload.Transid = sTransid;
			}

			if (sWorkId !== "") {
				oPayload.WiId = sWorkId;
			}
			// Attachments
			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			var aTableRows = oTableModel.getProperty("/List") || [];
			aTableRows.forEach(function(row) {
				oPayload.NavPHAttachments.push({
					SerialNo: row.AttachmentNo.toString().padStart(10, "0"),
					DocType: row.DocType || "",
					FileName: row.TagName || "",
					MimeType: row.MimeType || "",
					Xstring: row.Xstring || "",
					FileSize: row.Size,
					Username: row.Username,
					CreatedOn: row.CreatedOn
				});
			});

			var oParmModel = this.getOwnerComponent().getModel("JM_ParmModel");
			if (oParmModel && Object.keys(oParmModel.getData() || {}).length > 0) {
				var oParams = oParmModel.getData();
				// 1. Read UI values
				Object.keys(oParams).forEach(function(key) {
					var sControlId = oParams[key];
					var oControl = that.byId(sControlId);

					if (!oControl) return;

					var value = "";
					// Added by Jones on 17.12.2025 (start)
					if (sControlId === "KID_PM" || sControlId === "KID_MG") {

						var iIndex = that.byId("id_kdradio").getSelectedIndex();

						if (iIndex === 1) {
							value = "PM";
						} else if (iIndex === 2) {
							value = "MG";
						}

					}
					// Added by Jones on 17.12.2025 (end)
					if (oControl.isA("sap.m.Input")) {
						value = oControl.getValue();
					} else if (oControl.isA("sap.m.CheckBox")) {
						value = oControl.getSelected() ? "X" : "";
					}

					oParams[key] = value;
				});

				// 2. Remove "Id" from keys
				var newParams = {};
				Object.keys(oParams).forEach(function(key) {
					var newKey = key.replace("Id", ""); // e.g. WfParm1Id → WfParm1
					newParams[newKey] = oParams[key];
				});

				// 3. Update model (optional)
				oParmModel.setData(newParams);
				oParmModel.refresh();

				// 4. Add dynamic params into Payload
				Object.keys(newParams).forEach(function(key) {
					oPayload[key] = newParams[key];
				});

				this.fnsenBackendLogic(oPayload);
			} else {
				this.fnparmSetCall(oPayload.AppId).then(function(status) {
					if (status) {
						var oParams = oParmModel.getData();
						// 1. Read UI values
						Object.keys(oParams).forEach(function(key) {
							var sControlId = oParams[key];
							var oControl = that.byId(sControlId);
							if (!oControl) return;
							var value = "";
							// Added by Jones on 17.12.2025 (start)
							if (sControlId === "KID_PM" || sControlId === "KID_MG") {
								var iIndex = that.byId("id_kdradio").getSelectedIndex();
								if (iIndex === 1) {
									value = "PM";
								} else if (iIndex === 2) {
									value = "MG";
								}
							}
							// Added by Jones on 17.12.2025 (end)
							if (oControl.isA("sap.m.Input")) {
								value = oControl.getValue();
							} else if (oControl.isA("sap.m.CheckBox")) {
								value = oControl.getSelected() ? "X" : "";
							}

							oParams[key] = value;
						});

						// 2. Remove "Id" from keys
						var newParams = {};
						Object.keys(oParams).forEach(function(key) {
							var newKey = key.replace("Id", ""); // e.g. WfParm1Id → WfParm1
							newParams[newKey] = oParams[key];
						});

						// 3. Update model (optional)
						oParmModel.setData(newParams);
						oParmModel.refresh();

						// 4. Add dynamic params into Payload
						Object.keys(newParams).forEach(function(key) {
							oPayload[key] = newParams[key];
						});
					}
					that.fnsenBackendLogic(oPayload);
				});
			}

		},

		fnsenBackendLogic: function(oPayload) {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			busyDialog.open();

			// added by sabarish 
			var desc = this.getView().byId("ID_DES");
			if (desc) {
				oPayload.Description = desc.getValue();
			}

			oModel.create("/Product_KeyDataSet", oPayload, {
				success: function(oData) {

					busyDialog.close();
					if (oData.Msgtype !== "E") {
						var oPopupModel = new sap.ui.model.json.JSONModel({
							title: "Confirmation",
							text: oData.Message,
							negativeButton: "Cancel",
							negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
							positiveButton: "Ok",
							positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Duplicate.svg"

						});
						that.getView().setModel(oPopupModel, "JM_Popup");
						if (!that.oSuccessdialog) {
							that.oSuccessdialog = sap.ui.xmlfragment(that.getView().getId(),
								"PRDH.Fragment.SucessDialog", // Fragment path
								that
							);
							that.getView().addDependent(that.oSuccessdialog);
						}
						busyDialog.close();
						that.oSuccessdialog.open();
					} else if (oData.Msgtype === "E") {
						busyDialog.close();
						ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);
					}
				},
				error: function(oResponse) {
					busyDialog.close();
					var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
					oRouter.navTo("Initiator");
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},

		// *-------------------------------------------------------------------------------------
		//				Function when reject button press
		// *-------------------------------------------------------------------------------------
		fnReject: function() {
			var oTextArea = this.byId("id_textarea");
			var that = this;
			var sValue = oTextArea.getValue().trim();
			if (sValue === "") {
				oTextArea.focus();
				ErrorHandler.showCustomSnackbar("Please enter comments", "Information", this);
				return; // stop further process
			} else {
				// Example Popup model data
				var oPopupModel = new sap.ui.model.json.JSONModel({
					title: "Confirmation",
					text: "Do you want Reject this Product Hierarchy?",
					negativeButton: "No",
					negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
					positiveButton: "Yes",
					positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Duplicate.svg",
					Indicator: "Reject"
				});

				// Set model with name
				this.getView().setModel(oPopupModel, "JM_Popup");
				if (!this.oDialog) {
					this.oDialog = sap.ui.xmlfragment(this.getView().getId(),
						"PRDH.Fragment.ConfirmationExitPopup", // Fragment path
						this
					);
					this.getView().addDependent(this.oDialog);
				}

				this.oDialog.open();
			}
		},

		fnreject_press: function() {
			var oContextModel = sap.ui.getCore().getModel("JM_ContextModel");
			var oData = oContextModel.getData();
			var oPayload = {
				"AppId": oData.Appid,
				"Ind": "E",
				"WiId": oData.WiId,
				"Transid": oData.Transid

			};
			oPayload.NavPHComments = [];
			oPayload.NavPHAttachments = [];

			var commentsValue = this.getView().byId("id_textarea").getValue();
			oPayload.NavPHComments.push({
				"Comments": commentsValue
			});
			var that = this;
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			var aTableRows = oTableModel.getProperty("/List") || [];
			aTableRows.forEach(function(row) {
				oPayload.NavPHAttachments.push({
					SerialNo: row.AttachmentNo.toString().padStart(10, "0"),
					DocType: row.DocType || "",
					FileName: row.TagName || "",
					MimeType: row.MimeType || "",
					Xstring: row.Xstring || "",
					FileSize: row.Size,
					Username: row.Username,
					CreatedOn: row.CreatedOn
				});
			});

			var oRejectModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			busyDialog.open();
			oRejectModel.create("/Product_KeyDataSet", oPayload, {
				success: function(odata) {
					busyDialog.close();
					if (odata.MsgType === "E") {
						ErrorHandler.showCustomSnackbar("Error occurs on Rejection", "Error", that);

					} else {
						// Show snackbar
						ErrorHandler.showCustomSnackbar(odata.Message, "success", that);
						oContextModel = sap.ui.getCore().getModel("JM_ContextModel");
						var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
						var oKeyDataModel = that.getOwnerComponent().getModel("JM_KEYDATA");
						if (oContextModel) {
							var ContextData = oContextModel.getData();
						}
						if (that.workId) {
							// oRouter.navTo("UWL");

							oCrossAppNav.toExternal({
								target: {
									semanticObject: "ZMDM_UWL_DB",
									action: "display"
								},
								appSpecificRoute: "uwl"

							});
						} else if (oContextModel && Object.keys(oContextModel.getData() || {}).length > 0) {
							if (ContextData.Ind === "D" || ContextData.Ind === "T") {
								that.fnClearAllfields();
								oCrossAppNav.toExternal({
									target: {
										semanticObject: "ZMDM_UWL_DB",
										action: "display"
									},
									appSpecificRoute: "dashboard"

								});
							} else {
								oRouter.navTo("search");
							}

						} else if (oKeyDataModel) {
							var oViewstateModel = new sap.ui.model.json.JSONModel({
								fromSearch: false,
								fromKeyData: false,
								fromInitiator: true,
								fromUWL: false
							});
							sap.ui.getCore().setModel(oViewstateModel, "JM_ViewStateModel");
							oRouter.navTo("keydata");
						} else {
							oRouter.navTo("search");
						}
						that.fnClearAllfields();

						that.onSendBackClose();

					}
				},
				error: function(oResponse) {
					busyDialog.close();
					ErrorHandler.showCustomSnackbar("HTTP Respond Failed", "Error", that);
				}
			});

		},

		//*-----------------------------------------------------------------------------------------
		//					 Sendback functionalities
		// *----------------------------------------------------------------------------------------
		fnSendBackDialog: function() {
			var that = this;
			var oTextArea = this.byId("id_textarea");
			var sValue = oTextArea.getValue().trim();
			if (sValue === "") {
				ErrorHandler.showCustomSnackbar(i18n.getText("enterComments"), "Information", that);
				return;
			} else {
				var olevelDetailsSet = this.getOwnerComponent().getModel("JM_CONFIG");
				busyDialog.open();
				olevelDetailsSet.read("/Level_DetailsSet", {
					filters: [
						new sap.ui.model.Filter("Transid", sap.ui.model.FilterOperator.EQ, this.Transid)
					],
					success: function(oData) {
						busyDialog.close();
						// 1. Build unique Level list
						var aLevels = [];
						var oLevelMap = {};
						var oMinApproverMap = {};
						for (var i = 0; i < oData.results.length; i++) {
							var sLvl = oData.results[i].Lvl;
							var sMinApprover = oData.results[i].MinApprover;
							if (!oLevelMap[sLvl]) {
								oLevelMap[sLvl] = true;
								aLevels.push({
									Level: sLvl
								});
								oMinApproverMap[sLvl] = sMinApprover;
							}
						}

						// 2. Set Level Model
						var oLevelModel = new sap.ui.model.json.JSONModel({
							LevelData: aLevels
						});
						that.getView().setModel(oLevelModel, "JM_LevelModel");
						// 3. Set MinApprover Model
						var oMinApproverModel = new sap.ui.model.json.JSONModel({
							MinApproverMap: oMinApproverMap
						});
						that.getView().setModel(oMinApproverModel, "JM_MinApproverModel");

						// 3. Set Agent Model (empty first)
						var oAgentModel = new sap.ui.model.json.JSONModel({
							Agents: [] // empty initially
						});
						that.getView().setModel(oAgentModel, "JM_AgentModel");

						// keep full data in view for filtering
						that._allAgentData = oData.results;

						that.fnOpenSendBackDialog();

						var oLevelTable = sap.ui.getCore().byId("idLevelTable"); // adjust ID if needed
						if (oLevelTable && aLevels.length > 0) {
							for (var j = 0; j < aLevels.length; j++) {
								if (aLevels[j].Level === "L0") {
									oLevelTable.setSelectedIndex(j);
									that._currentLevel = "L0";
									that._currentLevelIndex = j;
									that._loadAgentsForLevel("L0"); // load agents for L0
									break;
								}
							}
						}
					},
					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
					}
				});
			}
		},

		fnOpenSendBackDialog: function() {
			// Open dialog
			if (!this.sendBackDialog) {
				this.sendBackDialog = sap.ui.xmlfragment("PRDH.Fragment.SendBack", this);
				this.getView().addDependent(this.sendBackDialog);
			}
			this.sendBackDialog.open();
		},

		onLevelSelect: function(oEvent) {
			var that = this;
			var oTable = oEvent.getSource();
			var iIndex = oTable.getSelectedIndex();
			var oAgentModel = this.getView().getModel("JM_AgentModel");

			// nothing selected â†’ clear table
			if (iIndex === -1) {
				oAgentModel.setProperty("/Agents", []);
				this._currentLevelIndex = -1;
				this._currentLevel = null;
				return;
			}

			var oContext = oTable.getContextByIndex(iIndex);
			var sSelectedLevel = oContext.getObject().Level;

			// 1. Check if any checkbox is edited
			var aAgents = oAgentModel.getData().Agents;
			var editedFlag = false;
			for (var i = 0; i < aAgents.length; i++) {
				if (aAgents[i].checkboxstate === false) {
					editedFlag = true;
					break;
				}
			}

			if (editedFlag && this._currentLevel !== null && this._currentLevel !== sSelectedLevel) {
				// store the level the user wants to switch to
				this._pendingLevel = sSelectedLevel;
				this._pendingLevelIndex = iIndex;
				// revert selection temporarily to previous level
				oTable.setSelectedIndex(this._currentLevelIndex);
				// open discard confirmation fragment

				// Example Popup model data
				var oPopupModel = new sap.ui.model.json.JSONModel({
					title: "Confirmation",
					text: i18n.getText("confirmLevelChange"),
					negativeButton: "No",
					negativeIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
					positiveButton: "Yes",
					positiveIcon: that.getView().getModel("JM_ImageModel").getProperty("/path") + "Continue.svg",
					Indicator: "SendBack"
				});

				// Set model with name
				this.getView().setModel(oPopupModel, "JM_Popup");
				if (!this.oDialog) {
					this.oDialog = sap.ui.xmlfragment(this.getView().getId(),
						"PRDH.Fragment.ConfirmationExit", // Fragment path
						this
					);
					this.getView().addDependent(this.oDialog);
				}

				this.oDialog.open();

			} else {
				// --- fetch MinApprover from model ---
				var oMinApproverModel = this.getView().getModel("JM_MinApproverModel");
				var sMinApprover = oMinApproverModel.getProperty("/MinApproverMap/" + sSelectedLevel);

				// --- set label text via model ---
				if (sSelectedLevel === "L0") {
					oMinApproverModel.setProperty("/LabelText", "");
				} else {
					if (sMinApprover) {
						oMinApproverModel.setProperty("/LabelText", i18n.getText("minSendBackCount", [sMinApprover]));
					} else {
						oMinApproverModel.setProperty("/LabelText", "");
					}
				}
				// normal load
				this._loadAgentsForLevel(sSelectedLevel);
				this._currentLevel = sSelectedLevel;
				this._currentLevelIndex = iIndex;
			}
		},

		fnsendBack: function() {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

			busyDialog.open();
			var oLevelModel = this.getView().getModel("JM_LevelModel");
			var oAgentModel = this.getView().getModel("JM_AgentModel");

			// 1. Get currently selected level
			var aLevels = oLevelModel.getProperty("/LevelData");
			var sCurrentLevel = null;
			for (var i = 0; i < aLevels.length; i++) {
				if (i === this._currentLevelIndex) {
					sCurrentLevel = aLevels[i].Level;
					break;
				}
			}

			if (!sCurrentLevel) {
				ErrorHandler.showCustomSnackbar(i18n.getText("selectLevelBeforeSubmit"), "Warning", this);
				busyDialog.close();
				return;
			}

			// 2. Filter agents with checkboxstate = true
			var aAllAgents = oAgentModel.getProperty("/Agents");
			var aSelectedAgents = [];
			for (var j = 0; j < aAllAgents.length; j++) {
				if (aAllAgents[j].checkboxstate === true) {
					aSelectedAgents.push({
						Agents: aAllAgents[j].Agent
					});
				}
			}

			if (aSelectedAgents.length === 0) {
				ErrorHandler.showCustomSnackbar(i18n.getText("agentSelectionRequired"), "Warning", this);
				busyDialog.close();
				return;
			}
			var that = this;

			// 3. Build payload
			var payload = {
				"Ind": "S",
				"Transid": this.Transid,
				"WiId": this.workId,
				"Lvl": sCurrentLevel,
				"NavPHAgent": aSelectedAgents,
				"AppId": this.AppId
			};
			payload.NavPHComments = [];
			payload.NavPHAttachments = [];

			var commentsValue = this.getView().byId("id_textarea").getValue();

			payload.NavPHComments.push({
				"Comments": commentsValue
			});

			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			var aTableRows = oTableModel.getProperty("/List") || [];
			aTableRows.forEach(function(row) {
				payload.NavPHAttachments.push({
					SerialNo: row.AttachmentNo.toString().padStart(10, "0"),
					DocType: row.DocType || "",
					FileName: row.TagName || "",
					MimeType: row.MimeType || "",
					Xstring: row.Xstring || "",
					FileSize: row.Size,
					Username: row.Username,
					CreatedOn: row.CreatedOn
				});
			});

			var oSendBackService = this.getOwnerComponent().getModel("JM_PRODHIER");
			busyDialog.open();
			oSendBackService.create("/Product_KeyDataSet", payload, {
				success: function(oData) {
					busyDialog.close();
					if (oData.MsgType === "E") {
						ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);

					} else {
						// Show snackbar
						// ErrorHandler.showCustomSnackbar(oData.Message, "success", that);
						var oContextModel = sap.ui.getCore().getModel("JM_ContextModel");
						var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
						var oKeyDataModel = that.getOwnerComponent().getModel("JM_KEYDATA");
						if (oContextModel) {
							var ContextData = oContextModel.getData();
						}
						if (that.workId) {
							// oRouter.navTo("UWL");

							oCrossAppNav.toExternal({
								target: {
									semanticObject: "ZMDM_UWL_DB",
									action: "display"
								},
								appSpecificRoute: "uwl"

							});
						} else if (oContextModel && Object.keys(oContextModel.getData() || {}).length > 0) {
							if (ContextData.Ind === "D" || ContextData.Ind === "T") {
								that.fnClearAllfields();
								oCrossAppNav.toExternal({
									target: {
										semanticObject: "ZMDM_UWL_DB",
										action: "display"
									},
									appSpecificRoute: "dashboard"

								});
							} else {
								oRouter.navTo("search");
							}

						} else if (oKeyDataModel) {
							var oViewstateModel = new sap.ui.model.json.JSONModel({
								fromSearch: false,
								fromKeyData: false,
								fromInitiator: true,
								fromUWL: false
							});
							sap.ui.getCore().setModel(oViewstateModel, "JM_ViewStateModel");
							oRouter.navTo("keydata");
						} else {
							oRouter.navTo("search");
						}
						that.fnClearAllfields();
						ErrorHandler.showCustomSnackbar(oData.Message, "success", that);
						that.onSendBackClose();

					}

				},
				error: function(oResponse) {
					busyDialog.close();
					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},
		// Helper: load agents for a level
		_loadAgentsForLevel: function(sLevel) {
			var aFilteredAgents = [];
			for (var i = 0; i < this._allAgentData.length; i++) {
				if (this._allAgentData[i].Lvl === sLevel) {
					aFilteredAgents.push({
						indicator: this.changeidicatortoImage(this._allAgentData[i].Submit),
						Agent: this._allAgentData[i].Agent,
						AgentName: this._allAgentData[i].Name,
						checkboxstate: true, // default unchecked
						checkboxEditable: true
					});
				}
			}
			this.getView().getModel("JM_AgentModel").setProperty("/Agents", aFilteredAgents);

			// store current level
			this._currentLevel = sLevel;
		},

		changeidicatortoImage: function(value) {
			if (value === "X") {
				return this.getView().getModel("JM_ImageModel").getProperty("/path") + "NodesGrn.svg";
			} else {
				return this.getView().getModel("JM_ImageModel").getProperty("/path") + "NodesOrg.svg"; // your red icon
			}
		},

		onSendBackClose: function(oEvent) {
			if (this.sendBackDialog) {
				this.sendBackDialog.close();
				this.sendBackDialog.destroy();
				this.sendBackDialog = null;
			}
			// Clear Level and Agent models
			var oLevelModel = this.getView().getModel("JM_LevelModel");
			var oAgentModel = this.getView().getModel("JM_AgentModel");

			if (oLevelModel) {
				oLevelModel.setProperty("/LevelData", []);
			}
			if (oAgentModel) {
				oAgentModel.setProperty("/Agents", []);
			}
		},

		// *-------------------------------------------------------------------------------------
		//		Function for Attachments logic (added by sabarish babu 07-10-2025)
		// *-------------------------------------------------------------------------------------
		fnUploadButtonpres: function() {
			var oFileUploader = this.byId("hiddenUploader");
			if (oFileUploader) {
				var oDomRef = oFileUploader.getFocusDomRef();
				if (oDomRef) {
					oDomRef.click(); // Opens file dialog
				}
			}
		},

		fnFileSelected: function(oEvent) {
			var that = this;
			var oFileUploader = this.byId("hiddenUploader");
			var oFile = oEvent.getParameter("files")[0];
			if (oFile) {
				if (oFile.size > 2 * 1024 * 1024) {
					this.showCustomSnackbar("Each file must be less that 2 MB", "Information", that);
					oFileUploader.setValue(""); // Reset to allow re-selection
					return;
				}
				var reader = new FileReader();
				reader.onload = function(e) {
					var sBase64 = e.target.result.split(",")[1];
					var oTableModel = that.getView().getModel("JM_DocTypeModel");
					var aRows = oTableModel.getProperty("/List") || [];
					var bDuplicate = aRows.some(function(row) {
						return row.Xstring === sBase64;
					});
					if (oFileUploader) {
						oFileUploader.setValue("");
					}
					if (bDuplicate) {
						ErrorHandler.showCustomSnackbar(i18n.getText("fileAlreadyUploaded"), "Error");
						return;
					}
					// Store temporarily
					var oModel = that.getView().getModel();
					oModel.setProperty("/uploadedFileName", oFile.name);
					oModel.setProperty("/uploadedFileContent", sBase64);
					oModel.setProperty("/uploadedMimeType", oFile.type);
					oModel.setProperty("/uploadedFileSize", oFile.size);
				};
				reader.readAsDataURL(oFile);
			}
		},

		fnMassDownload: function() {
			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			var aFiles = oTableModel.getProperty("/List") || [];

			if (aFiles.length === 0) {
				sap.m.MessageToast.show("No files to download.");
				return;
			}

			// Disable the button temporarily to prevent double click (optional)
			var oButton = this.getView().byId("id_massDownloadButton");
			if (oButton) {
				oButton.setEnabled(false);
			}

			var zip = new JSZip();

			aFiles.forEach(function(file) {
				if (file.Xstring && file.TagName) {
					var byteCharacters = atob(file.Xstring);
					var byteNumbers = new Array(byteCharacters.length);
					for (var i = 0; i < byteCharacters.length; i++) {
						byteNumbers[i] = byteCharacters.charCodeAt(i);
					}
					var byteArray = new Uint8Array(byteNumbers);

					zip.file(file.TagName, byteArray);
				}
			});

			// Create the ZIP file
			zip.generateAsync({
				type: "blob"
			}).then(function(content) {
				var zipName = "Attachments.zip";

				// Create temporary <a> element and trigger download
				var link = document.createElement("a");
				link.style.display = "none";
				link.href = URL.createObjectURL(content);
				link.download = zipName;

				document.body.appendChild(link);
				link.click();

				// Clean up
				setTimeout(function() {
					URL.revokeObjectURL(link.href);
					document.body.removeChild(link);

					if (oButton) {
						oButton.setEnabled(true); // Re-enable after download
					}
				}, 100);
			}).catch(function(err) {
				// console.error("ZIP creation failed: ", err);
				sap.m.MessageBox.error("Failed to generate ZIP file.");
				if (oButton) {
					oButton.setEnabled(true);
				}
			});
		},

		fnDownloadSingleFile: function(oEvent) {
			var oContext = oEvent.getSource().getBindingContext("JM_DocTypeModel");
			var oFile = oContext.getObject(); // contains Xstring and TagName

			if (!oFile || !oFile.Xstring || !oFile.TagName) {
				sap.m.MessageToast.show("File data is missing.");
				return;
			}

			try {
				var byteCharacters = atob(oFile.Xstring);
				var byteNumbers = new Array(byteCharacters.length);
				for (var i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i);
				}
				var byteArray = new Uint8Array(byteNumbers);
				var blob = new Blob([byteArray]);

				// Create temporary <a> element to trigger download
				var link = document.createElement("a");
				link.href = URL.createObjectURL(blob);
				link.download = oFile.TagName;
				document.body.appendChild(link);
				link.click();

				// Cleanup
				setTimeout(function() {
					URL.revokeObjectURL(link.href);
					document.body.removeChild(link);
				}, 100);
			} catch (e) {
				sap.m.MessageBox.error("Failed to download file.");
			}
		},

		fnAttachPress: function() {
			var oView = this.getView();
			var oMainModel = oView.getModel();
			var oTableModel = oView.getModel("JM_DocTypeModel");
			var aRows = oTableModel.getProperty("/List") || [];
			var sFileName = oMainModel.getProperty("/uploadedFileName");
			var sBase64 = oMainModel.getProperty("/uploadedFileContent");
			var sMimeType = oMainModel.getProperty("/uploadedMimeType");
			var iNewFileSize = oMainModel.getProperty("/uploadedFileSize") || 0;
			var sTagNameInput = oView.byId("id_tagInput").getValue().trim();
			var sDocTypeKey = oView.byId("id_varients").getSelectedKey();
			if (!sFileName || !sBase64) {
				// sap.m.MessageToast.show("Please select a file.");
				return;
			}
			var bFileExists = aRows.some(function(row) {
				return row.TagName === sFileName || row.Xstring === sBase64;
			});
			if (bFileExists) {
				ErrorHandler.showCustomSnackbar(i18n.getText("fileAlreadyUploaded"), "Error", this);
				return;
			}
			var iTotalSize = iNewFileSize; // start with new file
			aRows.forEach(function(row) {
				if (row.Size) {
					iTotalSize += row.Size;
				}
			});
			if (iTotalSize > 10 * 1024 * 1024) {
				ErrorHandler.showCustomSnackbar(i18n.getText("totalFileSizeLimit"), "Error", this);
				return;
			}
			var fileSizeBytes = iNewFileSize;
			// Convert to readable size string
			var fileSizeDisplay = "";
			if (fileSizeBytes < 1024) {
				fileSizeDisplay = fileSizeBytes + " Bytes";
			} else if (fileSizeBytes < 1024 * 1024) {
				fileSizeDisplay = (fileSizeBytes / 1024).toFixed(2) + " KB";
			} else {
				fileSizeDisplay = (fileSizeBytes / (1024 * 1024)).toFixed(2) + " MB";
			}
			var aParts = sFileName.split(".");
			var sExtension = aParts.length > 1 ? aParts.pop() : "";
			var sNameWithoutExt = aParts.join(".");
			var sTagNameFinal = sTagNameInput || sNameWithoutExt || "untitled";
			var sFinalFilename = sTagNameFinal + (sExtension ? "." + sExtension : "");
			var bTagExists = aRows.some(function(row) {
				return row.TagName === sFinalFilename;
			});
			if (bTagExists) {
				ErrorHandler.showCustomSnackbar(i18n.getText("tagNameAlreadyUsed", [sTagNameFinal]), "Error", this);
				return;
			}
			var sDocTypeFinal = sDocTypeKey || "Default";
			aRows.push({
				AttachmentNo: aRows.length + 1,
				TagName: sFinalFilename,
				DocType: sDocTypeFinal,
				MimeType: sMimeType,
				Xstring: sBase64,
				Size: fileSizeDisplay,
				CreatedOn: new Date(),
				Username: this.User
			});
			oTableModel.setProperty("/List", aRows);
			this.fnUpdateStateMassDownload();
			// Clear
			oMainModel.setProperty("/uploadedFileName", "");
			oMainModel.setProperty("/uploadedFileContent", "");
			oMainModel.setProperty("/uploadedMimeType", "");
			oMainModel.setProperty("/uploadedFileSize", 0);
			oView.byId("id_tagInput").setValue("");
			oView.byId("id_varients").setSelectedKey("");
		},

		fnUpdateStateMassDownload: function() {
			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			var aFiles = oTableModel.getProperty("/List") || [];

			var oButton = this.getView().byId("id_massDownloadButton");
			if (oButton) {
				oButton.setEnabled(aFiles.length > 1);
			}
		},

		fnDeleteAttachRow: function(oEvent) {
			var oModel = this.getView().getModel("JM_DocTypeModel");
			var aData = oModel.getProperty("/List");
			var oContext = oEvent.getSource().getBindingContext("JM_DocTypeModel");
			var iIndex = oContext.getPath().split("/").pop();

			var JmUsermodel = this.getView().getModel("JM_UserModel");
			var vCurrentUser = JmUsermodel.getData().Agent;
			var oRowData = oContext.getObject();
			var vRowUser = oRowData.CreatedBy;
			// Compare user with row Agent
			if (vCurrentUser !== vRowUser && vRowUser !== "") {
				ErrorHandler.showCustomSnackbar(i18n.getText("del_attach_warn"), "Error", this);
				return; // Stop deletion
			}
			// Remove the selected item
			aData.splice(iIndex, 1);

			// Reassign AttachmentNo in order
			aData.forEach(function(item, idx) {
				item.AttachmentNo = idx + 1;
			});

			// Update the model
			oModel.setProperty("/List", aData);

			// Refresh UI state if needed
			this.fnUpdateStateMassDownload();
		},

		// *-------------------------------------------------------------------------------------
		//				Function when check the code in QAS PRD
		// *-------------------------------------------------------------------------------------

		fncodecheck: function(oEvent) {
			var that = this;
			var vLevel = this.byId("SID_STUFE");
			var vLevelValue = vLevel.getValue().trim();
			if (!vLevelValue) {
				ErrorHandler.showCustomSnackbar(i18n.getText("codemsg"), "Error", that);
				vLevel.setValueState("Error");
				vLevel.setValueStateText(i18n.getText("codemsg"));
				return;
			}
			var vProdHierClient = this.byId("idSelect").getSelectedKey();
			var oPayload = {
				"Code": vLevelValue,
				"Ind": "C",
				"Client": vProdHierClient,
				NavPHItems: []
			};

			var oModel = this.getOwnerComponent().getModel("JM_PRODHIER");

			busyDialog.open();

			oModel.create("/Product_KeyDataSet", oPayload, {
				success: function(oData) {
					busyDialog.close();
					var item = oData.NavPHItems.results[0];
					var Vchecklvl = item.StatusC;
					var Vstatus = that.getIndicatorStatusChck(Vchecklvl);
					if (oData.Msgtype === "E") {
						ErrorHandler.showCustomSnackbar(oData.Message, "Error", that);
						that.updateIndicator(
							"SID_STUFE_IND", // HBox
							"SID_STUFE_BTN", // Button
							"SID_STUFE_des",
							Vstatus
						);
						that.getView().byId("SID_STUFE_des").setValue(item.DescC);
						that.getView().byId("SID_STUFE_lev").setValue(item.LevelC);
						return;
					}
					if (oData.Msgtype !== "E") {

						if (Vstatus !== "")
							that.updateIndicator(
								"SID_STUFE_IND", // HBox
								"SID_STUFE_BTN", // Button
								"SID_STUFE_des",
								Vstatus // available / new / change / clear
							);
						that.getView().byId("SID_STUFE_des").setValue(item.DescC);
						that.getView().byId("SID_STUFE_lev").setValue(item.LevelC);

					}
				},

				error: function(oResponse) {
					busyDialog.close();

					var sMessage = ErrorHandler.parseODataError(oResponse);
					ErrorHandler.showCustomSnackbar(sMessage, "Error", that);
				}
			});
		},

		onSelectChange: function(oEvent) {
			this.getView().byId("SID_STUFE_des").setValue("");
			this.getView().byId("SID_STUFE_lev").setValue("");
			this.getView().byId("SID_STUFE").setValue("");
			this.updateIndicator(
				"SID_STUFE_IND", // HBox
				"SID_STUFE_BTN", // Button
				"SID_STUFE_des",
				"clear"
			);

		},

		// *-------------------------------------------------------------------------------------
		//				Function when draft button press the dialog opens
		// *-------------------------------------------------------------------------------------
		fnDraftPress: function() {
			var vComments = this.getView().byId("id_textarea");
			if (vComments.getValue() === "") {
				ErrorHandler.showCustomSnackbar(i18n.getText("enter_comment"), "Information", this);
				vComments.focus();
				return;
			}
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: "Confirmation",
				text: "Do you want to save as draft  ?",
				negativeButton: "Cancel",
				negativeIcon: this.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
				positiveButton: "Proceed",
				positiveIcon: this.getView().getModel("JM_ImageModel").getProperty("/path") + "Duplicate.svg",
				Indicator: "Draft"
			});

			this.getView().setModel(oPopupModel, "JM_Popup");

			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment(
					this.getView().getId(),
					"PRDH.Fragment.ConfirmationExitPopup",
					this
				);
				this.getView().addDependent(this.oDialog);
			}
			this.oDialog.open();
		},

		fnshowError: function(aErrors) {
			var oView = this.getView();
			// Load fragment if not loaded already
			if (!this._oErrorDialog) {
				this._oErrorDialog = sap.ui.xmlfragment(
					oView.getId(),
					"PRDH.Fragment.ErrorList", // <-- your fragment name
					this
				);
				oView.addDependent(this._oErrorDialog);
			}
			// Create/Update JSON model
			var oModel = new sap.ui.model.json.JSONModel({
				rows: aErrors
			});
			oView.setModel(oModel, "JM_ErrorList");

			// Bind List aggregation to model
			var oList = sap.ui.core.Fragment.byId(oView.getId(), "idErrorList");
			oList.bindItems({
				path: "JM_ErrorList>/rows",
				template: new sap.m.StandardListItem({
					title: "{JM_ErrorList>text}",
					type: "Active",
					customData: [
						new sap.ui.core.CustomData({
							key: "fieldId",
							value: "{JM_ErrorList>fieldId}"
						})
					]
				})
			});

			this._oErrorDialog.open();
		},

		fnErrorSelect: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("listItem"); // For itemPress, the param is 'listItem'
			if (!oSelectedItem) {
				return;
			}

			var sFieldId = oSelectedItem.getCustomData()[0].getValue();
			var oFieldMeta = this.getView().getModel("JM_MCNkeyModel").getProperty("/FieldMeta/" + sFieldId);
			if (!oFieldMeta) {
				return;
			}

			var viewId = oFieldMeta.viewId;
			var gridId = viewId + "_GRID";
			var panelId = viewId + "_HEADER";
			var buttonId = viewId + "_B";
			var oControl = sap.ui.getCore().byId(sFieldId);
			var oGrid = this.getView().byId(gridId);
			var oPanel = this.getView().byId(panelId);

			if (oGrid) {
				oGrid.setVisible(true);
				oPanel.removeStyleClass("cl_init_pannelHeadSS");
				oPanel.addStyleClass("cl_init_pannelHead");
				this.byId(buttonId).setPressed(false);
				this.byId(buttonId).setIcon("Image/ArrowUp.svg");
				this.byId(buttonId).removeStyleClass("cl_init_togglebuttonSS");
				this.byId(buttonId).addStyleClass("cl_init_togglebutton");

				setTimeout(function() {
					if (oControl) {
						var oDomRef = oControl.getDomRef();
						if (oDomRef) {
							oDomRef.scrollIntoView({
								behavior: "smooth",
								block: "center"
							});
							oControl.focus();
						}
					}
				}, 200);
			}
			this.fnErrorDialogClose();

		},

		fnErrorDialogClose: function() {
			if (this._oErrorDialog) {
				this._oErrorDialog.close();
				this._oErrorDialog.destroy();
				this._oErrorDialog = null;
			}
		},

		fnRefresh: function() {
			if (this.oSuccessdialog) {
				this.oSuccessdialog.close();
				this.oSuccessdialog.destroy();
				this.oSuccessdialog = null;
			}
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var oContextModel = sap.ui.getCore().getModel("JM_ContextModel");
			if (oContextModel) {
				var ContextData = oContextModel.getData();
			}
			var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
			if (this.workId) {
				// oRouter.navTo("UWL");
				oCrossAppNav.toExternal({
					target: {
						semanticObject: "ZMDM_UWL_DB",
						action: "display"
					},
					appSpecificRoute: "uwl"
				});
			} else if (oContextModel) {
				if (ContextData.Ind === "D" || ContextData.Ind === "T") {
					oCrossAppNav.toExternal({
						target: {
							semanticObject: "ZMDM_UWL_DB",
							action: "display"
						},
						appSpecificRoute: "dashboard"
					});
				} else {
					oRouter.navTo("search");
				}
			} else {
				var oViewstateModel = new sap.ui.model.json.JSONModel({
					fromSearch: false,
					fromKeyData: false,
					fromInitiator: true,
					fromUWL: false
				});
				sap.ui.getCore().setModel(oViewstateModel, "JM_ViewStateModel");
				oRouter.navTo("search");
			}
			this.fnClearAllfields();
		},

		fnOpenMessageClrAll: function(x, y) {
			var that = this;
			if (!that.clrAllfrag) {
				that.clrAllfrag = sap.ui.xmlfragment(this.getView().getId(), "PRDH.fragment.clear", that);
				that.getView().addDependent(that.clrAllfrag);
			}
			that.clrAllfrag.open();
			// var otext = sap.ui.core.Fragment.byId("id_confirmFrag", "id_Confirm");
			var otext = this.byId("id_Confirm");
			otext.setText(x);

		},

		fnClearAll: function() {
			if (!this._levelToClear) return;
			if (this._levelToClear === "MAGRV") {
				var oSrc = this.byId("SID_MAGRV");
				oSrc.setValue("");
				this.byId("SID_MAGRV_des").setValue("");
				this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "clear");
			}
			// Added by jones on 16.12.2025 (start)
			if (this._levelToClear === "MATKL") {
				var oSrc = this.byId("ID_PH_MATKL");
				oSrc.setValue("");
				this.byId("ID_PH_MATKL_des").setValue("");
				this.updateIndicator("ID_PH_MATKL_IND", "ID_PH_MATKL_BTN", "ID_PH_MATKL_des", "clear");
			} else {
				var lvlToClear = this._levelToClear;
				var aShort = ["SID_STUFE_1", "SID_STUFE_2", "SID_STUFE_3", "SID_STUFE_4", "SID_STUFE_5", "SID_STUFE_6", "SID_STUFE_7"];
				var aDesc = ["SID_STUFE_1_des", "SID_STUFE_2_des", "SID_STUFE_3_des", "SID_STUFE_4_des", "SID_STUFE_5_des", "SID_STUFE_6_des",
					"SID_STUFE_7_des"
				];
				var aHier = ["SID_STUFE_1_hier", "SID_STUFE_2_hier", "SID_STUFE_3_hier", "SID_STUFE_4_hier", "SID_STUFE_5_hier",
					"SID_STUFE_6_hier", "SID_STUFE_7_hier"
				];

				for (var i = lvlToClear - 1; i < aShort.length; i++) {
					// Short text
					var oShort = this.byId(aShort[i]);
					oShort.setValue("");
					oShort.setEditable(i === lvlToClear - 1);

					// Description
					var oDesc = this.byId(aDesc[i]);
					oDesc.setValue("");
					oDesc.setEditable(i === lvlToClear - 1);

					// Hierarchy
					var oHier = this.byId(aHier[i]);
					oHier.setValue("");
					this.updateIndicator("SID_STUFE_" + (i + 1) + "_IND", "SID_STUFE_" + (i + 1) + "_BTN", "SID_STUFE_" + (i + 1) + "_des", "clear");
				}
			}

			var model = this.getView().getModel("JM_KeyDataVisible");
			if (model) {
				model.setProperty("/dynamicSpanRb", "L12 M12 S12");
				model.setProperty("/phVisible", false);
				model.setProperty("/phValue", "");
				model.setProperty("/phValueLength", "");
			}

			this._levelToClear = null;
			this._sourceField = null;
			this.fnCancelClear();
		},

		fnCancelClear: function() {

			if (this._sourceField && this._sourceField._oldValue !== undefined) {
				this._sourceField.setValue(this._sourceField._oldValue);
			}

			this._levelToClear = null;
			this._sourceField = null;

			if (this.clrAllfrag) {
				this.clrAllfrag.close();
				this.clrAllfrag.destroy();
				this.clrAllfrag = null;
			}
		},
		onBeforeRendering: function() {
			if (this.clrAllfrag) {
				this.clrAllfrag.destroy();
				this.clrAllfrag = null;
			}
		},

		// *-------------------------------------------------------------------------------------
		//		Function for to set the Indicator Status
		// *-------------------------------------------------------------------------------------
		getIndicatorStatus: function(status) {
			switch (status) {
				case "A":
					return "available"; // status success
				case "N":
					return "new"; // status success
				case "C":
					return "change"; // status changed
				case "":
					return "new"; // status new
				default:
					return "new"; // hide
			}
		},

		getIndicatorStatusChck: function(status) {
			switch (status) {
				case "A":
					return "available"; // status success
				case "N":
					return "Not Available"; // status success
				case "C":
					return "change"; // status changed
				case "":
					return "new"; // status new
				default:
					return "new"; // hide
			}
		},

		updateIndicator: function(hboxId, btnId, descid, isSuccess) {
			var oHBox = this.byId(hboxId);
			var oBtn = this.byId(btnId);
			var oImageModel = this.getView().getModel("JM_ImageModel");
			var sBasePath = oImageModel.getProperty("/path");

			if (!oHBox || !oBtn) return;

			oHBox.setVisible(true);
			oBtn.removeStyleClass("cl_IndicatorS cl_IndicatorP cl_IndicatorR");

			if (isSuccess === "change") {
				var image = "IndicatorP";
				var sImg = image;
				var sSrc = sBasePath + sImg + ".svg";
				oBtn.setIcon(sSrc);
				oBtn.setText("Change");
				oBtn.setType("Emphasized");
				oBtn.addStyleClass("cl_IndicatorP");
				if (this.vDescEdit === "C") {
					this.byId(descid).setEditable(true);
				} // Added by Jones on 17.12.2025 
				else {
					this.byId(descid).setEditable(false);
				}
			} else if (isSuccess === "new") {
				image = "IndicatorP";
				sImg = image;
				sSrc = sBasePath + sImg + ".svg";
				oBtn.setIcon(sSrc);
				oBtn.setText("new");
				oBtn.setType("Emphasized");
				oBtn.addStyleClass("cl_IndicatorP");
				this.byId(descid).setEditable(true);
			} else if (isSuccess === "clear") {
				oHBox.setVisible(false);
				oBtn.setIcon("");
				oBtn.setText("");
				oBtn.setType("Default");
				oBtn.removeStyleClass("cl_IndicatorS cl_IndicatorP cl_IndicatorR");
				// if (this.vDescEdit === "C") {
				// 	this.byId(descid).setEditable(true); // Added by Jones on 17.12.2025 
				// } else {
				// 	this.byId(descid).setEditable(false);
				// }
			} else if (isSuccess === "Not Available") {
				image = "IndicatorP";
				sImg = image;
				sSrc = sBasePath + sImg + ".svg";
				oBtn.setIcon(sSrc);
				oBtn.setText("Not Available");
				oBtn.setType("Emphasized");
				oBtn.addStyleClass("cl_IndicatorP");
				if (this.vDescEdit === "C") {
					this.byId(descid).setEditable(true); // Added by Jones on 17.12.2025 
				} else {
					this.byId(descid).setEditable(false);
				} // Added by Jones on 17.12.2025 
			} else if (isSuccess) {
				image = "IndicatorS";
				sImg = image;
				sSrc = sBasePath + sImg + ".svg";
				oBtn.setIcon(sSrc);
				oBtn.setText("Available");
				oBtn.setType("Accept");
				oBtn.addStyleClass("cl_IndicatorS");
				if (this.vDescEdit === "C") {
					this.byId(descid).setEditable(true); // Added by Jones on 17.12.2025 
				} else {
					this.byId(descid).setEditable(false);
				} // Added by Jones on 17.12.2025 
			} else {
				image = "IndicatorP";
				sImg = image;
				sSrc = sBasePath + sImg + ".svg";
				oBtn.setIcon(sSrc);
				oBtn.setText("New");
				oBtn.setType("Emphasized");
				oBtn.addStyleClass("cl_IndicatorP");
				if (this.vDescEdit === "C") {
					this.byId(descid).setEditable(true); // Added by Jones on 17.12.2025 
				} else {
					this.byId(descid).setEditable(false);
				} // Added by Jones on 17.12.2025 
			}

		},

		fnClearAllfields: function() {
			var oContextModel = sap.ui.getCore().getModel("JM_ContextModel");
			if (oContextModel) {
				sap.ui.getCore().setModel(null, "JM_ContextModel");
			}

			// --- Clear product hierarchy fields ---
			var aProdFields = [
				"SID_STUFE_1", "SID_STUFE_1_des", "SID_STUFE_1_hier",
				"SID_STUFE_2", "SID_STUFE_2_des", "SID_STUFE_2_hier",
				"SID_STUFE_3", "SID_STUFE_3_des", "SID_STUFE_3_hier",
				"SID_STUFE_4", "SID_STUFE_4_des", "SID_STUFE_4_hier",
				"SID_STUFE_5", "SID_STUFE_5_des", "SID_STUFE_5_hier",
				"SID_STUFE_6", "SID_STUFE_6_des", "SID_STUFE_6_hier",
				"SID_STUFE_7", "SID_STUFE_7_des", "SID_STUFE_7_hier"

			];

			for (var i = 0; i < aProdFields.length; i++) {
				var oField = this.byId(aProdFields[i]);
				if (oField) {
					oField.setValue("");
					oField.setValueState("None");
					oField.setValueStateText("");
				}
			}

			// --- Clear PackMatGrp fields ---
			var oWerks = this.byId("SID_MAGRV");
			if (oWerks) {
				oWerks.setValue("");
				oWerks.setValueState("None");
				oWerks.setValueStateText("");
			}
			var aNonEditableFields = [
				"SID_STUFE_2", "SID_STUFE_2_des", "SID_STUFE_2_hier",
				"SID_STUFE_3", "SID_STUFE_3_des", "SID_STUFE_3_hier",
				"SID_STUFE_4", "SID_STUFE_4_des", "SID_STUFE_4_hier",
				"SID_STUFE_5", "SID_STUFE_5_des", "SID_STUFE_5_hier",
				"SID_STUFE_6", "SID_STUFE_6_des", "SID_STUFE_6_hier",
				"SID_STUFE_7", "SID_STUFE_7_des", "SID_STUFE_7_hier"
			];

			for (var j = 0; j < aNonEditableFields.length; j++) {
				var oFieldNE = this.byId(aNonEditableFields[j]);
				if (oFieldNE) {
					oFieldNE.setEditable(false);
				}
			}
			var oWerksDes = this.byId("SID_MAGRV_des");
			if (oWerksDes) {
				oWerksDes.setValue("");
				oWerksDes.setValueState("None");
				oWerksDes.setValueStateText("");
			}

			var oComments = this.byId("id_textarea");
			if (oComments) {
				oComments.setValue("");

			}
			var oCommentBox = this.byId("id_commentbox");
			if (oCommentBox) {

				oCommentBox.destroyItems();
			}

			var oTableModel = this.getView().getModel("JM_DocTypeModel");
			if (oTableModel) {
				oTableModel.setProperty("/List", []);
			}

			for (i = 1; i <= 7; i++) {
				this.updateIndicator(
					"SID_STUFE_" + i + "_IND",
					"SID_STUFE_" + i + "_BTN",
					"SID_STUFE_" + i + "_des",
					"clear"
				);
			}
			this.updateIndicator("SID_MAGRV_IND", "SID_MAGRV_BTN", "SID_MAGRV_des", "clear");
			this.updateIndicator("SID_STUFE_IND", "SID_STUFE_BTN", "SID_STUFE_des", "clear");
			this.getView().byId("SID_STUFE").setValue("");
			this.getView().byId("SID_STUFE_des").setValue("");
			this.getView().byId("SID_STUFE_lev").setValue("");

			this.workId = "";
			this.Transid = "";
			this.f4Cache = {};

		},

		fnnextfield: function() {
			var that = this;
			var sitem = this.selectedField;
			var vcurrenthier = this.getView().byId(sitem + "_hier").getValue();
			var vPayload = {};
			var aParts = sitem.split("_"); // ["SID", "STUFE", "1"]
			var fieldname = parseInt(aParts[2]) + 1;
			var vLevel1 = this.getView().byId("SID_STUFE_1").getValue();
			// var vLevel1 = this.getView().byId("SID_STUFE_1").getValue();
			var vLevel2 = this.getView().byId("SID_STUFE_2").getValue();
			var vLevel3 = this.getView().byId("SID_STUFE_3").getValue();
			var vLevel4 = this.getView().byId("SID_STUFE_4").getValue();
			var vLevel5 = this.getView().byId("SID_STUFE_5").getValue();
			var vLevel6 = this.getView().byId("SID_STUFE_6").getValue();
			var vLevel7 = this.getView().byId("SID_STUFE_7").getValue();
			var aNavItems = [{
				Level1: vLevel1,
				Level2: vLevel2,
				Level3: vLevel3,
				Level4: vLevel4,
				Level5: vLevel5,
				Level6: vLevel6,
				Level7: vLevel7

			}];
			vPayload = {
				AppId: "PHC",
				Ind: "L",
				Lvlind: "L" + fieldname,
				NavPHSearchHelp: [],
				NavPHItems: aNavItems

			};
			var vValueId = "SID_STUFE_" + fieldname;
			var descId = "SID_STUFE_" + fieldname + "_des";
			var hboxId = "SID_STUFE_" + fieldname + "_IND";
			var btnId = "SID_STUFE_" + fieldname + "_BTN";
			var hierId = "SID_STUFE_" + fieldname + "_hier";
			var vModel = this.getOwnerComponent().getModel("JM_PRODHIER");
			vModel.create("/Product_KeyDataSet", vPayload, {
				success: function(oData) {
					busyDialog.close();
					var aResults = oData.NavPHSearchHelp.results;
					if (aResults.length === 1) {
						that.getView().byId(vValueId).setValue(aResults[0].Value1);
						that.getView().byId(descId).setValue(aResults[0].Value2);
						that.getView().byId(hierId).setValue(vcurrenthier + aResults[0].Value1);
						that.updateIndicator(hboxId, btnId, descId, true);
						that.fnupdateNextLevel();
					}
				},
				error: function(oResponse) {
					busyDialog.close();

				}
			});

		},

		fnupdateNextLevel: function() {
			var aShortCodes = ["SID_STUFE_1", "SID_STUFE_2", "SID_STUFE_3", "SID_STUFE_4", "SID_STUFE_5", "SID_STUFE_6", "SID_STUFE_7"];
			var aDescs = ["SID_STUFE_1_des", "SID_STUFE_2_des", "SID_STUFE_3_des", "SID_STUFE_4_des", "SID_STUFE_5_des", "SID_STUFE_6_des",
				"SID_STUFE_7_des"
			];
			var aHierarchyFields = ["SID_STUFE_1_hier", "SID_STUFE_2_hier", "SID_STUFE_3_hier", "SID_STUFE_4_hier", "SID_STUFE_5_hier",
				"SID_STUFE_6_hier", "SID_STUFE_7_hier"
			];

			for (var i = 0; i < aShortCodes.length - 1; i++) {
				var oShort = this.byId(aShortCodes[i]);
				var oDesc = this.byId(aDescs[i]);
				var oNextShort = this.byId(aShortCodes[i + 1]);
				var oNextDesc = this.byId(aDescs[i + 1]);
				var oNextHier = this.byId(aHierarchyFields[i + 1]);
				// Skip loop if next level does not exist in XML
				if (!oNextShort || !oNextDesc) {
					continue;
				}
				var hasShort = oShort && oShort.getValue().trim() !== "";
				var hasDesc = oDesc && oDesc.getValue().trim() !== "";
				if (hasShort && hasDesc) {
					oNextShort.setEditable(true);
					if (this.vDescEdit !== "C") {
						oNextDesc.setEditable(false);
					} else {
						oNextDesc.setEditable(true);
					}
				} else {
					oNextShort.setEditable(false).setValue("");
					oNextDesc.setEditable(false).setValue("");
					if (oNextHier) oNextHier.setValue("");
				}
			}
		},

		fntoggleIndicator: function(level, isVisible) {
			var hboxId = "SID_STUFE_" + level + "_IND";
			var btnId = "SID_STUFE_" + level + "_BTN";
			var descId = "SID_STUFE_" + level + "_des";
			var oHBox = this.byId(hboxId);
			var oBtn = this.byId(btnId);

			if (!oHBox || !oBtn) return;

			if (!isVisible) {
				oHBox.setVisible(false);
				oBtn.setText("");
				oBtn.setIcon("");
				return;
			}

			// If visible → set default “Available”
			this.updateIndicator(hboxId, btnId, descId, true);
		},

		// *-------------------------------------------------------------------------------------
		//				Function when back button press
		// *-------------------------------------------------------------------------------------
		onNavBack: function() {
			var oPopupModel = new sap.ui.model.json.JSONModel({
				title: "Confirmation",
				text: "Do you want to Exit?",
				negativeButton: "No",
				negativeIcon: this.getView().getModel("JM_ImageModel").getProperty("/path") + "Cancel.svg",
				positiveButton: "Yes",
				positiveIcon: this.getView().getModel("JM_ImageModel").getProperty("/path") + "Duplicate.svg",
				Indicator: "Exit"
			});

			// Set model with name
			this.getView().setModel(oPopupModel, "JM_Popup");
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment(this.getView().getId(),
					"PRDH.Fragment.ConfirmationExitPopup", // Fragment path
					this
				);
				this.getView().addDependent(this.oDialog);
			}

			this.oDialog.open();

		},

		fnparmSetCall: function(Appid) {
			return new Promise(function(Resolve, Reject) {
				var oWFParmSet = this.getOwnerComponent().getModel("JM_CONFIG");
				busyDialog.open();

				oWFParmSet.read("/WFParmSet", {
					filters: [
						new sap.ui.model.Filter("AppId", sap.ui.model.FilterOperator.EQ, Appid)
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

						var oParmModel = this.getOwnerComponent().getModel("JM_ParmModel");
						oParmModel.setData(oMatchedParams);
						Resolve(true);
					}.bind(this),

					error: function(oResponse) {
						busyDialog.close();
						var sMessage = ErrorHandler.parseODataError(oResponse);
						ErrorHandler.showCustomSnackbar(sMessage, "Error", this);
					}.bind(this)
				});
			}.bind(this));

		},

		fnNewDescription: function(oEvent) {
			var oSrc = oEvent.getSource();
			var value = oSrc.getValue();
			this.getView().byId("ID_DES_CNT").setValue(value.length);
			this.getView().byId("ID_DES").setValueState("None");
			oSrc.setValue(value.toUpperCase());
		},

		// *-------------------------------------------------------------------------------------
		//		Function for to resize the responsive 
		// *-------------------------------------------------------------------------------------
		fnMobileViewChanges: function() {
			this.getView().getModel("RoadMapUI").setProperty("/labelVisible", false);
			// this.getView().byId("id_roadmap").removeStyleClass("cl_roadmap");
			// this.getView().byId("id_roadmap").addStyleClass("cl_roadmapSS");
			// 	this.getView().byId("id_roadmapHighlighter").removeStyleClass("cl_Highlightborder_roadMap");
			// 	this.getView().byId("id_roadmapHighlighter").addStyleClass("cl_Highlightborder_roadMapSS");
		},

		fnTabDesktopViewChanges: function() {
			this.getView().getModel("RoadMapUI").setProperty("/labelVisible", true);
			// this.getView().byId("id_roadmap").removeStyleClass("cl_roadmapSS");
			// this.getView().byId("id_roadmap").addStyleClass("cl_roadmap");
			// this.getView().byId("id_roadmapHighlighter").removeStyleClass("cl_Highlightborder_roadMapSS");
			// this.getView().byId("id_roadmapHighlighter").addStyleClass("cl_Highlightborder_roadMap");
		},

		fnResize: function() {
			var oRange = sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD);

			if (oRange.name === "Phone") {
				this.fnMobileViewChanges();
			} else {
				this.fnTabDesktopViewChanges();
			}
		}
	});

});