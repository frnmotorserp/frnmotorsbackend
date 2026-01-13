import {
  saveOrUpdateSalesOrder,
  getSalesOrdersByDateRange,
  getSalesOrderSummary,
  getSalesOrderItemsById,
  updateSalesOrderStatus,
  getSalesOrdersByParty,
  getAllAvailableItemsforSell,
  getOrdersWithPayments,
  getMonthlySalesReport,
  getYearlySalesReport,
  cancelSalesOrder,
  getInvoiceData,
} from "../models/salesOrderModel.js";
import dayjs from "dayjs";

import {
  deletePayment,
  saveOrUpdatePayment,
  getPaymentsBySalesOrderId,
  createPartyPayment,
  getPartyPayments,
  getYearWiseProductOrderCount,
  createSalesPartyDiscount,
  getSalesPartyDiscounts,
  deleteSalesPartyDiscount,
} from "../models/paymentTrackingModel.js";

// 1. Save or Update Sales Order
export const saveOrUpdateSalesOrderController = async (req, res) => {
  try {
    const orderDTO = req.body;

    if (
      !orderDTO.userId ||
      !orderDTO.salesOrderCode ||
      !orderDTO.orderDate ||
      !Array.isArray(orderDTO.items) ||
      orderDTO.items.length === 0
    ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message:
          "User ID, Sales Order Code, Order Date and Items are required.",
        responseObject: [],
      });
    }

    const result = await saveOrUpdateSalesOrder(orderDTO, orderDTO.items);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Sales Order saved successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error saving/updating Sales Order:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to save or update Sales Order",
      responseObject: [],
    });
  }
};

// 2. List All Sales Orders within Date Range (optional customer/dealer filter)
export const listAllSalesOrders = async (req, res) => {
  try {
    const { startDate, endDate, customerId, dealerId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Start and end dates are required.",
        responseObject: [],
      });
    }

    const rows = await getSalesOrdersByDateRange(
      startDate,
      endDate,
      customerId,
      dealerId
    );

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Success",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching Sales Orders:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch Sales Orders",
      responseObject: [],
    });
  }
};

// 3. Summary by Status
export const getSalesOrderSummaryController = async (req, res) => {
  try {
    const rows = await getSalesOrderSummary();

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Summary fetched successfully.",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching Sales Order summary:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch Sales Order summary",
      responseObject: [],
    });
  }
};

// 4. Get Sales Order Items by ID
export const getSalesOrderItemsController = async (req, res) => {
  try {
    const { salesOrderId } = req.body;

    if (!salesOrderId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Sales Order ID is required.",
        responseObject: [],
      });
    }

    const items = await getSalesOrderItemsById(salesOrderId);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Sales Order Items fetched successfully.",
      responseObject: items,
    });
  } catch (error) {
    console.error("Error fetching Sales Order items:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch Sales Order Items",
      responseObject: [],
    });
  }
};

// 5. Update Sales Order Status
export const updateSalesOrderStatusController = async (req, res) => {
  try {
    const { salesOrderId, status, updatedBy } = req.body;

    if (!salesOrderId || !status || !updatedBy) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Sales Order ID, status, and updatedBy are required.",
        responseObject: [],
      });
    }

    const result = await updateSalesOrderStatus(
      salesOrderId,
      status,
      updatedBy
    );

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Sales Order status updated successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error updating Sales Order status:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to update Sales Order status",
      responseObject: [],
    });
  }
};

// 6. Get Sales Orders by Customer or Dealer
export const getSalesOrdersByPartyController = async (req, res) => {
  try {
    const { partyId, partyType } = req.body;

    if (!partyId || (partyType !== "CUSTOMER" && partyType !== "DEALER")) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "partyId and partyType (CUSTOMER/DEALER) are required.",
        responseObject: [],
      });
    }

    const data = await getSalesOrdersByParty(partyId, partyType);

    res.status(200).json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Sales Orders fetched successfully.",
      responseObject: data,
    });
  } catch (error) {
    console.error("Error fetching Sales Orders by party:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Internal server error.",
      responseObject: [],
    });
  }
};

export const listAllAvailableSalebleItems = async (req, res) => {
  try {
    const { locationId } = req.body;

    if (!locationId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Please provide a location.",
        responseObject: [],
      });
    }

    const rows = await getAllAvailableItemsforSell(locationId);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Success",
      responseObject: rows,
    });
  } catch (error) {
    console.error(
      "Error fetching available  items for sell in the specified location.",
      error
    );
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message:
        "Failed to fetch available  items for sell in the specified location.",
      responseObject: [],
    });
  }
};

