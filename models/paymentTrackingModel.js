// paymentTrackingModel.js
import pool from "../configs/db.js";

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
