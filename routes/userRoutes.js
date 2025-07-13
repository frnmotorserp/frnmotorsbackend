import express from 'express';
import { fetchAllUsers, addOrUpdateUser, getAllRoles  } from '../controllers/userController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.get('/users', fetchAllUsers);
router.post('/saveOrUpdate', verifyToken, addOrUpdateUser);
router.post('/listAllRoles', verifyToken, getAllRoles );

export default router;