// 1. Save or Update Payment
export const saveOrUpdatePaymentController = async (req, res) => {
  try {
    const paymentDTO = req.body;
    const { salesOrderId, paymentDate, paymentAmount, userId } = paymentDTO;

    if (!userId || !salesOrderId || !paymentDate || !paymentAmount) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message:
          "User ID, Sales Order ID, Payment Date and Payment Amount are required.",
        responseObject: [],
      });
    }

    const result = await saveOrUpdatePayment(paymentDTO);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: paymentDTO.paymentId
        ? "Payment updated successfully."
        : "Payment saved successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error saving/updating Payment:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to save or update Payment",
      responseObject: [],
    });
  }
};

// 2. Get Payments by Sales Order ID
export const getPaymentsBySalesOrderIdController = async (req, res) => {
  try {
    const { salesOrderId } = req.body;

    if (!salesOrderId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Sales Order ID is required.",
        responseObject: [],
      });
    }

    const result = await getPaymentsBySalesOrderId(salesOrderId);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Payments retrieved successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error fetching Payments:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to retrieve Payments",
      responseObject: [],
    });
  }
};

// 3. Delete Payment
export const deletePaymentController = async (req, res) => {
  try {
    const { paymentId, salesOrderId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Payment ID is required.",
        responseObject: [],
      });
    }

    const result = await deletePayment(paymentId, salesOrderId);

    if (!result) {
      return res.status(404).json({
        sessionDTO: { status: false, reasonCode: "not_found" },
        status: false,
        message: "Payment not found.",
        responseObject: [],
      });
    }

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Payment deleted successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error deleting Payment:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to delete Payment",
      responseObject: [],
    });
  }
};

export const getSalesOrdersWithPaymentsController = async (req, res) => {
  try {
    let { startDate, endDate, customerId, dealerId } = req.body;

    // Call model function (you’ll create it in salesOrderModel.js)
    const orders = await getOrdersWithPayments(
      customerId,
      dealerId,
      startDate,
      endDate
    );

    res.status(200).json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Sales orders with payment details fetched successfully.",
      responseObject: orders,
    });
  } catch (error) {
    console.error("Error fetching sales orders with payments:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch sales orders with payments",
      responseObject: [],
    });
  }
};

export const getMonthlySalesReportController = async (req, res) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Year and Month are required.",
        responseObject: [],
      });
    }

    const rows = await getMonthlySalesReport(year, month);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Monthly sales report fetched successfully.",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching monthly sales report:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch monthly sales report",
      responseObject: [],
    });
  }
};

export const getYearlySalesReportController = async (req, res) => {
  try {
    const { year } = req.body;

    if (!year) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Year is required.",
        responseObject: [],
      });
    }

    const rows = await getYearlySalesReport(year);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Yearly sales report fetched successfully.",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching yearly sales report:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch yearly sales report",
      responseObject: [],
    });
  }
};

// Cancel Sales Order
export const cancelSalesOrderController = async (req, res) => {
  try {
    const { salesOrderId, cancelledBy, cancellationReason } = req.body;

    if (!salesOrderId || !cancelledBy) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Sales Order ID and cancelledBy are required.",
        responseObject: [],
      });
    }

    const result = await cancelSalesOrder(
      salesOrderId,
      cancelledBy,
      cancellationReason
    );

    if (!result) {
      return res.status(404).json({
        sessionDTO: { status: false, reasonCode: "not_found" },
        status: false,
        message: "Sales order not found or already cancelled.",
        responseObject: [],
      });
    }

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Sales Order cancelled successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error cancelling Sales Order:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to cancel Sales Order",
      responseObject: [],
    });
  }
};

