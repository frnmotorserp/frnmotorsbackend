// paymentTrackingModel.js
import pool from "../configs/db.js";

/**
 * Adds a cashbook entry and updates the cash ledger balance.
 * Must be called with a client inside an active transaction.
 *
 * @param {Object} client - PostgreSQL client
 * @param {number} amount - Amount to add/subtract
 * @param {string} description - Description for cash entry
 * @param {'IN' | 'OUT'} entryType - Entry type
 */
export const addCashEntryAndAdjustLedger = async (client, amt, description, entryType) => {
  let amount = parseFloat(amt) || 0
  
  // Add entry to cashbook
  await client.query(
    `INSERT INTO cashbook (entry_date, description, amount, entry_type, expense_category_id)
     VALUES (CURRENT_DATE, $1, $2, $3, $4)`,
    [description, amount, entryType, 2]
  );
  //expense_category_id should be 2 - Sales payment Received - if category id is not in the db insert first

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


// View payment history for a sales order
export const getPaymentsBySalesOrderId = async (salesOrderId) => {
  const query = `
    SELECT 
      payment_id AS "paymentId",
      sales_order_id AS "salesOrderId",
      payment_date AS "paymentDate",
      payment_amount AS "paymentAmount",
      payment_mode AS "paymentMode",
      payment_received_account_no AS "paymentReceivedAccountNo",
      transaction_reference AS "transactionReference",
      payment_notes AS "paymentNotes",
      created_by AS "createdBy",
      updated_by AS "updatedBy",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM sales_payment_tracking_master
    WHERE sales_order_id = $1
    ORDER BY payment_date DESC
  `;
  const { rows } = await pool.query(query, [salesOrderId]);
  return rows;
}

// Save or update payment
export const saveOrUpdatePayment = async (paymentData) => {
  const {
    paymentId,
    salesOrderId,
    paymentDate,
    paymentAmount,
    paymentMode,
    paymentReceivedAccountNo,
    transactionReference,
    paymentNotes,
    userId // this is the logged-in user performing the action
  } = paymentData;

  if (paymentId) {


    // 1. Get the old payment amount before update
  const oldPaymentQuery = `
    SELECT payment_amount, sales_order_id, payment_mode
    FROM sales_payment_tracking_master
    WHERE payment_id = $1
  `;
  const { rows: oldRows } = await pool.query(oldPaymentQuery, [paymentId]);
  if (oldRows.length === 0) {
    throw new Error("Payment record not found");
  }
  const oldAmount = parseFloat(oldRows[0].payment_amount);
  const oldSalesOrderId = oldRows[0].sales_order_id;
  const oldPaymentMode = oldRows[0].payment_mode;

  // 2. If old payment was CASH, reverse its effect in cashbook/ledger
  if (oldPaymentMode === "CASH") {
    await addCashEntryAndAdjustLedger(
      pool,
      oldAmount,
      `Reversal of previous payment as updated (Payment ID ${paymentId} -  SO ${salesOrderId})`,
      "OUT" // because we are undoing the earlier cash IN
    );
  }



    // Update
    const updateQuery = `
      UPDATE sales_payment_tracking_master
      SET 
        payment_date = $1,
        payment_amount = $2,
        payment_mode = $3,
        payment_received_account_no = $4,
        transaction_reference = $5,
        payment_notes = $6,
        updated_by = $7,
        updated_at = NOW()
      WHERE payment_id = $8
      RETURNING *;
    `;
    const { rows } = await pool.query(updateQuery, [
      paymentDate,
      paymentAmount,
      paymentMode,
      paymentReceivedAccountNo,
      transactionReference,
      paymentNotes,
      userId,
      paymentId
    ]);

        if (paymentMode === "CASH") {
      await addCashEntryAndAdjustLedger(
        pool,
        parseFloat(paymentAmount),
        `Updated payment entry (SO ID ${salesOrderId})`,
        "IN"
      );
    }
    const totalPaidQuery = `
    SELECT COALESCE(SUM(payment_amount),0) AS total_paid
    FROM sales_payment_tracking_master
    WHERE sales_order_id = $1;
  `;
  const { rows: totalPaidRows } = await pool.query(totalPaidQuery, [salesOrderId]);
  const totalPaid = parseFloat(totalPaidRows[0].total_paid);

  //  Get grand total from sales_order_master
  const grandTotalQuery = `
    SELECT grand_total
    FROM sales_order_master
    WHERE sales_order_id = $1;
  `;
  const { rows: orderRows } = await pool.query(grandTotalQuery, [salesOrderId]);
  const grandTotal = parseFloat(orderRows[0].grand_total);

  //  Determine payment status
  let newStatus = "UNPAID";
  if (totalPaid == grandTotal) {
    newStatus = "FULL PAID";
  } else if (totalPaid > 0 && totalPaid < grandTotal ) {
    newStatus = "PAID PARTIALLY";
  }
  else if (totalPaid > 0 && totalPaid > grandTotal  ) {
    newStatus = "OVERPAID";
  }

  // Update sales_order_master with new payment status
  await pool.query(
    `UPDATE sales_order_master
     SET payment_status = $1, updated_at = NOW()
     WHERE sales_order_id = $2`,
    [newStatus, salesOrderId]
  );
    console.log("Total", totalPaid, grandTotal )
    return rows[0];
  } else {
    // Insert
    const insertQuery = `
      INSERT INTO sales_payment_tracking_master (
        sales_order_id,
        payment_date,
        payment_amount,
        payment_mode,
        payment_received_account_no,
        transaction_reference,
        payment_notes,
        created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [
      salesOrderId,
      paymentDate,
      paymentAmount,
      paymentMode,
      paymentReceivedAccountNo,
      transactionReference,
      paymentNotes,
      userId
    ]);

  if (paymentMode === "CASH") {
    await addCashEntryAndAdjustLedger(
      pool,
      parseFloat(paymentAmount),
      `Added Sales Payment (SO#${salesOrderId})`,
      "IN"
    );
  }

    const totalPaidQuery = `
    SELECT COALESCE(SUM(payment_amount),0) AS total_paid
    FROM sales_payment_tracking_master
    WHERE sales_order_id = $1;
  `;
  const { rows: totalPaidRows } = await pool.query(totalPaidQuery, [salesOrderId]);
  const totalPaid = parseFloat(totalPaidRows[0].total_paid);

  //  Get grand total from sales_order_master
  const grandTotalQuery = `
    SELECT grand_total
    FROM sales_order_master
    WHERE sales_order_id = $1;
  `;
  const { rows: orderRows } = await pool.query(grandTotalQuery, [salesOrderId]);
  const grandTotal = parseFloat(orderRows[0].grand_total);

  //  Determine payment status
  let newStatus = "UNPAID";
  if (totalPaid == grandTotal) {
    newStatus = "FULL PAID";
  }else if (totalPaid > 0 && totalPaid < grandTotal ) {
    newStatus = "PAID PARTIALLY";
  }
  else if (totalPaid > 0 && totalPaid > grandTotal  ) {
    newStatus = "OVERPAID";
  }

  // Update sales_order_master with new payment status
  await pool.query(
    `UPDATE sales_order_master
     SET payment_status = $1, updated_at = NOW()
     WHERE sales_order_id = $2`,
    [newStatus, salesOrderId]
  );
    console.log("Total", totalPaid, grandTotal )
    return rows[0];
  }
}

