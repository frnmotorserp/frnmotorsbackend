import pool from '../configs/db.js';
export const getAllInventory = async () => {
  const result = await pool.query(
    `SELECT 
      i.product_id, 
      p.product_name, 
      p.low_stock_threshold,
      p.unit,
      p.product_category_id,
      p.serial_no_applicable,
      p.is_available_for_sale,
      p.unit_price,
      i.location_id, 
      l.location_name, 
      i.quantity, 
      i.last_update_ref
     FROM inventory_stock i
     JOIN product_master p ON i.product_id = p.product_id
     JOIN location_master l ON i.location_id = l.location_id
     ORDER BY p.product_name, l.location_name`
  );
  return result.rows;
};