export const generateEInvoiceJSON = async (req, res) => {
  try {
    const { salesOrderId } = req.body;
    const data = await getInvoiceData(salesOrderId);

    if (!data) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    const { order, items } = data;

    // Skip if buyer GST is missing
    const buyerGstin = order.customer_gstin || order.dealer_gstin;
    if (!buyerGstin) {
      return res.status(400).json({ error: "GSTIN not available for buyer" });
    }

    const invoice = {
      Version: "1.1",
      TranDtls: {
        TaxSch: "GST",
        SupTyp: "B2B",
      },
      DocDtls: {
        Typ: "INV",
        No: order.sales_order_code,
        Dt: dayjs(order.order_date).format("DD/MM/YYYY"),
      },
      SellerDtls: {
        Gstin: order.seller_gstin,
        LglNm: order.seller_name,
        Addr1: order.seller_address,
        Loc: order.city || "NA",
        Pin: Number(order.seller_pincode) || 0,
        Stcd: String(order.seller_state_code).padStart(2, "0"),
      },
      BuyerDtls: {
        Gstin: buyerGstin,
        LglNm: order.customer_name || order.dealer_name,
        Addr1: order.address_line1 || order.company_address,
        Loc: order.city || "NA",
        Pin: Number(order.billing_pincode) || 0,
        Stcd: String(order.billing_state_code || "").padStart(2, "0"),
      },
      ItemList: items.map((it, idx) => {
        const qty = Number(it.quantity);
        const price = Number(it.unit_price);
        const taxable = Number(it.taxable_value);
        const item = {
          SlNo: String(idx + 1),
          PrdDesc: it.product_name,
          IsServc: "N",
          HsnCd: it.hsn_code || "999999",
          Qty: qty,
          Unit: it.uom || it.unit || "OTH",
          UnitPrice: price,
          TotAmt: qty * price,
          Discount: Number(it.discount || 0),
          AssAmt: taxable,
          GstRt:
            Number(it.cgst_percentage || 0) +
            Number(it.sgst_percentage || 0) +
            Number(it.igst_percentage || 0),
          IgstAmt: Number(it.igst_amount || 0),
          SgstAmt: Number(it.sgst_amount || 0),
          CgstAmt: Number(it.cgst_amount || 0),
          TotItemVal: Number(it.line_total || taxable),
        };
        // If final product (E-Rickshaw), include mandatory details
        if (it.isErikshow) {
          item.VehicleDtls = {
            ChassisNo: it.chasis_no || "NA",
            MotorNo: it.motor_no || "NA",
            ControllerNo: it.controller_no || "NA",
            BatteryName: it.battery || "NA",
            BatteryNo: it.battery_sl_no || "NA",
            ChargerName: it.charger || "NA",
            ChargerNo: it.charger_sl_no || "NA",
            Color: it.product_color || "NA",
          };
        }
        return item;
      }),
      ValDtls: {
        AssVal: Number(order.taxable_amount),
        CgstVal: Number(order.cgst_amount),
        SgstVal: Number(order.sgst_amount),
        IgstVal: Number(order.igst_amount),
        TotInvVal: Number(order.grand_total),
      },
    };
    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Summary fetched successfully.",
      responseObject: invoice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to cancel Sales Order",
      responseObject: {},
    });
  }
};

/**
 * Create Party Payment (CASH / BANK)
 *  Party Wise Payment - New Requirement - 12-01-2026
 */
export const createPartyPaymentController = async (req, res) => {
  try {
    const {
      partyType,
      customerId,
      dealerId,
      paymentDate,
      paymentAmount,
      paymentMethod,
      bankId,
      transactionReference,
      notes,
      modeOfTransaction,
      createdBy,
    } = req.body;

    // Validation
    if (
      !partyType ||
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

    if (
      (partyType === "CUSTOMER" && !customerId) ||
      (partyType === "DEALER" && !dealerId)
    ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Valid customer or dealer is required.",
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

    const result = await createPartyPayment({
      partyType,
      customerId,
      dealerId,
      paymentDate,
      paymentAmount,
      paymentMethod,
      bankId,
      transactionReference,
      notes,
      createdBy,
      modeOfTransaction,
    });

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Party payment recorded successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error creating party payment:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to create party payment",
      responseObject: [],
    });
  }
};

/**
 * Fetch Party Payments (Customer / Dealer)
 * Party Wise Payment Listing
 * New Requirement - 12-01-2026
 */
export const getPartyPaymentsController = async (req, res) => {
  try {
    const {
      partyType, // CUSTOMER | DEALER
      customerId,
      dealerId,
      fromDate,
      toDate,
    } = req.body;

    /* ===================== VALIDATIONS ===================== */
    if (!partyType) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Party type is required.",
        responseObject: [],
      });
    }

    if (
      (partyType === "CUSTOMER" && !customerId) ||
      (partyType === "DEALER" && !dealerId)
    ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Valid customer or dealer is required.",
        responseObject: [],
      });
    }

    /* ===================== DEFAULT DATES ===================== */
    const startDate = fromDate || "2020-01-01";
    const endDate = toDate || new Date().toISOString().slice(0, 10);

    /* ===================== FETCH DATA ===================== */
    const result = await getPartyPayments({
      partyType,
      customerId: customerId || null,
      dealerId: dealerId || null,
      fromDate: startDate,
      toDate: endDate,
    });

    /* ===================== RESPONSE ===================== */
    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Party payments fetched successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error fetching party payments:", error);

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to fetch party payments",
      responseObject: [],
    });
  }
};

