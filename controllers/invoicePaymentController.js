import { getInvoicesByFilters, saveOrUpdateInvoice,  syncPaymentsForInvoice,
  getPaymentsByInvoiceId } from "../models/invoicePaymentModel.js";
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

    const invoice = await saveOrUpdateInvoice(invoiceData);
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




