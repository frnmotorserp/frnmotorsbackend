import {
  getInvoicesByFilters,
  saveOrUpdateInvoice,
  getInvoiceWithItems,
  syncPaymentsForInvoice,
  getPaymentsByInvoiceId,
  getInvoicePaymentSummaryByPoId,
  saveOrUpdateInvoiceWithItems,
  addCashEntry,
  updateCashEntry,
  deleteCashEntry,
  getCashEntries,
  getCashBalance,
  addBankTransaction,
  getBankTransactions,
  getBankBalance,
  getAllBanksWithBalance,
  getVendorInvoicesWithPaymentsFY,
  createVendorPayment,
  getVendorPayments,
  createVendorDiscount,
  getVendorDiscounts,
  softDeleteVendorPayment,
  softDeleteInvoice,
  softDeleteCashbookEntry,
} from "../models/invoicePaymentModel.js";
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

    const result = await getInvoicesByFilters(
      startDate,
      endDate,
      vendorId,
      poId
    );

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
};

export const saveOrUpdateInvoiceController = async (req, res) => {
  try {
    const invoiceData = req.body;

    // CamelCase required field validation
    const requiredFields = [
      "poId",
      "vendorId",
      "invoiceNumber",
      "invoiceDate",
      "invoiceAmount",
    ];
    for (const field of requiredFields) {
      if (!invoiceData[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    const invoice = await saveOrUpdateInvoiceWithItems(invoiceData);
    const message = invoiceData.invoiceId
      ? "Invoice updated successfully"
      : "Invoice added successfully";

    res.status(200).json({
      success: true,
      message,
      data: invoice,
    });
  } catch (error) {
    console.error("Error in saveOrUpdateInvoiceController:", error);
    res.status(500).json({
      success: false,
      message: "Server error while saving invoice",
    });
  }
};

// 3. Bulk Sync Payments for an Invoice
export const syncPaymentsForInvoiceController = async (req, res) => {
  try {
    const {
      invoiceId,
      vendorId,
      totalAmountAsPerInvoice,
      paymentList,
      invoiceNumber,
    } = req.body;

    if (!invoiceId || !vendorId || !totalAmountAsPerInvoice) {
      return res.status(400).json({
        success: false,
        message: "Missing invoiceId or vendorId or totalAmountAsPerInvoice",
      });
    }

    await syncPaymentsForInvoice(
      invoiceId,
      vendorId,
      totalAmountAsPerInvoice,
      paymentList || [],
      invoiceNumber
    );

    res.status(200).json({
      success: true,
      message: "Payments synced successfully",
    });
  } catch (error) {
    console.error("Error in syncPaymentsForInvoiceController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync payments",
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
        message: "Invoice ID is required",
      });
    }

    const payments = await getPaymentsByInvoiceId(invoiceId);
    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error in getPaymentsByInvoiceIdController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
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

/**
 * Create a new cash entry
 */
export const createCashEntry = async (req, res) => {
  try {
    const { entry_date, description, amount, entry_type, expense_category } =
      req.body;

    if (!entry_date || !amount || !entry_type) {
      return res
        .status(400)
        .json({ error: "entry_date, amount, and entry_type are required" });
    }

    const entry = await addCashEntry({
      entry_date,
      description,
      amount,
      entry_type,
      expense_category,
    });
    res.status(201).json(entry);
  } catch (error) {
    console.error("Error creating cash entry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Update cash entry
 */
export const editCashEntry = async (req, res) => {
  try {
    const { id } = req.body;
    const { entry_date, description, amount, entry_type } = req.body;

    const entry = await updateCashEntry(id, {
      entry_date,
      description,
      amount,
      entry_type,
    });
    if (!entry) {
      return res.status(404).json({ error: "Cash entry not found" });
    }

    res.json(entry);
  } catch (error) {
    console.error("Error updating cash entry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Delete cash entry
 */
export const removeCashEntry = async (req, res) => {
  try {
    const { id } = req.body;
    const entry = await deleteCashEntry(id);

    if (!entry) {
      return res.status(404).json({ error: "Cash entry not found" });
    }

    res.json({ message: "Cash entry deleted successfully", entry });
  } catch (error) {
    console.error("Error deleting cash entry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get cash entries with optional date range
 */
export const listCashEntries = async (req, res) => {
  try {
    const { startDate, endDate, expenseCategoryId } = req.query;
    console.log(req.query);
    const entries = await getCashEntries(startDate, endDate, expenseCategoryId);

    res.json(entries);
  } catch (error) {
    console.error("Error fetching cash entries:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get current cash balance
 */
export const fetchCashBalance = async (req, res) => {
  try {
    const balance = await getCashBalance();
    res.json({ balance });
  } catch (error) {
    console.error("Error fetching cash balance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Create a new bank transaction
 */
export const createBankTransactionController = async (req, res) => {
  try {
    const {
      bank_id,
      transaction_date,
      transaction_type, // 'IN' or 'OUT'
      expense_category,
      amount,
      reference_no,
      mode_of_transaction,
      remarks,
      created_by,
    } = req.body;

    // Basic validation
    if (
      !bank_id ||
      !transaction_date ||
      !transaction_type ||
      !amount ||
      !expense_category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "bank_id, transaction_date, transaction_type, and amount are required",
      });
    }

    const transaction = await addBankTransaction({
      bank_id,
      transaction_date,
      transaction_type,
      expense_category,
      amount,
      reference_no,
      mode_of_transaction,
      remarks,
      created_by,
    });

    res.status(201).json({
      success: true,
      message: "Bank transaction added successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Error creating bank transaction:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get bank transactions with optional date range
 */
export const listBankTransactionsController = async (req, res) => {
  try {
    const { bank_id, startDate, endDate, expenseCategoryId } = req.body;

    if (!bank_id) {
      return res.status(400).json({
        success: false,
        message: "bank_id is required",
      });
    }

    const transactions = await getBankTransactions(
      bank_id,
      startDate,
      endDate,
      expenseCategoryId
    );
    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching bank transactions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get current bank balance
 */
export const fetchBankBalanceController = async (req, res) => {
  try {
    const { bank_id } = req.body;

    if (!bank_id) {
      return res.status(400).json({
        success: false,
        message: "bank_id is required",
      });
    }

    const balance = await getBankBalance(bank_id);
    res.status(200).json({
      success: true,
      balance,
    });
  } catch (error) {
    console.error("Error fetching bank balance:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getBanks = async (req, res) => {
  try {
    const banks = await getAllBanksWithBalance();
    res.status(200).json({ success: true, data: banks });
  } catch (err) {
    console.error("Error fetching banks:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bank accounts" });
  }
};

/**
 * Controller: Get all invoices with payments for a vendor for the current financial year
 */
export const getVendorInvoicesWithPaymentsFYController = async (req, res) => {
  try {
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Vendor ID is required.",
        responseObject: [],
      });
    }

    const result = await getVendorInvoicesWithPaymentsFY(vendorId);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Invoices with payments fetched successfully.",
      responseObject: result, // { data: [...], summary: {...} }
    });
  } catch (error) {
    console.error("Error fetching vendor invoices with payments:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch vendor invoices with payments.",
      responseObject: [],
    });
  }
};

/**
 * Create Vendor Payment (CASH / BANK)
 * Vendor Wise Payment - New Requirement - 12-01-2026
 */
export const createVendorPaymentController = async (req, res) => {
  try {
    const {
      vendorId,
      paymentDate,
      paymentAmount,
      paymentMethod,
      bankId,
      transactionReference,
      notes,
      modeOfTransaction,
      createdBy,
    } = req.body;

    /* ===================== VALIDATION ===================== */
    if (
      !vendorId ||
      !paymentDate ||
      !paymentAmount ||
      !paymentMethod ||
      !createdBy
    ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Mandatory fields are missing.",
        responseObject: [],
      });
    }

    if (paymentMethod === "BANK" && !bankId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Bank ID is required for bank payment.",
        responseObject: [],
      });
    }

    /* ===================== CREATE PAYMENT ===================== */
    const result = await createVendorPayment({
      vendorId,
      paymentDate,
      paymentAmount,
      paymentMethod,
      bankId,
      transactionReference,
      notes,
      createdBy,
      modeOfTransaction,
    });

    /* ===================== RESPONSE ===================== */
    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Vendor payment recorded successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error creating vendor payment:", error);

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to create vendor payment",
      responseObject: [],
    });
  }
};

/**
 * Get Vendor Payments (CASH / BANK)
 * Vendor Wise Payment - New Requirement - 12-01-2026
 */
export const getVendorPaymentsController = async (req, res) => {
  try {
    const {
      vendorId,
      fromDate = "2020-01-01",
      toDate = new Date().toISOString().slice(0, 10),
    } = req.body;

    /* ===================== VALIDATION ===================== */
    if (!vendorId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Vendor ID is mandatory.",
        responseObject: [],
      });
    }

    /* ===================== FETCH PAYMENTS ===================== */
    const payments = await getVendorPayments({
      vendorId,
      fromDate,
      toDate,
    });

    /* ===================== RESPONSE ===================== */
    return res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Vendor payments fetched successfully.",
      responseObject: payments,
    });
  } catch (error) {
    console.error("Error fetching vendor payments:", error);

    return res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to fetch vendor payments.",
      responseObject: [],
    });
  }
};

/**
 * Create Vendor Discount
 * Vendor Wise Discount (No Invoice / Payment Dependency)
 * New Requirement - 12-01-2026
 */
export const createVendorDiscountController = async (req, res) => {
  try {
    const { vendorId, discountDate, discountAmount, reason, createdBy } =
      req.body;

    /* ===================== VALIDATION ===================== */
    if (!vendorId || !discountDate || !discountAmount || !createdBy) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Mandatory fields are missing.",
        responseObject: [],
      });
    }

    /* ===================== CREATE DISCOUNT ===================== */
    const result = await createVendorDiscount({
      vendorId,
      discountDate,
      discountAmount,
      reason,
      createdBy,
    });

    /* ===================== RESPONSE ===================== */
    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Vendor discount recorded successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error creating vendor discount:", error);

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to create vendor discount",
      responseObject: [],
    });
  }
};

