import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
getAllInventoryController, adjustInventoryController, getInventoryAdjustmentsByFilterController, getAllInventoryIssuesController, createInventoryIssueController, getProductSerialsController
} from '../controllers/inventoryController.js';

const router = express.Router();

router.post('/getAllInventory', verifyToken, getAllInventoryController);
router.post('/adjustInventory', verifyToken, adjustInventoryController);
router.post('/getInventoryAdjustmentsByFilter', verifyToken, getInventoryAdjustmentsByFilterController);
router.post('/createInventoryIssue', verifyToken, createInventoryIssueController);
router.post('/getAllInventoryIssues', verifyToken, getAllInventoryIssuesController);
router.post('/getProductSerials', verifyToken, getProductSerialsController);

export default router;
