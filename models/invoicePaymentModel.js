import pool from "../configs/db.js";

export const saveOrUpdateInvoice = async (invoiceData) => {
  const {
    invoiceId,       // Optional: If present, update; else insert
    poId,
    vendorId,
    invoiceNumber,
    invoiceDate,
    invoiceAmount,
    cgstAmount = 0,
    sgstAmount = 0,
    igstAmount = 0,
    remarks = '',
    createdBy,
    userId // optional tracking
  } = invoiceData;

  const invoiceAmountFloat = parseFloat(invoiceAmount) || 0;
  const cgst = parseFloat(cgstAmount) || 0;
  const sgst = parseFloat(sgstAmount) || 0;
  const igst = parseFloat(igstAmount) || 0;

  const totalTaxAmount = cgst + sgst + igst;
  const totalInvoiceAmount = invoiceAmountFloat + totalTaxAmount;

  try {
    if (invoiceId) {
      // UPDATE flow
      const updateQuery = `
        UPDATE invoice_master SET
          po_id = $1,
          vendor_id = $2,
          invoice_number = $3,
          invoice_date = $4,
          invoice_amount = $5,
          cgst_amount = $6,
          sgst_amount = $7,
          igst_amount = $8,
          total_tax_amount = $9,
          total_invoice_amount = $10,
          remarks = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE invoice_id = $12
        RETURNING *
      `;
      const updateValues = [
        poId, vendorId, invoiceNumber, invoiceDate, invoiceAmountFloat,
        cgst, sgst, igst,
        totalTaxAmount, totalInvoiceAmount,
        remarks, invoiceId
      ];

      const { rows } = await pool.query(updateQuery, updateValues);
      return rows[0];
    } else {
      // INSERT flow
      const insertQuery = `
        INSERT INTO invoice_master (
          po_id, vendor_id, invoice_number, invoice_date, invoice_amount,
          cgst_amount, sgst_amount, igst_amount,
          total_tax_amount, total_invoice_amount,
          remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const insertValues = [
        poId, vendorId, invoiceNumber, invoiceDate, invoiceAmountFloat,
        cgst, sgst, igst,
        totalTaxAmount, totalInvoiceAmount,
        remarks
      ];

      const { rows } = await pool.query(insertQuery, insertValues);
      return rows[0];
    }
  } catch (error) {
    console.error("Error in saveOrUpdateInvoice:", error);
    throw error;
  }
};

export const saveOrUpdateInvoiceWithItems = async (invoiceData) => {
  const {
    invoiceId,       // Optional: If present, update; else insert
    poId,
    vendorId,
    invoiceNumber,
    invoiceDate,
    invoiceAmount,
    cgstAmount = 0,
    sgstAmount = 0,
    igstAmount = 0,
    remarks = '',
    createdBy,
    userId, // optional tracking
    items = [] // invoice items list
  } = invoiceData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceAmountFloat = parseFloat(invoiceAmount) || 0;
    const cgst = parseFloat(cgstAmount) || 0;
    const sgst = parseFloat(sgstAmount) || 0;
    const igst = parseFloat(igstAmount) || 0;
    const totalTaxAmount = cgst + sgst + igst;
    const totalInvoiceAmount = invoiceAmountFloat + totalTaxAmount;

    let savedInvoice;
    if (invoiceId) {
      // UPDATE invoice_master
      const updateQuery = `
        UPDATE invoice_master SET
          po_id = $1,
          vendor_id = $2,
          invoice_number = $3,
          invoice_date = $4,
          invoice_amount = $5,
          cgst_amount = $6,
          sgst_amount = $7,
          igst_amount = $8,
          total_tax_amount = $9,
          total_invoice_amount = $10,
          remarks = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE invoice_id = $12
        RETURNING *
      `;
      const updateValues = [
        poId, vendorId, invoiceNumber, invoiceDate, invoiceAmountFloat,
        cgst, sgst, igst,
        totalTaxAmount, totalInvoiceAmount,
        remarks, invoiceId
      ];
      const { rows } = await client.query(updateQuery, updateValues);
      savedInvoice = rows[0];
    } else {
      // INSERT invoice_master
      const insertQuery = `
        INSERT INTO invoice_master (
          po_id, vendor_id, invoice_number, invoice_date, invoice_amount,
          cgst_amount, sgst_amount, igst_amount,
          total_tax_amount, total_invoice_amount,
          remarks
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
      `;
      const insertValues = [
        poId, vendorId, invoiceNumber, invoiceDate, invoiceAmountFloat,
        cgst, sgst, igst,
        totalTaxAmount, totalInvoiceAmount,
        remarks
      ];
      const { rows } = await client.query(insertQuery, insertValues);
      savedInvoice = rows[0];
    }

    const currentInvoiceId = savedInvoice.invoice_id;

    // 🔹 Step 2: Sync invoice_item table
    // First fetch existing items
    const { rows: existingItems } = await client.query(
      `SELECT invoice_item_id FROM invoice_item WHERE invoice_id = $1`,
      [currentInvoiceId]
    );

    const existingIds = existingItems.map((i) => i.invoice_item_id);
    const incomingIds = items.filter(i => i.invoice_item_id).map(i => i.invoice_item_id);

    // Delete items not present anymore
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await client.query(
        `DELETE FROM invoice_item WHERE invoice_item_id = ANY($1::int[])`,
        [toDelete]
      );
    }

    // Insert / Update items
    for (const item of items) {
      if (item.invoice_item_id) {
        // UPDATE existing item
        await client.query(
          `UPDATE invoice_item SET
            product_id=$1, hsn_code=$2, uom=$3, quantity=$4,
            unit_price=$5, discount=$6, taxable_value=$7,
            cgst_percent=$8, sgst_percent=$9, igst_percent=$10,
            cgst_amount=$11, sgst_amount=$12, igst_amount=$13,
            line_total=$14
          WHERE invoice_item_id=$15`,
          [
            item.product_id, item.hsn_code, item.uom, item.quantity,
            item.unit_price, item.discount, item.taxable_value,
            item.cgst_percent, item.sgst_percent, item.igst_percent,
            item.cgst_amount, item.sgst_amount, item.igst_amount,
            item.line_total, item.invoice_item_id
          ]
        );
      } else {
        // INSERT new item
        await client.query(
          `INSERT INTO invoice_item (
            invoice_id, product_id, hsn_code, uom, quantity,
            unit_price, discount, taxable_value,
            cgst_percent, sgst_percent, igst_percent,
            cgst_amount, sgst_amount, igst_amount, line_total
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [
            currentInvoiceId, item.product_id, item.hsn_code, item.uom, item.quantity,
            item.unit_price, item.discount, item.taxable_value,
            item.cgst_percent, item.sgst_percent, item.igst_percent,
            item.cgst_amount, item.sgst_amount, item.igst_amount,
            item.line_total
          ]
        );
      }
    }

    await client.query('COMMIT');
    return savedInvoice;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error in saveOrUpdateInvoice:", error);
    throw error;
  } finally {
    client.release();
  }
};

