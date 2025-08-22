import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
  saveOrUpdateSalesOrderController,
  listAllSalesOrders,
  getSalesOrderSummaryController,
  getSalesOrderItemsController,
  updateSalesOrderStatusController,
  getSalesOrdersByPartyController,
  listAllAvailableSalebleItems,
  deletePaymentController,
  getPaymentsBySalesOrderIdController,
  saveOrUpdatePaymentController,
  getSalesOrdersWithPaymentsController,
  getMonthlySalesReportController,
  getYearlySalesReportController
} from '../controllers/salesOrderController.js';

const router = express.Router();

// Save or Update Sales Order
router.post('/saveOrUpdateSalesOrder', verifyToken, saveOrUpdateSalesOrderController);

// List Sales Orders by date range (with optional filters)
router.post('/listAllSalesOrders', verifyToken, listAllSalesOrders);
router.post('/getMonthlySalesReport', verifyToken, getMonthlySalesReportController);
router.post('/getYearlySalesReport', verifyToken, getYearlySalesReportController);

// Get Sales Order summary by status
router.get('/getSalesOrderSummary', verifyToken, getSalesOrderSummaryController);

// Get Sales Order items by Sales Order ID
router.post('/getSalesOrderItems', verifyToken, getSalesOrderItemsController);

// Update Sales Order Status (Confirmed, Cancelled, etc.)
router.post('/updateSalesOrderStatus', verifyToken, updateSalesOrderStatusController);

// Get Sales Orders by Customer or Dealer
router.post('/getSalesOrdersByParty', verifyToken, getSalesOrdersByPartyController);

router.post('/listAllAvailableSalebleItems', verifyToken, listAllAvailableSalebleItems);
router.post('/getSalesOrdersWithPayments', verifyToken, getSalesOrdersWithPaymentsController);


router.post('/saveOrUpdateOrderPayment', verifyToken, saveOrUpdatePaymentController);
router.post('/getPaymentsBySalesOrderId', verifyToken, getPaymentsBySalesOrderIdController);
router.post('/deletePayment', verifyToken, deletePaymentController);

export default router;
