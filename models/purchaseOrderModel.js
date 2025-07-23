import pool from "../configs/db.js";

// Get POs by Date Range
export const getPOsByDateRange = async (startDate, endDate, vendorId) => {
  const query = `
    SELECT * FROM purchase_order
    WHERE po_date BETWEEN $1 AND $2 AND vendor_id = $3
    ORDER BY po_date DESC;
  `;
  const { rows } = await pool.query(query, [startDate, endDate, vendorId]);
  return rows;
};

// Get Summary Count by Status
export const getPOSummaryDetail = async () => {
  const query = `
    SELECT 
      status,
      COUNT(*) AS count,
      SUM(total_amount) AS total_amount
    FROM purchase_order
    GROUP BY status;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Save or Update PO with Items
export const saveOrUpdatePO = async (poData, items) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const timestamp = new Date();

    const {
      poId,
      poNumber,
      vendorId,
      poDate,
      expectedDeliveryDate,
      shippingAddress,
      billingAddress,
      paymentTerms,
      deliveryTerms,
      totalAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      taxType,
      status,
      remarks,
      createdBy,
      vendorLocationId,
      deliveryLocationId
    } = poData;

    let savedPoId = poId;
      //console.log("poId1", poId)
    if (poId && poId > 0) {
      //console.log("poId", poId)
      const updateQuery = `
        UPDATE purchase_order
        SET vendor_id = $1, po_date = $2, expected_delivery_date = $3, shipping_address = $4,
            billing_address = $5, payment_terms = $6, delivery_terms = $7, total_amount = $8,
            cgst_amount = $9, sgst_amount = $10, igst_amount = $11, tax_type = $12, status = $13,
            remarks = $14, updated_at = $15, vendor_location_id = $16, delivery_location_id = $17
        WHERE po_id = $18;
      `;
      await client.query(updateQuery, [
        vendorId, poDate, expectedDeliveryDate, shippingAddress, billingAddress,
        paymentTerms, deliveryTerms, totalAmount, cgstAmount, sgstAmount,
        igstAmount, taxType, status, remarks, timestamp,  vendorLocationId, deliveryLocationId, poId
      ]);
    } else {
      const insertQuery = `
        INSERT INTO purchase_order
          (po_number, vendor_id, po_date, expected_delivery_date, shipping_address, billing_address,
           payment_terms, delivery_terms, total_amount, cgst_amount, sgst_amount, igst_amount, tax_type,
           status, remarks, created_by, created_at, vendor_location_id, delivery_location_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING po_id;
      `;
      const insertResult = await client.query(insertQuery, [
        poNumber, vendorId, poDate, expectedDeliveryDate, shippingAddress, billingAddress,
        paymentTerms, deliveryTerms, totalAmount, cgstAmount, sgstAmount,
        igstAmount, taxType, status, remarks, createdBy, timestamp, vendorLocationId, deliveryLocationId
      ]);
      savedPoId = insertResult.rows[0].po_id;
    }

    await client.query(`DELETE FROM purchase_order_item WHERE po_id = $1`, [savedPoId]);

    for (const item of items) {
      const {
        productId, productDescription, quantity, unitPrice, uom,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount, totalAmount
      } = item;

      const insertItemQuery = `
        INSERT INTO purchase_order_item
          (po_id, product_id, product_description, quantity, unit_price, uom,
           cgst_percent, sgst_percent, igst_percent, cgst_amount, sgst_amount,
           igst_amount, total_amount)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
      `;

      await client.query(insertItemQuery, [
        savedPoId, productId, productDescription, quantity, unitPrice, uom,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount, totalAmount
      ]);
    }

    await client.query('COMMIT');
    return { success: true, poId: savedPoId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get PO items
export const getPOItemsByPOId = async (poId) => {
  const client = await pool.connect();
  try {
    const itemsQuery = `
      SELECT 
        poi.*,
        pm.product_name,
        pm.product_code
      FROM purchase_order_item poi
      LEFT JOIN product_master pm ON poi.product_id = pm.product_id
      WHERE poi.po_id = $1;
    `;

    const { rows } = await client.query(itemsQuery, [poId]);
    return rows;
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};


// Update PO Status
export const updatePOStatus = async (poId, newStatus, updatedBy) => {
  const query = `
    UPDATE purchase_order
    SET status = $1,
        updated_at = NOW()
    WHERE po_id = $2
    RETURNING *;
  `;

  const values = [newStatus, poId];

  try {
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      throw new Error(`No PO found with id ${poId}`);
    }
    return { success: true, data: rows[0] };
  } catch (error) {
    console.error('Error updating PO status:', error);
    throw error;
  }
};


export const getPOsByVendor = async ( vendorId) => {
  const query = `
    SELECT po_id, po_number, total_amount, payment_terms, status FROM purchase_order
    WHERE vendor_id = $1
    ORDER BY po_date DESC;
  `;
  const { rows } = await pool.query(query, [vendorId]);
  return rows;
};
