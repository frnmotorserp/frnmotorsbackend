import {
  checkIfBOMExists,
  saveOrUpdateBOM,
  getBOMByProductId
} from "../models/bomModel.js";

// 1. Save or Update BOM
export const saveOrUpdateBOMController = async (req, res) => {
  try {
    const {
      dataAccessDTO,
      productId,
      totalQuantity,
      remarks,
      componentList = []
    } = req.body;

    if (!productId || componentList.length === 0) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Product ID and at least one component are required.',
        responseObject: []
      });
    }

    const alreadyExists = await checkIfBOMExists(productId);

    const result = await saveOrUpdateBOM({
      productId,
      totalQuantity,
      remarks,
      componentList,
      userId: dataAccessDTO?.userId,
      userName: dataAccessDTO?.userName
    });

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: alreadyExists ? 'BOM updated successfully.' : 'BOM created successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error("Error saving/updating BOM:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to save or update BOM.',
      responseObject: []
    });
  }
};

// 2. Get BOM by Product ID
export const getBOMByProductIdController = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Product ID is required.',
        responseObject: []
      });
    }

    const result = await getBOMByProductId(productId);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: result?.length ? 'BOM fetched successfully.' : 'No BOM found for this product.',
      responseObject: result
    });

  } catch (error) {
    console.error("Error fetching BOM:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to fetch BOM.',
      responseObject: []
    });
  }
};
