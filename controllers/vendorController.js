import { getAllVendors, saveOrUpdateVendor } from "../models/vendorModel.js";

// 1. List All Vendors with Details
export const listAllVendors = async (req, res) => {
  try {
    const rows = await getAllVendors();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch vendors',
      responseObject: []
    });
  }
};

// 2. Save or Update Vendor with Details
export const saveOrUpdateVendorController = async (req, res) => {
  try {
    const vendorDTO = req.body;

    if (!vendorDTO.vendorCode || !vendorDTO.vendorName || !vendorDTO.userId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Vendor Code, Name, and User ID are required.',
        responseObject: []
      });
    }

    const result = await saveOrUpdateVendor(vendorDTO);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Vendor saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating vendor:', error);
    const message = error.message || 'Failed to save or update vendor';

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message,
      responseObject: []
    });
  }
};
