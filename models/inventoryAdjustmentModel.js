// inventoryAdjustmentModel.js
import pool from "../configs/db.js";

export const adjustInventory = async (adjustments = [], userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const adj of adjustments) {
      const {
        productId,
        locationId,
        quantityChange, // can be +ve or -ve
        reason,
        adjustmentDate,
        serialNumbersAdd = [],
    serialNumbersRemove = []
      } = adj;

      // Step 1: Insert into inventory_adjustment
      await client.query(`
        INSERT INTO inventory_adjustment (
          product_id, location_id, adjustment_date,
          quantity_change, reason, adjusted_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        productId, locationId, adjustmentDate,
        quantityChange, reason, userId
      ]);

      // Step 2: Update inventory_stock
      await client.query(`
        INSERT INTO inventory_stock (
          product_id, location_id, quantity, last_update_ref
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET
          quantity = inventory_stock.quantity + EXCLUDED.quantity,
          last_update_ref = EXCLUDED.last_update_ref;
      `, [
        productId,
        locationId,
        quantityChange,
        `ADJUSTMENT#${reason || ''}`
      ]);
      // 3. SERIAL NUMBER ADDITION (for +ve quantity)
  for (const serial of serialNumbersAdd) {
    await client.query(`
      INSERT INTO product_serials (
        product_id, location_id, serial_number,
        status, modified_by, last_updated
      )
      VALUES ($1, $2, $3, 'in_stock', $4, NOW())
      ON CONFLICT (serial_number) DO NOTHING;
    `, [productId, locationId, serial, userId]);
  }

  // 4. SERIAL NUMBER REMOVAL (for -ve quantity)
  for (const serialId of serialNumbersRemove) {
    await client.query(`
      UPDATE product_serials
      SET status = 'out_of_stock',
          modified_by = $1,
          last_updated = NOW()
      WHERE serial_id = $2;
    `, [userId, serialId]);
  }
    }

    await client.query('COMMIT');
    return { success: true, message: "Inventory adjusted successfully" };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};



// Get inventory adjustments by date range and optional product ID
export const getInventoryAdjustmentsByFilter = async ({ startDate, endDate, productId }) => {
  const client = await pool.connect();
  try {
    const values = [startDate, endDate];
    let query = `
      SELECT 
        ia.adjustment_id,
        ia.product_id,
        ia.location_id,
        ia.adjustment_date,
        ia.quantity_change,
        ia.reason,
        ia.adjusted_by,
        p.product_name,
        l.location_name,
        u.first_name AS adjusted_by_user,
         u.login_id AS adjusted_by_user_login_id
      FROM inventory_adjustment ia
      JOIN product_master p ON ia.product_id = p.product_id
      JOIN location_master l ON ia.location_id = l.location_id
      LEFT JOIN users u ON ia.adjusted_by = u.user_id
      WHERE ia.adjustment_date BETWEEN $1 AND $2
    `;

    if (productId) {
      query += ` AND ia.product_id = $3`;
      values.push(productId);
    }

    const result = await client.query(query, values);
    //console.log(query, values,  result.rows)
    return result.rows;

  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};
