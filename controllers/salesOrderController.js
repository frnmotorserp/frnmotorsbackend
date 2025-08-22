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
  getYearlySalesReport 
} from "../models/salesOrderModel.js";

import { deletePayment, saveOrUpdatePayment, getPaymentsBySalesOrderId } from "../models/paymentTrackingModel.js";

// 1. Save or Update Sales Order
export const saveOrUpdateSalesOrderController = async (req, res) => {
  try {
    const orderDTO = req.body;

    if (!orderDTO.userId || !orderDTO.salesOrderCode || !orderDTO.orderDate || !Array.isArray(orderDTO.items) || orderDTO.items.length === 0) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'User ID, Sales Order Code, Order Date and Items are required.',
        responseObject: []
      });
    }

    const result = await saveOrUpdateSalesOrder(orderDTO, orderDTO.items);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Sales Order saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating Sales Order:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to save or update Sales Order',
      responseObject: []
    });
  }
};

// 2. List All Sales Orders within Date Range (optional customer/dealer filter)
export const listAllSalesOrders = async (req, res) => {
  try {
    const { startDate, endDate, customerId, dealerId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Start and end dates are required.',
        responseObject: []
      });
    }

    const rows = await getSalesOrdersByDateRange(startDate, endDate, customerId, dealerId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching Sales Orders:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch Sales Orders',
      responseObject: []
    });
  }
};

// 3. Summary by Status
export const getSalesOrderSummaryController = async (req, res) => {
  try {
    const rows = await getSalesOrderSummary();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Summary fetched successfully.',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching Sales Order summary:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch Sales Order summary',
      responseObject: []
    });
  }
};

// 4. Get Sales Order Items by ID
export const getSalesOrderItemsController = async (req, res) => {
  try {
    const { salesOrderId } = req.body;
    

    if (!salesOrderId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Sales Order ID is required.',
        responseObject: []
      });
    }

    const items = await getSalesOrderItemsById(salesOrderId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Sales Order Items fetched successfully.',
      responseObject: items
    });

  } catch (error) {
    console.error('Error fetching Sales Order items:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch Sales Order Items',
      responseObject: []
    });
  }
};

// 5. Update Sales Order Status
export const updateSalesOrderStatusController = async (req, res) => {
  try {
    const { salesOrderId, status, updatedBy } = req.body;

    if (!salesOrderId || !status || !updatedBy) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Sales Order ID, status, and updatedBy are required.',
        responseObject: []
      });
    }

    const result = await updateSalesOrderStatus(salesOrderId, status, updatedBy);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Sales Order status updated successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error updating Sales Order status:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to update Sales Order status',
      responseObject: []
    });
  }
};

// 6. Get Sales Orders by Customer or Dealer
export const getSalesOrdersByPartyController = async (req, res) => {
  try {
    const { partyId, partyType } = req.body;

    if (!partyId || (partyType !== 'CUSTOMER' && partyType !== 'DEALER')) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'partyId and partyType (CUSTOMER/DEALER) are required.',
        responseObject: []
      });
    }

    const data = await getSalesOrdersByParty(partyId, partyType);

    res.status(200).json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Sales Orders fetched successfully.',
      responseObject: data
    });

  } catch (error) {
    console.error('Error fetching Sales Orders by party:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Internal server error.',
      responseObject: []
    });
  }
};


export const listAllAvailableSalebleItems = async (req, res) => {
  try {
    const { locationId } = req.body;

    if (!locationId ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Please provide a location.',
        responseObject: []
      });
    }

    const rows = await getAllAvailableItemsforSell(locationId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching available  items for sell in the specified location.', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch available  items for sell in the specified location.',
      responseObject: []
    });
  }
};


// 1. Save or Update Payment
export const saveOrUpdatePaymentController = async (req, res) => {
  try {
    const paymentDTO = req.body;
    const {
      salesOrderId,
      paymentDate,
      paymentAmount,
      userId
    } = paymentDTO;

    if (!userId || !salesOrderId || !paymentDate || !paymentAmount) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'User ID, Sales Order ID, Payment Date and Payment Amount are required.',
        responseObject: []
      });
    }

    const result = await saveOrUpdatePayment(paymentDTO);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: paymentDTO.paymentId
        ? 'Payment updated successfully.'
        : 'Payment saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating Payment:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to save or update Payment',
      responseObject: []
    });
  }
};

// 2. Get Payments by Sales Order ID
export const getPaymentsBySalesOrderIdController = async (req, res) => {
  try {
    const { salesOrderId } = req.body;

    if (!salesOrderId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Sales Order ID is required.',
        responseObject: []
      });
    }

    const result = await getPaymentsBySalesOrderId(salesOrderId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Payments retrieved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error fetching Payments:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to retrieve Payments',
      responseObject: []
    });
  }
};

// 3. Delete Payment
export const deletePaymentController = async (req, res) => {
  try {
    const { paymentId, salesOrderId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Payment ID is required.',
        responseObject: []
      });
    }

    const result = await deletePayment(paymentId, salesOrderId);

    if (!result) {
      return res.status(404).json({
        sessionDTO: { status: false, reasonCode: 'not_found' },
        status: false,
        message: 'Payment not found.',
        responseObject: []
      });
    }

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Payment deleted successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error deleting Payment:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to delete Payment',
      responseObject: []
    });
  }
};




export const getSalesOrdersWithPaymentsController = async (req, res) => {
  try {
    
    let { startDate, endDate, customerId, dealerId } = req.body;

    
    // Call model function (you’ll create it in salesOrderModel.js)
    const orders = await getOrdersWithPayments( customerId, dealerId, startDate, endDate);

    res.status(200).json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Sales orders with payment details fetched successfully.",
      responseObject: orders
    });

  } catch (error) {
    console.error("Error fetching sales orders with payments:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch sales orders with payments",
      responseObject: []
    });
  }
};


export const getMonthlySalesReportController = async (req, res) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Year and Month are required.',
        responseObject: []
      });
    }

    const rows = await getMonthlySalesReport(year, month);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Monthly sales report fetched successfully.',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching monthly sales report:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch monthly sales report',
      responseObject: []
    });
  }
};


export const getYearlySalesReportController = async (req, res) => {
  try {
    const { year } = req.body;

    if (!year) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Year is required.',
        responseObject: []
      });
    }

    const rows = await getYearlySalesReport(year);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Yearly sales report fetched successfully.',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching yearly sales report:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch yearly sales report',
      responseObject: []
    });
  }
};