export const getInvoiceWithItems = async (invoiceId) => {
  const client = await pool.connect();
  try {
    // Fetch invoice
    const { rows: invoiceRows } = await client.query(
      `SELECT * FROM invoice_master WHERE invoice_id = $1`,
      [invoiceId]
    );

    if (invoiceRows.length === 0) {
      return null; // not found
    }

    const invoice = invoiceRows[0];

    // Fetch invoice items
    const { rows: itemRows } = await client.query(
      `SELECT ii.*, p.product_name 
       FROM invoice_item ii
       LEFT JOIN product_master p ON p.product_id = ii.product_id
       WHERE ii.invoice_id = $1`,
      [invoiceId]
    );

    invoice.items = itemRows;
    return invoice;
  } catch (error) {
    console.error("Error in getInvoiceWithItems:", error);
    throw error;
  } finally {
    client.release();
  }
};



/**
 * Get invoice records based on vendorId, purchaseOrderId, and date range
 * - If vendorId is 0: all vendors
 * - If poId is 0: all POs for that vendor
 */
export const getInvoicesByFilters = async (startDate, endDate, vendorId, poId) => {
  try {
    let query = `
      SELECT 
        im.*, 
        po.po_number, 
        v.vendor_name
      FROM invoice_master im
      LEFT JOIN purchase_order po ON im.po_id = po.po_id
      LEFT JOIN vendor_master v ON im.vendor_id = v.vendor_id
      WHERE im.invoice_date BETWEEN $1 AND $2
    `;

    const params = [startDate, endDate];
    let paramIndex = 3;

    if (vendorId && vendorId !== 0) {
      query += ` AND im.vendor_id = $${paramIndex++}`;
      params.push(vendorId);
    }

    if (poId && poId !== 0) {
      query += ` AND im.po_id = $${paramIndex++}`;
      params.push(poId);
    }

    query += ` ORDER BY im.invoice_date DESC`;

    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error("Error fetching invoices by filters:", error);
    throw error;
  }
};

/**
 * Adds a cashbook entry and updates the cash ledger balance.
 * Must be called with a client inside an active transaction.
 *
 * @param {Object} client - PostgreSQL client
 * @param {number} amount - Amount to add/subtract
 * @param {string} description - Description for cash entry
 * @param {'IN' | 'OUT'} entryType - Entry type
 */
