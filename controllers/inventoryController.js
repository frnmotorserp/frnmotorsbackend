import { getAllInventory } from "../models/inventoryModel.js";
import { adjustInventory, getInventoryAdjustmentsByFilter} from "../models/inventoryAdjustmentModel.js";
import { createInventoryIssue, getAllInventoryIssues,
  getInventoryIssueById } from "../models/inventoryIssueModel.js";
import { getProductSerials } from "../models/productSerialModel.js";
export const getAllInventoryController = async (req, res) => {
  try {
    const result = await getAllInventory();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: result?.length ? 'Inventory fetched successfully.' : 'No inventory data found.',
      responseObject: result
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to fetch inventory.',
      responseObject: []
    });
  }
};

export const adjustInventoryController = async (req, res) => {
  try {
    const { adjustments, userId } = req.body;

    if (!Array.isArray(adjustments) || adjustments.length === 0 || !userId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Adjustments array and userId are required.',
        responseObject: []
      });
    }

    // Validate each adjustment object
    const invalid = adjustments.find(adj =>
      !adj.productId ||
      !adj.locationId ||
      typeof adj.quantityChange !== 'number' ||
      !adj.adjustmentDate
    );

    if (invalid) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Each adjustment must include productId, locationId, quantityChange (number), and adjustmentDate.',
        responseObject: []
      });
    }

    const result = await adjustInventory(adjustments, userId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: result.message || 'Inventory adjusted successfully.',
      responseObject: []
    });

  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to adjust inventory.',
      responseObject: []
    });
  }
};



export const getInventoryAdjustmentsByFilterController = async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.body;
    console.log(startDate, endDate, productId )

    if (!startDate || !endDate) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Start date and end date are required.',
        responseObject: []
      });
    }

    const data = await getInventoryAdjustmentsByFilter({
      startDate,
      endDate,
      productId: productId || null
    });

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Inventory adjustments fetched successfully.',
      responseObject: data
    });

  } catch (error) {
    console.error('Error fetching adjustments:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch inventory adjustments.',
      responseObject: []
    });
  }
};

// Create a new inventory issue
export const createInventoryIssueController = async (req, res) => {
  try {
    const { issueData, issueItems, userId } = req.body;

    if (!issueData || !Array.isArray(issueItems) || issueItems.length === 0) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Issue data and at least one issue item are required.',
        responseObject: []
      });
    }

    const result = await createInventoryIssue(issueData, issueItems, userId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Inventory issue created successfully.',
      responseObject: result
    });
  } catch (error) {
    console.error('Error creating inventory issue:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to create inventory issue.',
      responseObject: []
    });
  }
};

// Get all inventory issues with optional date range
export const getAllInventoryIssuesController = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const issues = await getAllInventoryIssues(startDate, endDate);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: issues.length ? 'Inventory issues fetched successfully.' : 'No inventory issues found.',
      responseObject: issues
    });
  } catch (error) {
    console.error('Error fetching inventory issues:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to fetch inventory issues.',
      responseObject: []
    });
  }
};

// Get single inventory issue by ID
export const getInventoryIssueByIdController = async (req, res) => {
  try {
    const { issueId } = req.body;

    if (!issueId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Issue ID is required.',
        responseObject: []
      });
    }

    const issue = await getInventoryIssueById(issueId);

    if (!issue) {
      return res.status(404).json({
        sessionDTO: { status: false, reasonCode: 'not_found' },
        status: false,
        message: 'Inventory issue not found.',
        responseObject: []
      });
    }

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Inventory issue fetched successfully.',
      responseObject: issue
    });
  } catch (error) {
    console.error('Error fetching inventory issue by ID:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to fetch inventory issue.',
      responseObject: []
    });
  }
};

export const getProductSerialsController = async (req, res) => {
  try {
    const { productId, status } = req.body;

    if (!productId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Product ID is required.',
        responseObject: []
      });
    }

    const serials = await getProductSerials({ productId, status });

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: serials.length ? 'Serial numbers fetched successfully.' : 'No serials found for this product.',
      responseObject: serials
    });

  } catch (error) {
    console.error('Error fetching product serials:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to fetch serial numbers.',
      responseObject: []
    });
  }
};