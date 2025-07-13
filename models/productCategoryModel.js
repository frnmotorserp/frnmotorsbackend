import pool from "../configs/db.js";

// Get All Product Categories
export const getAllProductCategories = async () => {
  const query = `
    SELECT 
      product_category_id AS "productCategoryId",
      product_category_name AS "productCategoryName",
      description,
      active_flag AS "activeFlag",
      created_by AS "createdBy",
      created_at AS "createdAt",
      updated_by AS "updatedBy",
      updated_at AS "updatedAt"
    FROM product_category_master
    ORDER BY product_category_name;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Save or Update Product Category
export const saveOrUpdateProductCategory = async (productCategoryDTO) => {
  const { productCategoryId, productCategoryName, description, activeFlag = 'Y', userId } = productCategoryDTO;
  const timestamp = new Date();

  if (!productCategoryName || !userId) {
    throw new Error('Product Category Name and User ID are required.');
  }

  if (productCategoryId && productCategoryId > 0) {
    // Update existing
    const updateQuery = `
      UPDATE product_category_master
      SET 
        product_category_name = $1,
        description = $2,
        active_flag = $3,
        updated_by = $4,
        updated_at = $5
      WHERE product_category_id = $6
      RETURNING product_category_id AS "productCategoryId";
    `;
    const updateParams = [
      productCategoryName,
      description,
      activeFlag,
      userId,
      timestamp,
      productCategoryId
    ];
    const { rows } = await pool.query(updateQuery, updateParams);
    return { isUpdate: true, updatedId: rows[0]?.productCategoryId || null };
  } else {
    // Insert new
    const insertQuery = `
      INSERT INTO product_category_master 
        (product_category_name, description, active_flag, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING product_category_id AS "productCategoryId";
    `;
    const insertParams = [
      productCategoryName,
      description,
      activeFlag,
      userId,
      timestamp
    ];
    const { rows } = await pool.query(insertQuery, insertParams);
    return { isInsert: true, insertedId: rows[0]?.productCategoryId || null };
  }
};