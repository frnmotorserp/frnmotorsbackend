// src/models/bomModel.js
import pool from '../configs/db.js';

// Check if BOM already exists for a product
export const checkIfBOMExists = async (productId) => {
  const result = await pool.query(
    `SELECT bom_id FROM bom_master WHERE product_id = $1 AND active_flag = 'Y'`,
    [productId]
  );
  return result.rows[0];
};

//  Save or Update BOM
export const saveOrUpdateBOM = async (bomDTO) => {
  const client = await pool.connect();
  try {
    const {
      productId,
      bomName,
      version = null,
      remarks,
      componentList = [],
      userId,
      userName
    } = bomDTO;

    const timestamp = new Date();

    await client.query('BEGIN');

    const existingBOMRes = await client.query(
      `SELECT bom_id FROM bom_master WHERE product_id = $1 AND active_flag = 'Y'`,
      [productId]
    );

    let bomId;

    if (existingBOMRes.rowCount > 0) {
      //  Update existing BOM
      bomId = existingBOMRes.rows[0].bom_id;

      await client.query(
        `UPDATE bom_master SET 
          bom_name = $1,
          version = $2,
          remarks = $3,
          updated_by = $4,
          updated_at = $5
         WHERE bom_id = $6`,
        [bomName, version, remarks, userName, timestamp, bomId]
      );

      await client.query(`DELETE FROM bom_components WHERE bom_id = $1`, [bomId]);
    } else {
      //  Insert new BOM
      const insertRes = await client.query(
        `INSERT INTO bom_master
          (product_id, bom_name, version, remarks, active_flag, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'Y', $5, $6)
         RETURNING bom_id`,
        [productId, bomName, version, remarks, userName, timestamp]
      );
      bomId = insertRes.rows[0].bom_id;
    }

    // Insert BOM Components (recursive-ready structure)
    for (const component of componentList) {
      const {
        componentProductId,
        quantity,
        parentComponentId = null,
        remarks: componentRemarks = ''
      } = component;

      await client.query(
        `INSERT INTO bom_components
          (bom_id, component_product_id, quantity, parent_component_id, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        [bomId, componentProductId, quantity, parentComponentId, componentRemarks, timestamp]
      );
    }

    await client.query('COMMIT');
    return { success: true, bomId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving/updating BOM:', err);
    throw err;
  } finally {
    client.release();
  }
};

//  Get BOM Details by Product
export const getBOMByProductId = async (productId) => {
  const { rows } = await pool.query(`
    SELECT 
      bm.bom_id AS "bomId",
      bm.product_id AS "productId",
      bm.bom_name AS "bomName",
      bm.version,
      bm.remarks,
      bm.active_flag AS "activeFlag",
      bm.created_at AS "createdAt",

      pm.purchase_gst_percentage AS "purchaseGstPercentage",
      pm.gst_percentage AS "gstPercentage",
      pm.hsn_code AS "hsnCode",

      bc.component_id AS "componentId",
      bc.component_product_id AS "componentProductId",
      pm.product_name AS "componentProductName",
      pm.unit AS "unit",
      pm.unit_price AS "unitPrice",
      bc.quantity,
      bc.parent_component_id AS "parentComponentId"
    FROM bom_master bm
    JOIN bom_components bc ON bm.bom_id = bc.bom_id
    JOIN product_master pm ON bc.component_product_id = pm.product_id
    WHERE bm.product_id = $1 AND bm.active_flag = 'Y'
    ORDER BY bc.parent_component_id NULLS FIRST, bc.component_id;
  `, [productId]);

  return rows;
};
