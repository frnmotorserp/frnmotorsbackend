import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { listAllDealers, saveOrUpdateDealerController, getDealersByReportingUserController } from '../controllers/dealerController.js';
import { saveDealerVisitController, getDealerVisitLogs } from '../controllers/dealerVisitLogConroller.js';

const router = express.Router();

router.post('/listAllDealers', verifyToken,  listAllDealers);
router.post('/saveOrUpdateDealer', verifyToken,  saveOrUpdateDealerController);
router.post('/getDealersByReportingUser', verifyToken,  getDealersByReportingUserController);
router.post('/saveDealerVisitLog', verifyToken,  saveDealerVisitController);
router.post('/getDealerVisitLogs', verifyToken,  getDealerVisitLogs);


export default router;