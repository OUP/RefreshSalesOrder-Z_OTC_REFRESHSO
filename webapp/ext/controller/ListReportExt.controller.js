sap.ui.define(
  [
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/core/library",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/library",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/FormattedText",
  ],
  function (
    JSONModel,
    Fragment,
    coreLibrary,
    MessageBox,
    MessageToast,
    mobileLibrary,
    Dialog,
    Button,
    FormattedText
  ) {
    "use strict";

    let _oView;
    let _oViewModel;
    let _oUpdateDialog;
    let _oDataModel;

    // shortcut for sap.m.DialogType
    const DialogType = mobileLibrary.DialogType;

    // shortcut for sap.ui.core.ValueState
    const ValueState = coreLibrary.ValueState;

    // shortcut for sap.m.ButtonType
    const ButtonType = mobileLibrary.ButtonType;

    const _sDeferredGroupId = new Date().getTime();

    return {
      onInit: function () {
        _oView = this.getView();
        _oDataModel = this.getOwnerComponent().getModel();

        // set deferred groups and create Function Imports

        _oDataModel.setDeferredGroups(
          _oDataModel.getDeferredGroups().concat([_sDeferredGroupId])
        );

        // view model data
        _oViewModel = new JSONModel({
          ForceUpdate: false,
          RetainOldChg: false,
          ThirdPartySo: false,
          Payer: false,
          BillTo: false,
          Freightfwd: false,
          Incoterm1: false,
          Incoterm2: false,
          Invoicepref: false,
          CustomerCategory: false,
          UnloadingPoint: false,
          CustomerGroup: false,
          Currency: false,
          Shippingcond: false,
          TZone: false,
          Paymentterm: false,
        });

        // set view model
        _oView.setModel(_oViewModel, "oViewModel");

        // drop down data
        _oView.setModel(
          new JSONModel([
            {
              key: true,
              text: "YES",
            },
            {
              key: false,
              text: "NO",
            },
          ]),
          "oUpdateItems"
        );
      },

      onUpdatePress: function () {
        // create dialog lazily
        if (!_oUpdateDialog) {
          Fragment.load({
            type: "XML",
            name: "ZOTC.refreshsalesorder.ext.fragments.Update",
            controller: this,
          }).then(function (oDialog) {
            // assign to dialog
            _oUpdateDialog = oDialog;

            // add view dependent
            _oView.addDependent(oDialog);

            // open dialog
            oDialog.open();
          });
        } else {
          // clear view model values
          _oViewModel.setData({
            ForceUpdate: false,
            RetainOldChg: false,
            ThirdPartySo: false,
            Payer: false,
            BillTo: false,
            Freightfwd: false,
            Incoterm1: false,
            Incoterm2: false,
            Invoicepref: false,
            CustomerCategory: false,
            UnloadingPoint: false,
            CustomerGroup: false,
            Currency: false,
            Shippingcond: false,
            TZone: false,
            Paymentterm: false,
          });

          _oUpdateDialog.open();
        }
      },

      onUpdateOkPress: function () {
        const oViewData = _oViewModel.getData();
        let {
          ForceUpdate,
          RetainOldChg,
          ThirdPartySo,
          Payer,
          BillTo,
          Freightfwd,
          Incoterm1,
          Incoterm2,
          Invoicepref,
          CustomerCategory,
          UnloadingPoint,
          CustomerGroup,
          Currency,
          Shippingcond,
          TZone,
          Paymentterm,
        } = oViewData;

        if (
          !ThirdPartySo &&
          !Payer &&
          !BillTo &&
          !Freightfwd &&
          !Incoterm1 &&
          !Incoterm2 &&
          !Invoicepref &&
          !CustomerCategory &&
          !UnloadingPoint &&
          !CustomerGroup &&
          !Currency &&
          !Shippingcond &&
          !TZone &&
          !Paymentterm
        ) {
          MessageToast.show("Select atleast one item to proceed");
          return;
        }

        // read selected rows from table
        const aSelectedContexts = this.extensionAPI.getSelectedContexts();

        const oUpdateRadioBtn = sap.ui.getCore().byId("_IDGenRBG1");
        RetainOldChg = oUpdateRadioBtn.getSelectedIndex() === 0;
        ForceUpdate = oUpdateRadioBtn.getSelectedIndex() === 1;

        // padding context
        const sResponsivePaddingClasses =
          "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";

        for (let i = 0, iLen = aSelectedContexts.length; i < iLen; i++) {
          const oContext = aSelectedContexts[i];

          if (!oContext) {
            continue;
          }

          const oContextData = aSelectedContexts[i].getObject();
          const urlParameters = {
            SalesOrderNo: oContextData.SalesOrderNo,
            customer: oContextData.customer,
            OrderType: oContextData.OrderType,

            // boolean fields
            ForceUpdate,
            RetainOldChg,
            ThirdPartySo,
            Payer,
            BillTo,
            Freightfwd,
            Incoterm1,
            Incoterm2,
            Invoicepref,
            CustomerCategory,
            UnloadingPoint,
            CustomerGroup,
            Currency,
            Shippingcond,
            TZone,
            Paymentterm,
          };

          _oDataModel.callFunction("/ZOTC_FM_CHANGE_SALES_ORDER", {
            method: "POST",
            urlParameters,
            groupId: _sDeferredGroupId,
          });
        }

        // start busy indicator
        _oUpdateDialog.setBusy(true);

        //Submitting the function import batch call
        _oDataModel.submitChanges({
          success: (oBatchResponse) => {
            // stop busy indicator
            _oUpdateDialog.setBusy(false);

            const aChangeResponse =
              oBatchResponse.__batchResponses[0].__changeResponses;
            let aSuccess = [];
            let sSuccess = "";
            let aError = [];
            let sError = "";
            let htmlText = "";

            for (let index = 0; index < aChangeResponse.length; index++) {
              const element = aChangeResponse[index];
              const data = JSON.parse(element.body).d || {};

              if (data.Status === "S") {
                aSuccess.push(
                  `<li><strong>${data.SalesOrderNo}:</strong>\n${data.RetMessage}</li>`
                );
              } else {
                aError.push(
                  `<li><strong>${data.SalesOrderNo}:</strong>\n${data.RetMessage}</li>`
                );
              }
            }

            // read success message
            if (aSuccess.length > 0) {
              sSuccess = aSuccess.join("");
              htmlText = `\n<p><strong>Success:</strong></p><ul>${sSuccess}</ul>\n`;
            }

            if (aError.length > 0) {
              sError = aError.join("");
              htmlText += `\n<p><strong>Error:</strong></p><ul>${sError}</ul>\n`;
            }

            // information message
            const oMessageDialog = new Dialog({
              type: DialogType.Message,
              title: "Information",
              state: ValueState.Warning,
              content: new FormattedText({
                htmlText,
              }),
              beginButton: new Button({
                type: ButtonType.Emphasized,
                text: "OK",
                press: () => {
                  // refresh model
                  _oDataModel.refresh();

                  // close dialog
                  oMessageDialog.close();
                },
              }),
              styleClass: sResponsivePaddingClasses,
            });

            // open dialog
            oMessageDialog.open();

            // close dialog
            _oUpdateDialog.close();
          },
          error: (error) => {
            // stop busy indicator
            _oUpdateDialog.setBusy(false);

            let mParameters;

            try {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(
                error.responseText,
                "text/xml"
              );
              const sDetailMessage = xmlDoc
                .getElementsByTagName("error")[0]
                .getElementsByTagName("message")[0].textContent;

              mParameters = {
                title: "Error",
                details: sDetailMessage,
                contentWidth: "100px",
                styleClass: sResponsivePaddingClasses,
              };
            } catch (error) {
              mParameters = {
                title: "Error",
                details: "Unable to update response",
                contentWidth: "100px",
                styleClass: sResponsivePaddingClasses,
              };
            }

            // error message
            MessageBox.error(error.message, mParameters);
          },
        });
      },

      onUpdateCancelPress: function () {
        _oUpdateDialog.close();
      },
    };
  }
);
