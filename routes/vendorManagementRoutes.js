import express from 'express';
import { saveOrUpdateVendorController, listAllVendors  } from "../controllers/vendorController.js";
import { verifyToken } from '../middlewares/verifyToken.js';


const router = express.Router();

router.post('/listAllVendors', verifyToken,  listAllVendors);
router.post('/saveOrUpdateVendor', verifyToken,  saveOrUpdateVendorController);


export default router;