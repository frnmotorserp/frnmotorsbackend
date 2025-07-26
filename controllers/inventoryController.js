import { getAllInventory } from "../models/inventoryModel.js";
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