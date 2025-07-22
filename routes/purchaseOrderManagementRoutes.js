import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';

import { saveOrUpdatePOController, listAllPOs, getPOSummary, getPOItemsByPOIdController } from '../controllers/purchaseOrderController.js';


const router = express.Router();

router.post('/listAllPOs', verifyToken,  listAllPOs);
router.post('/saveOrUpdatePO', verifyToken,  saveOrUpdatePOController);
router.post('/getPOSummary', verifyToken,  getPOSummary);
router.post('/getPOItems', verifyToken,  getPOItemsByPOIdController);


export default router;