import pool from "../configs/db.js";

// Save or Update GRN with Items
export const saveOrUpdateGRN = async (grnData, items = []) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      grnId,
      poId,
      vendorId,
      locationId,
      grnNumber,
      grnDate,
      remarks,
      userId,
    } = grnData;

    let savedGrnId = grnId;

    if (grnId && grnId > 0) {
      const updateQuery = `
        UPDATE grn_master
        SET po_id = $1, vendor_id = $2, location_id = $3, grn_number = $4,
            grn_date = $5, remarks = $6, created_at = NOW()
        WHERE grn_id = $7
      `;
      await client.query(updateQuery, [
        poId,
        vendorId,
        locationId,
        grnNumber,
        grnDate,
        remarks,
        grnId,
      ]);
    } else {
      const insertQuery = `
        INSERT INTO grn_master
          (po_id, vendor_id, location_id, grn_number, grn_date, remarks, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING grn_id;
      `;
      const result = await client.query(insertQuery, [
        poId,
        vendorId,
        locationId,
        grnNumber,
        grnDate,
        remarks,
        userId,
      ]);
      savedGrnId = result.rows[0].grn_id;
    }

    // Remove old items
    await client.query(`DELETE FROM grn_item WHERE grn_id = $1`, [savedGrnId]);

    // Insert new items
    for (const item of items) {
      const {
        poItemId,
        productId,
        quantityReceived,
        unitPrice,
        cgstPercent,
        sgstPercent,
        igstPercent,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        batchNumber,
        expiryDate,
        uom,
        serialNumbersAdd,
      } = item;

      const insertItemQuery = `
        INSERT INTO grn_item (
          grn_id, po_item_id, product_id, quantity_received, unit_price,
          cgst_percent, sgst_percent, igst_percent,
          cgst_amount, sgst_amount, igst_amount,
          total_amount, batch_number, expiry_date, uom
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15
        )
      `;

      await client.query(insertItemQuery, [
        savedGrnId,
        poItemId,
        productId,
        quantityReceived,
        unitPrice,
        cgstPercent,
        sgstPercent,
        igstPercent,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        batchNumber,
        expiryDate,
        uom,
      ]);

      // Update inventory_stock
      const updateStockQuery = `
    INSERT INTO inventory_stock (product_id, location_id, quantity, last_update_ref)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET
      quantity = inventory_stock.quantity + EXCLUDED.quantity,
      last_update_ref = EXCLUDED.last_update_ref;
  `;

      await client.query(updateStockQuery, [
        productId,
        locationId,
        quantityReceived,
        `GRN#${savedGrnId}#ADDINV`,
      ]);

      if (serialNumbersAdd && serialNumbersAdd?.length > 0) {
        for (const serial of serialNumbersAdd) {
          await client.query(
            `
          INSERT INTO product_serials (
            product_id, location_id, serial_number,
            status, modified_by, last_updated
          )
          VALUES ($1, $2, $3, 'in_stock', $4, NOW())
          ON CONFLICT (product_id, location_id, serial_number) 
          DO NOTHING;
        `,
            [productId, locationId, serial, userId]
          );
        }
      }
    }

    // Change PO Status to VALIDATE GOODS
    const changePOStatusQuery = `
    UPDATE purchase_order
    SET status = $1,
        updated_at = NOW()
    WHERE po_id = $2
    RETURNING *;
  `;

    await client.query(changePOStatusQuery, ["VALIDATE GOODS", poId]);

    await client.query("COMMIT");
    return { success: true, grnId: savedGrnId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Get GRNs by Vendor ID, PO ID and Date Range
export const getGRNs = async ({ vendorId, poId, startDate, endDate }) => {
  let conditions = [];
  let values = [];
  let idx = 1;
  console.log(vendorId, poId, startDate, endDate);
  if (vendorId) {
    conditions.push(`gm.vendor_id = $${idx++}`);
    values.push(vendorId);
  }

  if (poId) {
    conditions.push(`gm.po_id = $${idx++}`);
    values.push(poId);
  }

  if (startDate && endDate) {
    conditions.push(`gm.grn_date BETWEEN $${idx++} AND $${idx++}`);
    values.push(startDate, endDate);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT gm.*, v.vendor_name, p.po_number
    FROM grn_master gm
    LEFT JOIN vendor_master v ON gm.vendor_id = v.vendor_id
    LEFT JOIN purchase_order p ON gm.po_id = p.po_id
    ${whereClause}
    ORDER BY gm.grn_date DESC
  `;

  const { rows } = await pool.query(query, values);
  return rows;
};

// Get GRN Items by GRN ID
export const getGRNItems = async (grnId) => {
  const query = `
    SELECT gi.*, pm.product_name, pm.product_code, pm.serial_no_applicable
    FROM grn_item gi
    LEFT JOIN product_master pm ON gi.product_id = pm.product_id
    WHERE gi.grn_id = $1
  `;
  const { rows } = await pool.query(query, [grnId]);
  return rows;
};

export const getGRNsWithItemsByPO = async (poId) => {
  const query = `
    SELECT
      gm.grn_id,
      gm.grn_number,
      gm.grn_date,
      gm.po_id,
      p.po_number,
      gm.vendor_id,
      v.vendor_name,
      gm.remarks,
      gi.grn_item_id,
      gi.product_id,
      pm.product_name,
      pm.product_code,
      gi.quantity_received,
      gi.unit_price,
      gi.total_amount,
      gi.cgst_percent,
      gi.sgst_percent,
      gi.igst_percent,
      gi.batch_number,
      gi.expiry_date,
      gi.uom
    FROM grn_master gm
    LEFT JOIN vendor_master v ON gm.vendor_id = v.vendor_id
    LEFT JOIN purchase_order p ON gm.po_id = p.po_id
    LEFT JOIN grn_item gi ON gi.grn_id = gm.grn_id
    LEFT JOIN product_master pm ON gi.product_id = pm.product_id
    WHERE gm.po_id = $1
    ORDER BY gm.grn_date DESC, gm.grn_id, gi.grn_item_id
  `;

  const { rows } = await pool.query(query, [poId]);

  // const grouped = {};

  // for (const row of rows) {
  //   if (!grouped[row.grn_id]) {
  //     grouped[row.grn_id] = {
  //       grnId: row.grn_id,
  //       grnNumber: row.grn_number,
  //       grnDate: row.grn_date,
  //       poId: row.po_id,
  //       poNumber: row.po_number,
  //       vendorId: row.vendor_id,
  //       vendorName: row.vendor_name,
  //       remarks: row.remarks,
  //       items: []
  //     };
  //   }

  //   if (row.grn_item_id) {
  //     grouped[row.grn_id].items.push({
  //       grnItemId: row.grn_item_id,
  //       productId: row.product_id,
  //       productName: row.product_name,
  //       productCode: row.product_code,
  //       quantityReceived: parseFloat(row.quantity_received),
  //       unitPrice: parseFloat(row.unit_price),
  //       totalAmount: parseFloat(row.total_amount),
  //       cgstPercent: parseFloat(row.cgst_percent),
  //       sgstPercent: parseFloat(row.sgst_percent),
  //       igstPercent: parseFloat(row.igst_percent),
  //       batchNumber: row.batch_number,
  //       expiryDate: row.expiry_date,
  //       uom: row.uom
  //     });
  //   }
  // }

  return Object.values(rows);
};
