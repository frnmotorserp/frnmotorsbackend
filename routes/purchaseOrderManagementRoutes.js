import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';

import { saveOrUpdatePOController, listAllPOs, getPOSummary, getPOItemsByPOIdController, updatePOStatusController, getPOsByVendorController } from '../controllers/purchaseOrderController.js';


const router = express.Router();

router.post('/listAllPOs', verifyToken,  listAllPOs);
router.post('/saveOrUpdatePO', verifyToken,  saveOrUpdatePOController);
router.post('/getPOSummary', verifyToken,  getPOSummary);
router.post('/getPOItems', verifyToken,  getPOItemsByPOIdController);
router.post('/updatePOStatus', verifyToken,  updatePOStatusController);
router.post('/getPOsByVendor', verifyToken,  getPOsByVendorController);


export default router;