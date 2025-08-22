import { getAllCustomers, saveOrUpdateCustomer } from "../models/customerModel.js";

// 1. List All Customers
export const listAllCustomers = async (req, res) => {
  try {
    const rows = await getAllCustomers();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch customers',
      responseObject: []
    });
  }
};

// 2. Save or Update Customer
export const saveOrUpdateCustomerController = async (req, res) => {
  try {
    const customerDTO = req.body;

    if (!customerDTO.customerCode || !customerDTO.customerName) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Customer Code and Name are required.',
        responseObject: []
      });
    }

    const result = await saveOrUpdateCustomer(customerDTO);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Customer saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating customer:', error);
    const message = error.message || 'Failed to save or update customer';

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message,
      responseObject: []
    });
  }
};
