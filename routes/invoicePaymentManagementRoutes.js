import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";

import {
  getPaymentsGroupedByInvoiceController,
  getInvoiceWithItemsController,
  getInvoicesByFiltersController,
  saveOrUpdateInvoiceController,
  getPaymentsByInvoiceIdController,
  syncPaymentsForInvoiceController,
  createCashEntry,
  editCashEntry,
  removeCashEntry,
  listCashEntries,
  fetchCashBalance,
  createBankTransactionController,
  listBankTransactionsController,
  fetchBankBalanceController,
  getBanks,
  getVendorInvoicesWithPaymentsFYController,
  createVendorPaymentController,
  getVendorPaymentsController,
  createVendorDiscountController,
  getVendorDiscountsController,
  softDeleteVendorPaymentController,
  softDeleteInvoiceController,
} from "../controllers/invoicePaymentController.js";

import {
  saveOrUpdateExpenseCategoryController,
  listAllExpenseCategories,
} from "../controllers/expenseCategoryController.js";

const router = express.Router();

router.post("/listAllInvoices", verifyToken, getInvoicesByFiltersController);
router.post("/addInvoice", verifyToken, saveOrUpdateInvoiceController);
router.post("/managePayments", verifyToken, syncPaymentsForInvoiceController);
router.post("/getAllPayments", verifyToken, getPaymentsByInvoiceIdController);
router.post(
  "/getPaymentsGroupedByInvoice",
  verifyToken,
  getPaymentsGroupedByInvoiceController
);
router.post("/getInvoiceWithItems", verifyToken, getInvoiceWithItemsController);
router.post("/createCashEntry", verifyToken, createCashEntry);
router.post("/editCashEntry", verifyToken, editCashEntry);
router.post("/removeCashEntry", verifyToken, removeCashEntry);
router.post("/listCashEntries", verifyToken, listCashEntries); // ?startDate=2025-09-01&endDate=2025-09-03
router.post("/fetchCashBalance", verifyToken, fetchCashBalance);

// Bank Book routes
router.post(
  "/createBankTransaction",
  verifyToken,
  createBankTransactionController
);
router.post(
  "/listBankTransactions",
  verifyToken,
  listBankTransactionsController
); // ?bank_id=1&startDate=2025-09-01&endDate=2025-09-03
router.post("/fetchBankBalance", verifyToken, fetchBankBalanceController); // ?bank_id=1
router.post("/getBanks", verifyToken, getBanks);

router.post(
  "/getVendorInvoicesWithPaymentsFY",
  verifyToken,
  getVendorInvoicesWithPaymentsFYController
);

router.post(
  "/saveOrUpdateExpenseCategory",
  verifyToken,
  saveOrUpdateExpenseCategoryController
);
router.post("/listAllExpenseCategories", verifyToken, listAllExpenseCategories);

router.post("/createVendorPayment", verifyToken, createVendorPaymentController);
router.post("/getVendorPayments", verifyToken, getVendorPaymentsController);
router.post("/getVendorDiscounts", verifyToken, getVendorDiscountsController);
router.post(
  "/createVendorDiscount",
  verifyToken,
  createVendorDiscountController
);
router.post(
  "/softDeleteVendorPayment",
  verifyToken,
  softDeleteVendorPaymentController
);
router.post(
  "/softDeleteInvoice",
  verifyToken,
  softDeleteInvoiceController
);

export default router;