/**
 * Fetch Year-wise Product Order Count (Customer / Dealer)
 * Sales Analytics
 */
export const getYearWiseProductOrderCountController = async (req, res) => {
  try {
    const {
      partyType, // CUSTOMER | DEALER
      customerId,
      dealerId,
      fromYear,
      toYear,
    } = req.body;

    /* ===================== VALIDATIONS ===================== */
    if (!partyType) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Party type is required.",
        responseObject: [],
      });
    }

    if (
      (partyType === "CUSTOMER" && !customerId) ||
      (partyType === "DEALER" && !dealerId)
    ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Valid customer or dealer is required.",
        responseObject: [],
      });
    }

    /* ===================== DEFAULT YEARS ===================== */
    const startYear = fromYear || 2020;
    const endYear = toYear || new Date().getFullYear();

    /* ===================== FETCH DATA ===================== */
    const result = await getYearWiseProductOrderCount({
      partyType,
      customerId: customerId || null,
      dealerId: dealerId || null,
      fromYear: startYear,
      toYear: endYear,
    });

    /* ===================== RESPONSE ===================== */
    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Year-wise product order count fetched successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error fetching year-wise product order count:", error);

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to fetch year-wise product order count",
      responseObject: [],
    });
  }
};


/**
 * Create Sales Party Discount
 */
export const createSalesPartyDiscountController = async (req, res) => {
  try {
    const {
      partyType, // CUSTOMER | DEALER
      customerId,
      dealerId,
      discountDate,
      discountAmount,
      reason,
      createdBy,
    } = req.body;

    /* ===================== VALIDATIONS ===================== */
    if (!partyType || !discountAmount || !createdBy) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Party type, discount amount and createdBy are required.",
        responseObject: [],
      });
    }

    if (
      (partyType === "CUSTOMER" && !customerId) ||
      (partyType === "DEALER" && !dealerId)
    ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Valid customer or dealer is required.",
        responseObject: [],
      });
    }

    /* ===================== SAVE ===================== */
    const result = await createSalesPartyDiscount({
      partyType,
      customerId: customerId || null,
      dealerId: dealerId || null,
      discountDate,
      discountAmount,
      reason,
      createdBy,
    });

    /* ===================== RESPONSE ===================== */
    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Party discount created successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error creating sales party discount:", error);

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to create sales party discount",
      responseObject: [],
    });
  }
};

/**
 * Fetch Party Discounts
 * Party Wise Discount Ledger
 */
export const getSalesPartyDiscountsController = async (req, res) => {
  try {
    const {
      partyType, // CUSTOMER | DEALER
      customerId,
      dealerId,
      fromDate,
      toDate,
    } = req.body;

    /* ===================== VALIDATIONS ===================== */
    if (!partyType) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Party type is required.",
        responseObject: [],
      });
    }

    if (
      (partyType === "CUSTOMER" && !customerId) ||
      (partyType === "DEALER" && !dealerId)
    ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Valid customer or dealer is required.",
        responseObject: [],
      });
    }

    /* ===================== DEFAULT DATES ===================== */
    const startDate = fromDate || "2020-01-01";
    const endDate = toDate || new Date().toISOString().slice(0, 10);

    /* ===================== FETCH ===================== */
    const result = await getSalesPartyDiscounts({
      partyType,
      customerId: customerId || null,
      dealerId: dealerId || null,
      fromDate: startDate,
      toDate: endDate,
    });

    /* ===================== RESPONSE ===================== */
    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Party discounts fetched successfully.",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error fetching party discounts:", error);

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to fetch party discounts",
      responseObject: [],
    });
  }
};


/**
 * Delete Sales Party Discount (Soft Delete)
 */
export const deleteSalesPartyDiscountController = async (req, res) => {
  try {
    const { salesPartyDiscountId } = req.body;

    if (!salesPartyDiscountId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Sales party discount ID is required.",
        responseObject: [],
      });
    }

    await deleteSalesPartyDiscount({
      salesPartyDiscountId,
    });

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Party discount deleted successfully.",
      responseObject: true,
    });
  } catch (error) {
    console.error("Error deleting sales party discount:", error);

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: error.message || "Failed to delete sales party discount",
      responseObject: [],
    });
  }
};
