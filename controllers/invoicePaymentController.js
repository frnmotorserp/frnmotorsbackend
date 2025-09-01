import { getInvoicesByFilters, saveOrUpdateInvoice, getInvoiceWithItems,  syncPaymentsForInvoice,
  getPaymentsByInvoiceId, getInvoicePaymentSummaryByPoId, saveOrUpdateInvoiceWithItems } from "../models/invoicePaymentModel.js";
// Get Invoices by Filters (vendorId, poId, startDate, endDate)
export const getInvoicesByFiltersController = async (req, res) => {
  try {
    const { startDate, endDate, vendorId, poId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Start and End dates are required.",
        responseObject: [],
      });
    }

    const result = await getInvoicesByFilters(startDate, endDate, vendorId, poId);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Invoices fetched successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch invoices.",
      responseObject: [],
    });
  }
};


export const getInvoiceWithItemsController = async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Invoice ID is required.",
        responseObject: null,
      });
    }

    const invoice = await getInvoiceWithItems(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        sessionDTO: { status: false, reasonCode: "not_found" },
        status: false,
        message: "Invoice not found.",
        responseObject: null,
      });
    }

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Invoice fetched successfully.",
      responseObject: invoice,
    });
  } catch (error) {
    console.error("Error fetching invoice with items:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch invoice with items.",
      responseObject: null,
    });
  }
}


export const saveOrUpdateInvoiceController = async (req, res) => {
  try {
    const invoiceData = req.body;

    // CamelCase required field validation
    const requiredFields = ['poId', 'vendorId', 'invoiceNumber', 'invoiceDate', 'invoiceAmount'];
    for (const field of requiredFields) {
      if (!invoiceData[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`
        });
      }
    }

    const invoice = await saveOrUpdateInvoiceWithItems(invoiceData);
    const message = invoiceData.invoiceId
      ? 'Invoice updated successfully'
      : 'Invoice added successfully';

    res.status(200).json({
      success: true,
      message,
      data: invoice
    });
  } catch (error) {
    console.error('Error in saveOrUpdateInvoiceController:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving invoice'
    });
  }
};


// 3. Bulk Sync Payments for an Invoice
export const syncPaymentsForInvoiceController = async (req, res) => {
  try {
    const { invoiceId, vendorId, totalAmountAsPerInvoice, paymentList } = req.body;

    if (!invoiceId || !vendorId || !totalAmountAsPerInvoice) {
      return res.status(400).json({
        success: false,
        message: "Missing invoiceId or vendorId or totalAmountAsPerInvoice"
      });
    }

    await syncPaymentsForInvoice(invoiceId, vendorId, totalAmountAsPerInvoice, paymentList || []);

    res.status(200).json({
      success: true,
      message: "Payments synced successfully"
    });
  } catch (error) {
    console.error("Error in syncPaymentsForInvoiceController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync payments"
    });
  }
};

// 4. Get Payments for an Invoice
export const getPaymentsByInvoiceIdController = async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required"
      });
    }

    const payments = await getPaymentsByInvoiceId(invoiceId);
    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error("Error in getPaymentsByInvoiceIdController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments"
    });
  }
};


// 5. Get All Payments Grouped by Invoice for a Given PO ID
export const getPaymentsGroupedByInvoiceController = async (req, res) => {
  try {
    const { poId } = req.body;

    if (!poId) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order ID (poId) is required",
      });
    }

    const groupedPayments = await getInvoicePaymentSummaryByPoId(poId);

    res.status(200).json({
      success: true,
      message: "Payments grouped by invoice fetched successfully",
      data: groupedPayments,
    });
  } catch (error) {
    console.error("Error in getPaymentsGroupedByInvoiceController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch grouped payments",
    });
  }
};



