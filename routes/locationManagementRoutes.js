import express from 'express';
import { getCompanyDetailsList,  getStateList, listAllDistricts, saveOrUpdateDistrictController, listAllLocationTypes, saveOrUpdateLocationTypeController, saveOrUpdateLocationController, listAllLocationsController, listAllUserLocationMappings, saveOrUpdateUserLocationMappingController } from "../controllers/locationController.js";
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.post('/listAllStates', verifyToken,  getStateList);
router.post('/listAllDistricts', verifyToken,  listAllDistricts);
router.post('/saveOrUpdateDistrict', verifyToken,  saveOrUpdateDistrictController);
router.post('/listAllLocationTypes', verifyToken, listAllLocationTypes);
router.post('/saveOrUpdateLocationType', verifyToken, saveOrUpdateLocationTypeController);
router.post('/locations', verifyToken, listAllLocationsController);
router.post('/saveOrUpdateLocation', verifyToken, saveOrUpdateLocationController);
router.post('/userLocationMaps', verifyToken, listAllUserLocationMappings);
router.post('/saveOrUpdateUserLocationMap', verifyToken, saveOrUpdateUserLocationMappingController);
router.post('/getCompanyDetailsList', verifyToken, getCompanyDetailsList);

export default router;