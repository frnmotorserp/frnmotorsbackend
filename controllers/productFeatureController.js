import { getAllProductFeatures, saveOrUpdateProductFeatureModel } from "../models/productFeatureModel.js";



// 1. List All Product Features
export const listAllProductFeatures = async (req, res) => {
  try {
    const rows = await getAllProductFeatures();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching product features:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch product features',
      responseObject: []
    });
  }
};

//  2. Save or Update Product Feature
export const saveOrUpdateProductFeatureController = async (req, res) => {
  try {
    const { featureId, featureName, description, dataType, unit, activeFlag, userId } = req.body;

    if (!featureName || !userId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Feature Name and User ID are required',
        responseObject: []
      });
    }

    const result = await saveOrUpdateProductFeatureModel({
      featureId,
      featureName,
      description,
      dataType,
      unit,
      activeFlag,
      userId
    });

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: result.isInsert ? 'Feature Created Successfully' : 'Feature Updated Successfully',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating product feature:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to save or update product feature',
      responseObject: []
    });
  }
};
