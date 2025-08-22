import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  getUserByLoginId,
  getRoleById,
  getUserAccessByRoleId,
  updateUserPassword,
  getUserByUserId,
  resetUserPasswordByAdmin,
  createSession,
  endSession
} from '../models/authModel.js';
import dotenv from 'dotenv';

dotenv.config();

export const loginUser = async (req, res) => {
  const { loginId, password } = req.body;

  try {
    const user = await getUserByLoginId(loginId);
    if (!user) {
      return res.status(401).json({
        sessionDTO: { status: false, reasonCode: 'auth_failed' },
        status: false,
        message: 'Invalid login credentials',
        responseObject: null
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        sessionDTO: { status: false, reasonCode: 'auth_failed' },
        status: false,
        message: 'Invalid login credentials',
        responseObject: null
      });
    }

    const role = await getRoleById(user.role_id);
    const accessList = await getUserAccessByRoleId(user.role_id);

    const menuMap = {};
    for (const row of accessList) {
      const {
        function_master_id,
        function_short_name,
        sub_function_master_id,
        sub_function_short_name,
        access_type,
        sub_sort_order
      } = row;

      if (!menuMap[function_master_id]) {
        menuMap[function_master_id] = {
          functionMasterId: function_master_id,
          functionShortName: function_short_name,
          subMenuDetailList: {}
        };
      }

      const subMenuMap = menuMap[function_master_id].subMenuDetailList;
      if (!subMenuMap[sub_function_master_id]) {
        subMenuMap[sub_function_master_id] = {
          subFunctionMasterId: sub_function_master_id,
          subFunctionShortName: sub_function_short_name,
          subFunctionSortOrder: sub_sort_order,

          accessDetailList: []
        };
      }

      subMenuMap[sub_function_master_id].accessDetailList.push({ accessType: access_type });
    }

    const menuDetailList = Object.values(menuMap).map(f => ({
      ...f,
      subMenuDetailList: Object.values(f.subMenuDetailList)
    }));

    const token = jwt.sign(
      {
        userId: user.user_id,
        loginId: user.login_id,
        roleId: user.role_id
      },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '2h' }
    );
    await createSession(user.user_id, token)
    res.status(200).json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: user.first_login_flag
        ? 'You seem to attempt logging in for the very first time. You must reset your password.'
        : 'Login successful.',
      responseObject: {
        menuDetailList,
        userdetailDTO: {
          userId: user.user_id,
          loginId: user.login_id,
          userFirstName: user.first_name,
          userMiddleName: user.middle_name,
          userLastName: user.last_name,
          userMobilePrimary: user.primary_mobile,
          userEmailPrimary: user.primary_email
        },
        RoledetailDTO: {
          roleMasterId: role.role_id,
          roleShortName: role.role_short_name,
          roleDescription: role.role_name
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Internal server error',
      responseObject: null
    });
  }
};


export const resetPassword = async (req, res) => {
    const { userId, newPassword } = req.body;
  
    if (!userId || !newPassword) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'userId and newPassword are required',
        responseObject: null
      });
    }
  
    try {
      const user = await getUserByUserId(userId);
      if (!user) {
        return res.status(404).json({
          sessionDTO: { status: false, reasonCode: 'not_found' },
          status: false,
          message: 'User not found',
          responseObject: null
        });
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await updateUserPassword(userId, hashedPassword);
  
      res.status(200).json({
        sessionDTO: { status: true, reasonCode: 'success' },
        status: true,
        message: 'Password reset successfully',
        responseObject: {
          userId: updatedUser.user_id,
          loginId: updatedUser.login_id
        }
      });
  
    } catch (error) {
      console.error('Reset password error:', error.message);
      res.status(500).json({
        sessionDTO: { status: false, reasonCode: 'server_error' },
        status: false,
        message: 'Internal server error',
        responseObject: null
      });
    }
  };

  export const adminResetPassword = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      sessionDTO: { status: false, reasonCode: 'validation_error' },
      status: false,
      message: 'userId is required',
      responseObject: null
    });
  }

  try {
    const updatedUser = await resetUserPasswordByAdmin(userId);

    if (!updatedUser) {
      return res.status(404).json({
        sessionDTO: { status: false, reasonCode: 'not_found' },
        status: false,
        message: 'User not found',
        responseObject: null
      });
    }

    res.status(200).json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: `Password reset to default ('Abcd@1234') for user: ${updatedUser.login_id}`,
      responseObject: {
        userId: updatedUser.user_id,
        loginId: updatedUser.login_id
      }
    });

  } catch (error) {
    console.error('Admin reset password error:', error.message);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Internal server error',
      responseObject: null
    });
  }
};


export const logoutUser = async (req, res) => {
  try {
    // Expect JWT in body for POST
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'missing_token' },
        status: false,
        message: 'Token is required in request body',
        responseObject: null
      });
    }

    // Close the session in DB
    const session = await endSession(token);

    if (!session) {
      return res.status(404).json({
        sessionDTO: { status: false, reasonCode: 'session_not_found' },
        status: false,
        message: 'Session not found or already logged out',
        responseObject: null
      });
    }

    res.status(200).json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Logout successful',
      responseObject: {
        userId: session.user_id,
        loginTime: session.login_time,
        logoutTime: session.logout_time,
        durationMinutes: session.duration_minutes
      }
    });

  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Internal server error',
      responseObject: null
    });
  }
};
