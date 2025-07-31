import pool from "../configs/db.js";

// Get serial numbers for a product, with optional status filter
export const getProductSerials = async ({ productId, status }) => {
  const client = await pool.connect();
  try {
    const values = [productId];
    let query = `
      SELECT 
        ps.serial_id,
        ps.product_id,
        ps.location_id,
        ps.serial_number,
        ps.status,
        ps.added_date,
        ps.last_updated,
        p.product_name
      FROM product_serials ps
      JOIN product_master p ON ps.product_id = p.product_id
      WHERE ps.product_id = $1
    `;

    if (status) {
      query += ` AND ps.status = $2`;
      values.push(status);
    }

    const result = await client.query(query, values);
    return result.rows;

  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};
