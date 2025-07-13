import express from 'express';
import { loginUser, resetPassword, adminResetPassword  } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginUser);
router.post('/initialResetPassword', verifyToken, resetPassword);
router.post('/resetPasswordAdmin', verifyToken, adminResetPassword);

export default router;
