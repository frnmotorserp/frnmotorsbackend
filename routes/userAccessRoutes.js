import express from 'express';
import { getAllMenuFunctions, getMenuAccess, getAccessTypes, saveRoleAccessMapping} from '../controllers/userAccessController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.post('/listAllFunctions', verifyToken,  getAllMenuFunctions);
router.post('/view', verifyToken,  getMenuAccess);
router.post('/listAccessTypes', verifyToken,  getAccessTypes);
router.post('/save', verifyToken,  saveRoleAccessMapping);

export default router;
