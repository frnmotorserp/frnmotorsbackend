import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';

import { getPaymentsGroupedByInvoiceController, getInvoiceWithItemsController,
      getInvoicesByFiltersController, saveOrUpdateInvoiceController, getPaymentsByInvoiceIdController, syncPaymentsForInvoiceController } from '../controllers/invoicePaymentController.js';


const router = express.Router();

router.post('/listAllInvoices', verifyToken,  getInvoicesByFiltersController);
router.post('/addInvoice', verifyToken,  saveOrUpdateInvoiceController);
router.post('/managePayments', verifyToken,  syncPaymentsForInvoiceController);
router.post('/getAllPayments', verifyToken,  getPaymentsByInvoiceIdController);
router.post('/getPaymentsGroupedByInvoice', verifyToken,  getPaymentsGroupedByInvoiceController);
router.post('/getInvoiceWithItems', verifyToken,  getInvoiceWithItemsController);



export default router;