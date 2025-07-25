import {
  saveOrUpdateGRN,
  getGRNs,
  getGRNItems,
  getGRNsWithItemsByPO

} from '../models/grnModel.js';

// Save or Update GRN
export const saveOrUpdateGRNController = async (req, res) => {
  try {
    const grnDTO = req.body;
    

    if (!grnDTO.poId || !grnDTO.vendorId || !grnDTO.locationId ||  !grnDTO.grnDate || !(Array.isArray(grnDTO.items) && grnDTO.items.length > 0)  ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'PO ID, Vendor ID, GRN Date, Location Id, GRN Items are required.',
        responseObject: []
      });
    }

    const result = await saveOrUpdateGRN(grnDTO, grnDTO.items);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'GRN saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving GRN:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to save GRN',
      responseObject: []
    });
  }
};

// Get GRNs by Vendor, PO and Date Range
export const getGRNsByFilterController = async (req, res) => {
  try {
    const { vendorId, poId, startDate, endDate  } = req.body;

    const rows = await getGRNs({ vendorId, poId, startDate, endDate });

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'GRNs fetched successfully.',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch GRNs',
      responseObject: []
    });
  }
};


export const getGRNItemsController = async (req, res) => {
  try {
    const { grnId } = req.body;

    if (!grnId || isNaN(parseInt(grnId))) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Valid GRN ID is required.',
        responseObject: []
      });
    }

    const items = await getGRNItems(grnId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'GRN items fetched successfully.',
      responseObject: items
    });

  } catch (error) {
    console.error('Error fetching GRN items:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch GRN items',
      responseObject: []
    });
  }
};

export const getGRNsWithItemsByPOController = async (req, res) => {
  try {
    const { poId } = req.body;

    if (!poId || isNaN(parseInt(poId))) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Valid Purchase Order ID is required.',
        responseObject: []
      });
    }

    const data = await getGRNsWithItemsByPO(poId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'GRNs with items fetched successfully.',
      responseObject: data
    });

  } catch (error) {
    console.error('Error fetching GRNs with items by PO ID:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch GRNs with items.',
      responseObject: []
    });
  }
};

