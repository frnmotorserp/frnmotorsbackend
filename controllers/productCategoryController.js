import {
  getAllProductCategories,
  saveOrUpdateProductCategory
} from "../models/productCategoryModel.js";

// List All Product Categories
export const listAllProductCategories = async (req, res) => {
  try {
    const rows = await getAllProductCategories();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch product categories',
      responseObject: []
    });
  }
};

// Save or Update Product Category
export const saveOrUpdateProductCategoryController = async (req, res) => {
  try {
    const { productCategoryId, productCategoryName, description, activeFlag, userId } = req.body;

    if (!productCategoryName || !userId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Product Category Name and User ID are required',
        responseObject: []
      });
    }

    const result = await saveOrUpdateProductCategory({
      productCategoryId,
      productCategoryName,
      description,
      activeFlag,
      userId
    });

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: result.isInsert ? 'Product Category Created Successfully' : 'Product Category Updated Successfully',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating product category:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to save or update product category',
      responseObject: []
    });
  }
};
