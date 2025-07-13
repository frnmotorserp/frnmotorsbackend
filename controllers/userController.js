import { getAllUsersFromDB, createUserInDB, updateUserInDB, getAllRolesModel } from '../models/userModel.js';
import bcrypt from 'bcrypt';

export const fetchAllUsers = async (req, res) => {
  try {
    const users = await getAllUsersFromDB();
    res.status(200).json({
      sessionDTO: {
        status: true,
        reasonCode: 'success'
      },
      status: true,
      message: 'Success',
      responseObject: users
    });

  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({
      sessionDTO: {
        status: false,
        reasonCode: 'server_error'
      },
      status: false,
      message: 'Failed to fetch users',
      responseObject: null
    });
  }
};

export const addOrUpdateUser = async (req, res) => {
  try {
    const userData = req.body;

    //  Validate required fields for both add and update
    const requiredFields = ['userFirstName', 'userLastName', 'loginId', 'roleMasterId', 'mobileNumber', 'email'];
    const missingFields = requiredFields.filter(field => !userData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        sessionDTO: {
          status: false,
          reasonCode: 'validation_error'
        },
        status: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        responseObject: null
      });
    }

    let result;

    if (userData.userId) {
      //  Update existing user
      result = await updateUserInDB(userData.userId, userData);

      res.status(200).json({
        sessionDTO: {
          status: true,
          reasonCode: 'success'
        },
        status: true,
        message: 'User updated successfully!',
        responseObject: result
      });
    } else {
      const defaultPassword = 'Abcd@1234';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      userData.password = hashedPassword;
      // ➕ Create new user
      result = await createUserInDB(userData);

      res.status(201).json({
        sessionDTO: {
          status: true,
          reasonCode: 'success'
        },
        status: true,
        message: 'User created successfully!',
        responseObject: result
      });
    }

  } catch (error) {
    console.error('Error in addOrUpdateUser:', error.message);

    res.status(500).json({
      sessionDTO: {
        status: false,
        reasonCode: 'server_error'
      },
      status: false,
      message: 'Failed to process user request',
      responseObject: null
    });
  }
};




export const getAllRoles = async (req, res) => {
  try {
    const roles = await getAllRolesModel();

    res.status(200).json({
      sessionDTO: {
        status: true,
        reasonCode: 'success'
      },
      status: true,
      message: 'Success',
      responseObject: roles
    });

  } catch (error) {
    console.error('Error fetching roles:', error.message);

    res.status(500).json({
      sessionDTO: {
        status: false,
        reasonCode: 'failure'
      },
      status: false,
      message: 'Failed to fetch roles',
      responseObject: null
    });
  }
};
