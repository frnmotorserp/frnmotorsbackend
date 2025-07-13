import pool from "../configs/db.js";

// 🔍 Get All Product Features
export const getAllProductFeatures = async () => {
  const query = `
    SELECT 
      feature_id AS "featureId",
      feature_name AS "featureName",
      description,
      data_type AS "dataType",
      unit,
      active_flag AS "activeFlag",
      created_by AS "createdBy",
      created_at AS "createdAt",
      updated_by AS "updatedBy",
      updated_at AS "updatedAt"
    FROM product_feature_master
    ORDER BY feature_name;
  `;

  const { rows } = await pool.query(query);
  return rows;
};


// 💾 Save or Update Product Feature
export const saveOrUpdateProductFeatureModel = async (featureDTO) => {
  const {
    featureId = 0,
    featureName,
    description = '',
    dataType = 'TEXT',
    unit = '',
    activeFlag = 'Y',
    userId
  } = featureDTO;

  const timestamp = new Date();

  if (!featureName || !userId) {
    throw new Error('Feature Name and User ID are required.');
  }

  if (featureId && featureId > 0) {
    // 👉 Update existing feature
    const updateQuery = `
      UPDATE product_feature_master
      SET 
        feature_name = $1,
        description = $2,
        data_type = $3,
        unit = $4,
        active_flag = $5,
        updated_by = $6,
        updated_at = $7
      WHERE feature_id = $8
      RETURNING feature_id AS "featureId";
    `;

    const { rows } = await pool.query(updateQuery, [
      featureName.trim(),
      description.trim(),
      dataType.trim(),
      unit.trim(),
      activeFlag,
      userId,
      timestamp,
      featureId
    ]);

    return { isUpdate: true, updatedId: rows[0]?.featureId || null };

  } else {
    // 👉 Insert new feature
    const insertQuery = `
      INSERT INTO product_feature_master 
        (feature_name, description, data_type, unit, active_flag, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING feature_id AS "featureId";
    `;

    const { rows } = await pool.query(insertQuery, [
      featureName.trim(),
      description.trim(),
      dataType.trim(),
      unit.trim(),
      activeFlag,
      userId,
      timestamp
    ]);

    return { isInsert: true, insertedId: rows[0]?.featureId || null };
  }
};
