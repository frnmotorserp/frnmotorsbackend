import {
  saveOrUpdatePO,
  getPOsByDateRange,
  getPOSummaryDetail,
  getPOItemsByPOId 
} from "../models/purchaseOrderModel.js";

// 1. Save or Update Purchase Order
export const saveOrUpdatePOController = async (req, res) => {
  try {
    const poDTO = req.body;

    if (!poDTO.vendorId || !poDTO.poDate || !poDTO.userId || !Array.isArray(poDTO.poItems) || poDTO.poItems.length === 0) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Vendor, PO Date, User ID and PO Items are required.',
        responseObject: []
      });
    }

    const result = await saveOrUpdatePO(poDTO, poDTO.poItems );

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Purchase Order saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating PO:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to save or update Purchase Order',
      responseObject: []
    });
  }
};

// 2. List All POs within Date Range
export const listAllPOs = async (req, res) => {
  try {
    const { startDate, endDate, vendorId } = req.body;

    if (!startDate || !endDate || !vendorId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Start, end dates and vendor id are required.',
        responseObject: []
      });
    }

    const rows = await getPOsByDateRange(startDate, endDate, vendorId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching POs:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch Purchase Orders',
      responseObject: []
    });
  }
};

// 3. Summary by Status
export const getPOSummary = async (req, res) => {
  try {
    const rows = await getPOSummaryDetail();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Summary fetched successfully.',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching PO summary:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch Purchase Order summary',
      responseObject: []
    });
  }
};

// 4. Get PO Items of a Purchase Order 
export const getPOItemsByPOIdController = async (req, res) => {
  try {
    const { purchaseOrderId } = req.body;

    if (!purchaseOrderId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Purchase Order ID is required.',
        responseObject: []
      });
    }

    const items = await getPOItemsByPOId(purchaseOrderId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'PO Items fetched successfully.',
      responseObject: items
    });

  } catch (error) {
    console.error('Error fetching PO items:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch PO Items',
      responseObject: []
    });
  }
};