export const addCashEntryAndAdjustLedger = async (client, amount, description, entryType) => {
  // Add entry to cashbook
  await client.query(
    `INSERT INTO cashbook (entry_date, description, amount, entry_type)
     VALUES (CURRENT_DATE, $1, $2, $3)`,
    [description, amount, entryType]
  );

  // Update cash ledger balance
  const res = await client.query(
    `SELECT id, balance FROM cash_ledger_balance ORDER BY id DESC LIMIT 1`
  );

  let newBalance = amount;
  if (res.rows.length > 0) {
    // For 'OUT' entries, subtract amount
    newBalance = parseFloat(res.rows[0].balance) + (entryType === 'IN' ? amount : -amount);
    await client.query(
      `UPDATE cash_ledger_balance
       SET balance = $1, last_update = NOW()
       WHERE id = $2`,
      [newBalance, res.rows[0].id]
    );
  } else {
    await client.query(
      `INSERT INTO cash_ledger_balance (last_update, balance)
       VALUES (NOW(), $1)`,
      [entryType === 'IN' ? amount : -amount]
    );
  }

  return newBalance;
};




/**
 * Bulk sync payments for an invoice
 * @param {Number} invoiceId
 * @param {Number} vendorId
 * @param {Array} paymentList - array of payments (each may have payment_id for update)
 */
