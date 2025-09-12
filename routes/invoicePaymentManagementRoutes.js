import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';

import { getPaymentsGroupedByInvoiceController, getInvoiceWithItemsController,
      getInvoicesByFiltersController, 
      saveOrUpdateInvoiceController, getPaymentsByInvoiceIdController, 
      syncPaymentsForInvoiceController,
      createCashEntry,
      editCashEntry,
      removeCashEntry,
      listCashEntries,
      fetchCashBalance,
} from '../controllers/invoicePaymentController.js';


const router = express.Router();

router.post('/listAllInvoices', verifyToken,  getInvoicesByFiltersController);
router.post('/addInvoice', verifyToken,  saveOrUpdateInvoiceController);
router.post('/managePayments', verifyToken,  syncPaymentsForInvoiceController);
router.post('/getAllPayments', verifyToken,  getPaymentsByInvoiceIdController);
router.post('/getPaymentsGroupedByInvoice', verifyToken,  getPaymentsGroupedByInvoiceController);
router.post('/getInvoiceWithItems', verifyToken,  getInvoiceWithItemsController);
router.post("/createCashEntry", verifyToken, createCashEntry);
router.post("/editCashEntry", verifyToken, editCashEntry);
router.post("/removeCashEntry", verifyToken, removeCashEntry);
router.post("/listCashEntries", verifyToken, listCashEntries);        // ?startDate=2025-09-01&endDate=2025-09-03
router.post("/fetchCashBalance", verifyToken, fetchCashBalance);


export default router;
