// src/models/productModel.js
import pool from "../configs/db.js";

// Get All Products with Features (View Model)
export const getAllProducts = async () => {
  const query = `
    SELECT 
      pm.product_id AS "productId",
      pm.product_code AS "productCode",
      pm.product_name AS "productName",
      pm.product_category_id AS "productCategoryId",
      pcm.product_category_name AS "productCategoryName",
      pm.brand,
      pm.unit,
      pm.unit_price AS "unitPrice",
      pm.bom_price AS "bomPrice",
      pm.description,
      pm.hsn_code AS "hsnCode",
      pm.gst_percentage AS "gstPercentage",
      pm.purchase_gst_percentage AS "gstPercentagePurchase",

      pm.is_available_for_sale AS "isAvailableForSale",
      pm.is_final_veichle AS "isFinalVeichle",
      pm.serial_no_applicable AS "serialNoApplicable",
      pm.product_type AS "productType",
      pm.stock_uom AS "stockUOM",
      pm.barcode_or_sku AS "barcodeOrSku",
      pm.image_url AS "imageUrl",
      pm.low_stock_threshold AS "lowStockThreshold",
      pm.warranty_period_months AS "warrantyPeriodMonths",
      pm.active_flag AS "activeFlag",
      pm.created_user_id AS "createdUserId",
      pm.created_at AS "createdAt",
      pm.updated_user_id AS "updatedUserId",
      pm.updated_at AS "updatedAt"
    FROM product_master pm
    JOIN product_category_master pcm ON pm.product_category_id = pcm.product_category_id
    ORDER BY pm.product_name;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

// Get Features for a Product
export const getProductFeatures = async (productId) => {
  const query = `
    SELECT 
      pfv.feature_id AS "featureId",
      pfm.feature_name AS "featureName",
      pfv.feature_value AS "featureValue",
      pfm.unit AS "featureUnit"
    FROM product_feature_value pfv
    JOIN product_feature_master pfm ON pfv.feature_id = pfm.feature_id
    WHERE pfv.product_id = $1 AND pfv.active_flag = 'Y';
  `;

  const { rows } = await pool.query(query, [productId]);
  return rows;
};

// Save or Update Product with Features
export const saveOrUpdateProduct = async (productDTO) => {
  const client = await pool.connect();
  try {
    const {
      productId,
      productCode,
      productName,
      productCategoryId,
      brand,
      unit,
      unitPrice,
      description,
      hsnCode,
      gstPercentage = 0,
      gstPercentagePurchase = 0,
      isAvailableForSale = false,
      serialNoApplicable = false,
      isFinalVeichle = false,
      productType = 'Not Specified',
      stockUOM = null,
      barcodeOrSku = null,
      imageUrl = null,
      lowStockThreshold = 0,
      warrantyPeriodMonths = null,
      activeFlag = 'Y',
      userId,
      features = []
    } = productDTO;

    const timestamp = new Date();

    await client.query('BEGIN');

    const duplicateCheckQuery = `
      SELECT 1 FROM product_master WHERE (product_code = $1 OR product_name = $2)
      ${productId ? 'AND product_id != $3' : ''} LIMIT 1;
    `;
    const duplicateCheckParams = productId ? [productCode, productName, productId] : [productCode, productName];

    const duplicateResult = await client.query(duplicateCheckQuery, duplicateCheckParams);
    if (duplicateResult.rowCount > 0) {
      throw new Error('Product with the same code or name already exists.');
    }

    let savedProductId = productId;

    if (productId && productId > 0) {
      const updateQuery = `
        UPDATE product_master
        SET product_code = $1, product_name = $2, product_category_id = $3, brand = $4, unit = $5, unit_price = $6,
            description = $7, hsn_code = $8, gst_percentage = $9, is_available_for_sale = $10,  serial_no_applicable = $11,
            product_type = $12, stock_uom = $13, barcode_or_sku = $14, image_url = $15, low_stock_threshold = $16, warranty_period_months = $17,
            active_flag = $18, updated_user_id = $19, updated_at = $20, purchase_gst_percentage = $21, is_final_veichle = $23
        WHERE product_id = $22;
      `;
      const updateParams = [
        productCode, productName, productCategoryId, brand, unit, unitPrice, description,
        hsnCode, gstPercentage, isAvailableForSale, serialNoApplicable, productType, stockUOM, barcodeOrSku,
        imageUrl, lowStockThreshold, warrantyPeriodMonths, activeFlag, userId, timestamp, gstPercentagePurchase, productId, isFinalVeichle
      ];
      await client.query(updateQuery, updateParams);
    } else {
      const insertQuery = `
        INSERT INTO product_master
          (product_code, product_name, product_category_id, brand, unit, unit_price, description, hsn_code, gst_percentage,
           is_available_for_sale, serial_no_applicable, product_type, stock_uom, barcode_or_sku, image_url, low_stock_threshold, warranty_period_months,
           active_flag, created_user_id, created_at, purchase_gst_percentage, is_final_veichle)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING product_id;
      `;
      const insertParams = [
        productCode, productName, productCategoryId, brand, unit, unitPrice, description,
        hsnCode, gstPercentage, isAvailableForSale, serialNoApplicable, productType, stockUOM, barcodeOrSku,
        imageUrl, lowStockThreshold, warrantyPeriodMonths, activeFlag, userId, timestamp, gstPercentagePurchase, isFinalVeichle
      ];
      const insertResult = await client.query(insertQuery, insertParams);
      savedProductId = insertResult.rows[0].product_id;
    }

    await client.query(`DELETE FROM product_feature_value WHERE product_id = $1`, [savedProductId]);

    const existingFeatureIds = new Set();

    for (const feature of features) {
      const { featureId, featureValue } = feature;

      if (existingFeatureIds.has(featureId)) {
        throw new Error(`Duplicate feature selected: Feature ID ${featureId}`);
      }
      existingFeatureIds.add(featureId);

      const featureUpsertQuery = `
        INSERT INTO product_feature_value
          (product_id, feature_id, feature_value, active_flag, created_by, created_at)
        VALUES ($1, $2, $3, 'Y', $4, $5)
        ON CONFLICT (product_id, feature_id)
        DO UPDATE SET feature_value = EXCLUDED.feature_value, updated_by = $4, updated_at = $5;
      `;

      const featureParams = [savedProductId, featureId, featureValue, userId, timestamp];
      await client.query(featureUpsertQuery, featureParams);
    }

    await client.query('COMMIT');

    return { success: true, productId: savedProductId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