export const syncPaymentsForInvoice = async (invoiceId, vendorId, totalAmountAsPerInvoice, paymentList = [], invoiceNumber) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch existing payments for invoice
    const { rows: existingPayments } = await client.query(
      `SELECT payment_id FROM payment_tracking_master WHERE invoice_id = $1 AND vendor_id = $2`,
      [invoiceId, vendorId]
    );
    const existingPaymentIds = existingPayments.map(p => p.payment_id);

    const incomingIds = paymentList.map(p => p.payment_id).filter(Boolean);
    const toDelete = existingPaymentIds.filter(id => !incomingIds.includes(id));

    // Delete removed payments
    if (toDelete.length > 0) {
     for (const paymentId of toDelete) {
    // Fetch amount and mode for this payment
    const res = await client.query(
      `SELECT payment_amount AS "deletePaymentAmount", payment_mode AS "deletePaymentMode"
       FROM payment_tracking_master WHERE payment_id = $1`,
      [paymentId]
    );

    const { deletePaymentAmount, deletePaymentMode } = res.rows[0] || {};
    
    // Add cash entry and adjust ledger if payment was CASH
    if (deletePaymentAmount && deletePaymentMode === "CASH") {
      await addCashEntryAndAdjustLedger(
        client,
        deletePaymentAmount,
        `Deleted Payment Adjustment Invoice No. ${invoiceNumber}`,
        'IN'
      );
    }
  }
      
      await client.query(
        `DELETE FROM payment_tracking_master WHERE payment_id = ANY($1)`,
        [toDelete]
      );
      

    }

    let totalPaid = 0;

    for (const payment of paymentList) {
      const {
        payment_id, payment_date, payment_amount,
        payment_mode = '', transaction_reference = '',
        payment_notes = ''
      } = payment;
       const amount = parseFloat(payment_amount || 0);
      totalPaid += amount;
      if (payment_id) {

        // Fetch the existing payment amount and mode
        const { rows: existingPaymentRows } = await client.query(
          `SELECT payment_amount, payment_mode FROM payment_tracking_master WHERE payment_id = $1`,
          [payment_id]
        );

        const existingPayment = existingPaymentRows[0];
        const existingAmount = parseFloat(existingPayment.payment_amount || 0);
        const existingMode = existingPayment.payment_mode;
        // Update
        await client.query(
          `UPDATE payment_tracking_master SET
             payment_date = $1, payment_amount = $2,
             payment_mode = $3, transaction_reference = $4,
             payment_notes = $5
           WHERE payment_id = $6 AND invoice_id = $7 AND vendor_id = $8`,
          [payment_date, payment_amount, payment_mode, transaction_reference, payment_notes, payment_id, invoiceId, vendorId]
        );

        // Adjust cashbook if it was a CASH payment
  if (payment_mode === 'CASH') {
    // Compute delta
    const delta = amount - (existingMode === 'CASH' ? existingAmount : 0);

    if (delta !== 0) {
      await addCashEntryAndAdjustLedger(
        client,
        Math.abs(delta),
        `Updated Payment Adjustment Invoice No. ${invoiceNumber}`,
        delta > 0 ? 'OUT' : 'IN'
      );
    }
  }
      } else {
        // Insert
        await client.query(
          `INSERT INTO payment_tracking_master (
             invoice_id, vendor_id, payment_date, payment_amount,
             payment_mode, transaction_reference, payment_notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [invoiceId, vendorId, payment_date, payment_amount, payment_mode, transaction_reference, payment_notes]
        );
        // Add cash entry if new payment is CASH
        if (payment_mode === 'CASH') {
          await addCashEntryAndAdjustLedger(
            client,
            amount,
            `New Payment Debit for Invoice No. ${invoiceNumber}`,
            'OUT'
          );
        }
      }
    }
      // Determine payment status
    let status = 'PENDING';
    const total = parseFloat(totalAmountAsPerInvoice || 0);

    if (totalPaid === total) {
      status = 'PAID';
    } else if (totalPaid > 0 && totalPaid < total) {
      status = 'PARTIAL';
    } else if(totalPaid > 0 && totalPaid >= total){
        status = 'OVERPAID';
    }

    // Update invoice payment status
    await client.query(
      `UPDATE invoice_master SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = $2`,
      [status, invoiceId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error syncing payments:", error);
    throw error;
  } finally {
    client.release();
  }
};


export const getPaymentsByInvoiceId = async (invoiceId) => {
  const query = `
    SELECT * FROM payment_tracking_master
    WHERE invoice_id = $1
    ORDER BY payment_date DESC
  `;
  const { rows } = await pool.query(query, [invoiceId]);
  return rows;
};


export const getInvoicePaymentSummaryByPoId = async (poId) => {
  try {
    const query = `
      SELECT 
        im.invoice_id,
        im.invoice_number,
        im.invoice_date,
        im.total_invoice_amount,
        im.vendor_id,
        im.payment_status,
        COALESCE(SUM(ptm.payment_amount), 0) AS total_paid
      FROM invoice_master im
      LEFT JOIN payment_tracking_master ptm ON im.invoice_id = ptm.invoice_id
      WHERE im.po_id = $1
      GROUP BY im.invoice_id
      ORDER BY im.invoice_date DESC
    `;

    const { rows } = await pool.query(query, [poId]);
    return rows;
  } catch (error) {
    console.error("Error fetching payment summary by PO ID:", error);
    throw error;
  }
};




/**
 * Add a new cash entry
 */
export const addCashEntry = async ({ entry_date, description, amount, entry_type }) => {
  const res = await pool.query(
    `INSERT INTO cashbook (entry_date, description, amount, entry_type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [entry_date, description, amount, entry_type]
  );

  await updateCashBalance(entry_type, amount);
  return res.rows[0];
};

/**
 * Update an existing cash entry
 */
export const updateCashEntry = async (id, { entry_date, description, amount, entry_type }) => {
  const res = await pool.query(
    `UPDATE cashbook
     SET entry_date = $1, description = $2, amount = $3, entry_type = $4
     WHERE id = $5 RETURNING *`,
    [entry_date, description, amount, entry_type, id]
  );

  // Balance adjustment logic (optional: depends on how strict you want consistency)
  return res.rows[0];
};

/**
 * Delete a cash entry
 */
export const deleteCashEntry = async (id) => {
  const res = await pool.query(
    `DELETE FROM cashbook WHERE id = $1 RETURNING *`,
    [id]
  );

  if (res.rows[0]) {
    const { entry_type, amount } = res.rows[0];
    const adjustment = entry_type === "IN" ? -amount : amount;
    await adjustCashBalance(adjustment);
  }

  return res.rows[0];
};

/**
 * Get cash entries within a date range
 */
export const getCashEntries = async (startDate, endDate) => {
  let query = `SELECT * FROM cashbook WHERE 1=1`;
  const params = [];

  if (startDate) {
    params.push(startDate);
    query += ` AND entry_date >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    query += ` AND entry_date <= $${params.length}`;
  }

  query += ` ORDER BY entry_date DESC, id DESC`;

  const res = await pool.query(query, params);
  return res.rows;
};

/**
 * Get current balance
 */
export const getCashBalance = async () => {
  const res = await pool.query(
    `SELECT balance FROM cash_ledger_balance ORDER BY id DESC LIMIT 1`
  );
  return res.rows[0] ? res.rows[0].balance : 0;
};

/**
 * Internal: update cash balance
 */
const updateCashBalance = async (entry_type, amount) => {
  const adjustment = entry_type === "IN" ? amount : -amount;
  await adjustCashBalance(adjustment);
};

/**
 * Internal: adjust balance
 */
const adjustCashBalance = async (adjustment) => {
  const res = await pool.query(
    `SELECT id, balance FROM cash_ledger_balance ORDER BY id DESC LIMIT 1`
  );

  let newBalance = adjustment;
  if (res.rows.length > 0) {
    newBalance = parseFloat(res.rows[0].balance) + parseFloat(adjustment);
    await pool.query(
      `UPDATE cash_ledger_balance
       SET balance = $1, last_update = NOW()
       WHERE id = $2`,
      [newBalance, res.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO cash_ledger_balance (last_update, balance)
       VALUES (NOW(), $1)`,
      [newBalance]
    );
  }

  return newBalance;
};
