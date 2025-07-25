import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
  saveOrUpdateGRNController,
  getGRNsByFilterController, 
  getGRNItemsController,
  getGRNsWithItemsByPOController
} from '../controllers/grnController.js';

const router = express.Router();

router.post('/saveOrUpdateGRN', verifyToken, saveOrUpdateGRNController);
router.post('/getGRNsByFilter', verifyToken, getGRNsByFilterController);
router.post('/getGRNItems', verifyToken, getGRNItemsController);
router.post('/getGRNsWithItemsByPO', verifyToken, getGRNsWithItemsByPOController);

export default router;
