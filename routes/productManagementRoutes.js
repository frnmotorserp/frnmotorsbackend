import express from 'express';
import { saveOrUpdateProductCategoryController, listAllProductCategories } from '../controllers/productCategoryController.js';
import { listAllProductFeatures, saveOrUpdateProductFeatureController } from '../controllers/productFeatureController.js';
import { listAllProducts, saveOrUpdateProductController, getProductFeaturesByProductId, updateProductStatusController } from '../controllers/productController.js';
import { saveOrUpdateBOMController, getBOMByProductIdController } from '../controllers/bomController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.post('/listAllProductCategory', verifyToken,  listAllProductCategories);
router.post('/saveOrUpdateProductCategory', verifyToken,  saveOrUpdateProductCategoryController);

router.post('/listAllProductFeatures', verifyToken,  listAllProductFeatures);
router.post('/saveOrUpdateProductFeature', verifyToken,  saveOrUpdateProductFeatureController);


router.post('/listAllProducts', verifyToken,  listAllProducts);
router.post('/saveOrUpdateProductController', verifyToken,  saveOrUpdateProductController);
router.post('/getProductFeaturesByProductId', verifyToken,  getProductFeaturesByProductId);

router.post('/getBOMDetails', verifyToken,  getBOMByProductIdController);
router.post('/saveOrUpdateBOM', verifyToken,  saveOrUpdateBOMController);


router.post('/updateProductStatus', verifyToken,  updateProductStatusController);




export default router;