// Delete payment
export const deletePayment = async (paymentId, salesOrderId) => {
  const deleteQuery = `DELETE FROM sales_payment_tracking_master WHERE payment_id = $1 RETURNING *`;
  const { rows } = await pool.query(deleteQuery, [paymentId]);
  const deletedPayment = rows[0];
  if (deletedPayment?.payment_mode === "CASH") {
    await addCashEntryAndAdjustLedger(
      pool,
      parseFloat(deletedPayment.payment_amount),
      `Deleted Sales Payment (SO#${salesOrderId})`,
      "OUT"
    );
  }

   const totalPaidQuery = `
    SELECT COALESCE(SUM(payment_amount),0) AS total_paid
    FROM sales_payment_tracking_master
    WHERE sales_order_id = $1;
  `;
  const { rows: totalPaidRows } = await pool.query(totalPaidQuery, [salesOrderId]);
  const totalPaid = parseFloat(totalPaidRows[0].total_paid);

  //  Get grand total from sales_order_master
  const grandTotalQuery = `
    SELECT grand_total
    FROM sales_order_master
    WHERE sales_order_id = $1;
  `;
  const { rows: orderRows } = await pool.query(grandTotalQuery, [salesOrderId]);
  const grandTotal = parseFloat(orderRows[0].grand_total);

  //  Determine payment status
  let newStatus = "UNPAID";
  if (totalPaid == grandTotal) {
    newStatus = "FULL PAID";
  } else if (totalPaid > 0 && totalPaid < grandTotal ) {
    newStatus = "PAID PARTIALLY";
  }
  else if (totalPaid > 0 && totalPaid > grandTotal  ) {
    newStatus = "OVERPAID";
  }

  console.log(totalPaid, grandTotal )

  // Update sales_order_master with new payment status
  await pool.query(
    `UPDATE sales_order_master
     SET payment_status = $1, updated_at = NOW()
     WHERE sales_order_id = $2`,
    [newStatus, salesOrderId]
  );

  return rows[0];
}
