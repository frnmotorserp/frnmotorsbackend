import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { getDashboardSummaryController, listTodayUsersTime, getUserDailyTotalTime, fetchProductsSoldReport, listInactiveSalesmen  } from '../controllers/dashboardController.js';

const router = express.Router();

// Save or Update Sales Order
router.post('/listTodayUsersTime', verifyToken, listTodayUsersTime);
router.post('/getUserDailyTotalTime', verifyToken, getUserDailyTotalTime);
router.post('/fetchProductsSoldReport', verifyToken, fetchProductsSoldReport);
router.post('/listInactiveSalesmen', verifyToken, listInactiveSalesmen);
router.post('/getDashboardSummary', verifyToken, getDashboardSummaryController);


export default router;