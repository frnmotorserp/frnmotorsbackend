
import { getAllProducts, getProductFeatures, saveOrUpdateProduct } from "../models/productModel.js";

// 1. List All Products
export const listAllProducts = async (req, res) => {
  try {
    const rows = await getAllProducts();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch products',
      responseObject: []
    });
  }
};

// 2. Get Product Features By Product ID
export const getProductFeaturesByProductId = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Product ID is required',
        responseObject: []
      });
    }

    const rows = await getProductFeatures(productId);

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

// 3. Save or Update Product with Features
export const saveOrUpdateProductController = async (req, res) => {
  try {
    const productDTO = req.body;

    if (!productDTO.productCode || !productDTO.productName || !productDTO.productCategoryId || !productDTO.userId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Product Code, Name, Category, and User ID are required.',
        responseObject: []
      });
    }

    const result = await saveOrUpdateProduct(productDTO);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Product saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating product:', error);
    const message = error.message || 'Failed to save or update product';

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message,
      responseObject: []
    });
  }
};
