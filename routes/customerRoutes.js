import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { listAllCustomers, saveOrUpdateCustomerController } from '../controllers/customerController.js';

const router = express.Router();

router.post('/listAllCustomers', verifyToken,  listAllCustomers);
router.post('/saveOrUpdateCustomerController', verifyToken,  saveOrUpdateCustomerController);


export default router;