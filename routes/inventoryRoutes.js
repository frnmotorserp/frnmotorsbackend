import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
getAllInventoryController
} from '../controllers/inventoryController.js';

const router = express.Router();

router.post('/getAllInventory', verifyToken, getAllInventoryController);

export default router;
