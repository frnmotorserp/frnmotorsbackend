import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';

import { getInvoicesByFiltersController, saveOrUpdateInvoiceController, getPaymentsByInvoiceIdController, syncPaymentsForInvoiceController } from '../controllers/invoicePaymentController.js';


const router = express.Router();

router.post('/listAllInvoices', verifyToken,  getInvoicesByFiltersController);
router.post('/addInvoice', verifyToken,  saveOrUpdateInvoiceController);
router.post('/managePayments', verifyToken,  syncPaymentsForInvoiceController);
router.post('/getAllPayments', verifyToken,  getPaymentsByInvoiceIdController);



export default router;