// middlewares/verifyToken.js
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
 
  const token = req.body.token;

  if (!token) {
    return res.status(401).json({
      sessionDTO: { status: false, reasonCode: 'auth_missing' },
      status: false,
      message: 'Token not provided in request body',
      responseObject: null
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    req.user = decoded; // attach decoded info (userId, loginId, roleId)
    next();
  } catch (error) {
    return res.status(403).json({
      sessionDTO: { status: false, reasonCode: 'invalid_token' },
      status: false,
      message: 'Invalid or expired token',
      responseObject: null
    });
  }
};