/**
 * Get Vendor Discounts
 * Vendor Wise Discount Listing
 * New Requirement - 12-01-2026
 */
export const getVendorDiscountsController = async (req, res) => {
  try {
    const {
      vendorId,
      fromDate = "2020-01-01",
      toDate = new Date().toISOString().slice(0, 10),
    } = req.body;

    /* ===================== VALIDATION ===================== */
    if (!vendorId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Vendor ID is mandatory.",
        responseObject: [],
      });
    }

    /* ===================== FETCH DISCOUNTS ===================== */
    const discounts = await getVendorDiscounts({
      vendorId,
      fromDate,
      toDate,
    });

    /* ===================== RESPONSE ===================== */
    return res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Vendor discounts fetched successfully.",
      responseObject: discounts,
    });
  } catch (error) {
    console.error("Error fetching vendor discounts:", error);

    return res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to fetch vendor discounts.",
      responseObject: [],
    });
  }
};

/**
 * Soft Delete Vendor Payment
 * Automatically reverses cash/bank ledger if linked
 */
export const softDeleteVendorPaymentController = async (req, res) => {
  try {
    const { vendorPaymentId } = req.body;

    // Assuming logged-in user is attached to req.user
    const deletedByUserId = req.user?.userId;

    /* ===================== VALIDATION ===================== */
    if (!vendorPaymentId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Vendor payment ID is required.",
        responseObject: null,
      });
    }

    if (!deletedByUserId) {
      return res.status(401).json({
        sessionDTO: { status: false, reasonCode: "unauthorized" },
        status: false,
        message: "User not authenticated.",
        responseObject: null,
      });
    }

    /* ===================== DELETE PAYMENT ===================== */
    const result = await softDeleteVendorPayment(
      vendorPaymentId,
      deletedByUserId
    );

    /* ===================== RESPONSE ===================== */
    return res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Vendor payment deleted successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error deleting vendor payment:", error);

    // Business-safe error mapping
    let message = "Failed to delete vendor payment.";
    let reasonCode = "error";

    if (error.message === "Vendor payment not found or already deleted") {
      message = error.message;
      reasonCode = "not_found";
    }

    return res.status(500).json({
      sessionDTO: { status: false, reasonCode },
      status: false,
      message,
      responseObject: null,
    });
  }
};

/**
 * Soft Delete Invoice
 */
export const softDeleteInvoiceController = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const deletedByUserId = req.user?.userId;

    if (!invoiceId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Invoice ID is required",
        responseObject: null,
      });
    }

    if (!deletedByUserId) {
      return res.status(401).json({
        sessionDTO: { status: false, reasonCode: "unauthorized" },
        status: false,
        message: "User not authenticated",
        responseObject: null,
      });
    }

    const result = await softDeleteInvoice(invoiceId, deletedByUserId);

    return res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Invoice deleted successfully",
      responseObject: result,
    });
  } catch (error) {
    console.error("Soft delete invoice error:", error);

    return res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to delete invoice",
      responseObject: null,
    });
  }
};

export const softDeleteCashbookController = async (req, res) => {
  try {
    const { cashbookId } = req.body;
    const deletedByUserId = req.user?.userId;

    if (!cashbookId) {
      return res.status(400).json({
        status: false,
        message: "Cashbook ID is required",
      });
    }

    const result = await softDeleteCashbookEntry(cashbookId, deletedByUserId);

    return res.json({
      status: true,
      message: "Cashbook entry deleted successfully",
      responseObject: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: error.message || "Failed to delete cashbook entry",
    });
  } finally {
  }
};
