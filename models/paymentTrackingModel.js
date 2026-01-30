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
export const addCashEntryAndAdjustLedger = async (
  client,
  amt,
  description,
  entryType
) => {
  let amount = parseFloat(amt) || 0;

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
    newBalance =
      parseFloat(res.rows[0].balance) + (entryType === "IN" ? amount : -amount);
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
      [entryType === "IN" ? amount : -amount]
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
};

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
    userId, // this is the logged-in user performing the action
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
      paymentId,
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
    const { rows: totalPaidRows } = await pool.query(totalPaidQuery, [
      salesOrderId,
    ]);
    const totalPaid = parseFloat(totalPaidRows[0].total_paid);

    //  Get grand total from sales_order_master
    const grandTotalQuery = `
    SELECT grand_total_rounded
    FROM sales_order_master
    WHERE sales_order_id = $1;
  `;
    const { rows: orderRows } = await pool.query(grandTotalQuery, [
      salesOrderId,
    ]);
    const grandTotal = parseFloat(orderRows[0].grand_total_rounded);

    //  Determine payment status
    let newStatus = "UNPAID";
    if (totalPaid == grandTotal) {
      newStatus = "FULL PAID";
    } else if (totalPaid > 0 && totalPaid < grandTotal) {
      newStatus = "PAID PARTIALLY";
    } else if (totalPaid > 0 && totalPaid > grandTotal) {
      newStatus = "OVERPAID";
    }

    // Update sales_order_master with new payment status
    await pool.query(
      `UPDATE sales_order_master
     SET payment_status = $1, updated_at = NOW()
     WHERE sales_order_id = $2`,
      [newStatus, salesOrderId]
    );
    console.log("Total", totalPaid, grandTotal);
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
      userId,
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
    const { rows: totalPaidRows } = await pool.query(totalPaidQuery, [
      salesOrderId,
    ]);
    const totalPaid = parseFloat(totalPaidRows[0].total_paid);

    //  Get grand total from sales_order_master
    const grandTotalQuery = `
    SELECT grand_total_rounded
    FROM sales_order_master
    WHERE sales_order_id = $1;
  `;
    const { rows: orderRows } = await pool.query(grandTotalQuery, [
      salesOrderId,
    ]);
    const grandTotal = parseFloat(orderRows[0].grand_total_rounded);

    //  Determine payment status
    let newStatus = "UNPAID";
    if (totalPaid == grandTotal) {
      newStatus = "FULL PAID";
    } else if (totalPaid > 0 && totalPaid < grandTotal) {
      newStatus = "PAID PARTIALLY";
    } else if (totalPaid > 0 && totalPaid > grandTotal) {
      newStatus = "OVERPAID";
    }

    // Update sales_order_master with new payment status
    await pool.query(
      `UPDATE sales_order_master
     SET payment_status = $1, updated_at = NOW()
     WHERE sales_order_id = $2`,
      [newStatus, salesOrderId]
    );
    console.log("Total", totalPaid, grandTotal);
    return rows[0];
  }
};

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
  const { rows: totalPaidRows } = await pool.query(totalPaidQuery, [
    salesOrderId,
  ]);
  const totalPaid = parseFloat(totalPaidRows[0].total_paid);

  //  Get grand total from sales_order_master
  const grandTotalQuery = `
    SELECT grand_total_rounded
    FROM sales_order_master
    WHERE sales_order_id = $1;
  `;
  const { rows: orderRows } = await pool.query(grandTotalQuery, [salesOrderId]);
  const grandTotal = parseFloat(orderRows[0].grand_total_rounded);

  //  Determine payment status
  let newStatus = "UNPAID";
  if (totalPaid == grandTotal) {
    newStatus = "FULL PAID";
  } else if (totalPaid > 0 && totalPaid < grandTotal) {
    newStatus = "PAID PARTIALLY";
  } else if (totalPaid > 0 && totalPaid > grandTotal) {
    newStatus = "OVERPAID";
  }

  console.log(totalPaid, grandTotal);

  // Update sales_order_master with new payment status
  await pool.query(
    `UPDATE sales_order_master
     SET payment_status = $1, updated_at = NOW()
     WHERE sales_order_id = $2`,
    [newStatus, salesOrderId]
  );

  return rows[0];
};

/**
 * Create Party Payment (CASH / BANK)
 * Fully transactional
 * Party Wise Payment - New Requirement - 12-01-2026
 */
export const createPartyPayment = async (paymentData) => {
  const client = await pool.connect();

  try {
    const {
      partyType, // CUSTOMER | DEALER
      customerId,
      dealerId,
      paymentDate,
      paymentAmount,
      paymentMethod, // CASH | BANK
      bankId,
      transactionReference,
      notes,
      createdBy,
      modeOfTransaction, // UPI / NEFT / CASH etc (for bank)
    } = paymentData;

    await client.query("BEGIN");

    let cashbookId = null;
    let bankTransactionId = null;

    /* ===================== CASH PAYMENT ===================== */
    if (paymentMethod === "CASH") {
      const cashRes = await client.query(
        `
        INSERT INTO cashbook (
          expense_category_id,
          entry_date,
          description,
          amount,
          entry_type
        ) VALUES (2, $1, $2, $3, 'IN')
        RETURNING id
        `,
        [
          paymentDate,
          `Cash received from ${partyType} - ${notes || ""}`,
          paymentAmount,
        ]
      );

      cashbookId = cashRes.rows[0].id;

      // Update cash ledger
      const ledgerRes = await client.query(
        `SELECT id, balance FROM cash_ledger_balance ORDER BY id DESC LIMIT 1`
      );

      if (ledgerRes.rows.length) {
        await client.query(
          `
          UPDATE cash_ledger_balance
          SET balance = balance + $1, last_update = NOW()
          WHERE id = $2
          `,
          [paymentAmount, ledgerRes.rows[0].id]
        );
      } else {
        await client.query(
          `
          INSERT INTO cash_ledger_balance (balance, last_update)
          VALUES ($1, NOW())
          `,
          [paymentAmount]
        );
      }
    }

    /* ===================== BANK PAYMENT ===================== */
    if (paymentMethod === "BANK") {
      const bankRes = await client.query(
        `
        INSERT INTO bank_transaction_tracker (
          expense_category_id,
          bank_id,
          transaction_date,
          transaction_type,
          reference_no,
          remarks,
          amount,
          mode_of_transaction,
          created_by
        )
        VALUES (2, $1, $2, 'IN', $3, $4, $5, $6, $7)
        RETURNING transaction_id
        `,
        [
          bankId,
          paymentDate,
          transactionReference,
          `Payment received from ${partyType} - ${notes}`,
          paymentAmount,
          modeOfTransaction,
          createdBy,
        ]
      );

      bankTransactionId = bankRes.rows[0].transaction_id;

      // Update bank ledger
      await client.query(
        `
        UPDATE bank_ledger_balance
        SET balance = balance + $1, updated_at = NOW()
        WHERE bank_id = $2
        `,
        [paymentAmount, bankId]
      );
    }

    /* ===================== PARTY PAYMENT MASTER ===================== */
    const paymentRes = await client.query(
      `
      INSERT INTO party_payment_master (
        party_type,
        customer_id,
        dealer_id,
        payment_date,
        payment_amount,
        payment_method,
        cashbook_id,
        bank_transaction_id,
        bank_id,
        transaction_reference,
        notes,
        created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING *
      `,
      [
        partyType,
        customerId || null,
        dealerId || null,
        paymentDate,
        paymentAmount,
        paymentMethod,
        cashbookId,
        bankTransactionId,
        bankId || null,
        transactionReference,
        notes,
        createdBy,
      ]
    );

    await client.query("COMMIT");
    return paymentRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get Party Payments (CASH / BANK)
 * Party Wise Payment - New Requirement - 12-01-2026
 */
export const getPartyPayments = async ({
  partyType, // 'CUSTOMER' | 'DEALER'
  customerId = null,
  dealerId = null,
  fromDate = "2020-01-01",
  toDate = new Date().toISOString().slice(0, 10),
}) => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT
        ppm.party_payment_id,
        ppm.party_type,
        ppm.customer_id,
        ppm.dealer_id,
        ppm.payment_date,
        ppm.payment_amount,
        ppm.payment_method,
        ppm.transaction_reference,
        ppm.notes,

        -- Bank details
        bm.bank_name,
        bm.account_number,
        btt.mode_of_transaction,
        btt.reference_no AS bank_reference_no,

        -- Cash / Bank ids (useful for drilldown)
        ppm.cashbook_id,
        ppm.bank_transaction_id

      FROM party_payment_master ppm

      LEFT JOIN bank_transaction_tracker btt
        ON ppm.bank_transaction_id = btt.transaction_id

      LEFT JOIN bank_master bm
        ON btt.bank_id = bm.bank_id

      WHERE ppm.is_deleted = FALSE
        AND ppm.party_type = $1
        AND ppm.payment_date BETWEEN $2 AND $3
        AND (
          ($1 = 'CUSTOMER' AND ppm.customer_id = $4)
          OR
          ($1 = 'DEALER' AND ppm.dealer_id = $5)
        )

      ORDER BY ppm.payment_date DESC, ppm.party_payment_id DESC
    `;

    const values = [partyType, fromDate, toDate, customerId, dealerId];

    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Get Year-wise Product Order Count for a Party
 * CUSTOMER / DEALER
 */
export const getYearWiseProductOrderCount = async ({
  partyType, // 'CUSTOMER' | 'DEALER'
  customerId = null,
  dealerId = null,
  fromYear = 2020,
  toYear = new Date().getFullYear(),
}) => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT
        pm.product_id,
        pm.product_name,

        EXTRACT(YEAR FROM som.order_date)::INT AS order_year,
        SUM(soi.quantity) AS total_quantity

      FROM sales_order_master som
      INNER JOIN sales_order_item soi
        ON som.sales_order_id = soi.sales_order_id
      INNER JOIN product_master pm
        ON soi.product_id = pm.product_id

      WHERE
        som.status <> 'CANCELLED'
        AND som.order_type = $1
        AND (
          ($1 = 'CUSTOMER' AND som.customer_id = $2)
          OR
          ($1 = 'DEALER' AND som.dealer_id = $3)
        )
        AND EXTRACT(YEAR FROM som.order_date) BETWEEN $4 AND $5

      GROUP BY
        pm.product_id,
        pm.product_name,
        order_year

      ORDER BY
        pm.product_name,
        order_year DESC
    `;

    const values = [partyType, customerId, dealerId, fromYear, toYear];

    const { rows } = await client.query(query, values);
    return rows;
  } finally {
    client.release();
  }
};

export const createSalesPartyDiscount = async (discountData) => {
  const client = await pool.connect();

  try {
    const {
      partyType, // CUSTOMER | DEALER
      customerId,
      dealerId,
      discountDate,
      discountAmount,
      reason,
      createdBy,
    } = discountData;

    await client.query("BEGIN");

    const discountRes = await client.query(
      `
      INSERT INTO sales_party_discount_master (
        party_type,
        customer_id,
        dealer_id,
        discount_date,
        discount_amount,
        reason,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING *
      `,
      [
        partyType,
        customerId || null,
        dealerId || null,
        discountDate,
        discountAmount,
        reason || null,
        createdBy,
      ]
    );

    await client.query("COMMIT");
    return discountRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get Party Discounts
 * Party Wise Discount Ledger
 */
export const getSalesPartyDiscounts = async ({
  partyType, // 'CUSTOMER' | 'DEALER'
  customerId = null,
  dealerId = null,
  fromDate = "2020-01-01",
  toDate = new Date().toISOString().slice(0, 10),
}) => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT
        spd.sales_party_discount_id,
        spd.party_type,
        spd.customer_id,
        spd.dealer_id,
        spd.discount_date,
        spd.discount_amount,
        spd.reason,
        spd.created_at,
        u.first_name AS created_by_name

      FROM sales_party_discount_master spd

      LEFT JOIN users u
        ON spd.created_by = u.user_id

      WHERE spd.is_deleted = FALSE
        AND spd.party_type = $1
        AND spd.discount_date BETWEEN $2 AND $3
        AND (
          ($1 = 'CUSTOMER' AND spd.customer_id = $4)
          OR
          ($1 = 'DEALER' AND spd.dealer_id = $5)
        )

      ORDER BY spd.discount_date DESC, spd.sales_party_discount_id DESC
    `;

    const values = [partyType, fromDate, toDate, customerId, dealerId];

    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
};

export const deleteSalesPartyDiscount = async ({
  salesPartyDiscountId,
  deletedBy,
}) => {
  const client = await pool.connect();

  try {
    await client.query(
      `
      UPDATE sales_party_discount_master
      SET is_deleted = TRUE
      WHERE sales_party_discount_id = $1
      `,
      [salesPartyDiscountId]
    );

    return true;
  } finally {
    client.release();
  }
};

export const softDeletePartyPayment = async (
  partyPaymentId,
  deletedByUserId
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* ===============================
       1. Lock party payment
    =============================== */
    const paymentRes = await client.query(
      `
        SELECT *
        FROM party_payment_master
        WHERE party_payment_id = $1
          AND is_deleted = FALSE
        FOR UPDATE
      `,
      [partyPaymentId]
    );

    if (paymentRes.rows.length === 0) {
      throw new Error("Party payment not found or already deleted");
    }

    const payment = paymentRes.rows[0];

    /* ===============================
       2. CASH PAYMENT REVERSAL
    =============================== */
    if (payment.payment_method === "CASH" && payment.cashbook_id) {
      const cashRes = await client.query(
        `
          SELECT amount, entry_type
          FROM cashbook
          WHERE id = $1
            AND is_deleted = FALSE
          FOR UPDATE
        `,
        [payment.cashbook_id]
      );

      if (cashRes.rows.length > 0) {
        const { amount, entry_type } = cashRes.rows[0];

        // Reverse cash balance
        // Original OUT → add back
        // Original IN  → subtract
        const balanceDelta = entry_type === "OUT" ? amount : -amount;

        await client.query(
          `
            UPDATE cash_ledger_balance
            SET balance = balance + $1,
                last_update = NOW()
          `,
          [balanceDelta]
        );

        await client.query(
          `
            UPDATE cashbook
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                deleted_by = $2
            WHERE id = $1
          `,
          [payment.cashbook_id, deletedByUserId]
        );
      }
    }

    /* ===============================
       3. BANK PAYMENT REVERSAL
    =============================== */
    if (
      payment.payment_method === "BANK" &&
      payment.bank_transaction_id &&
      payment.bank_id
    ) {
      const bankRes = await client.query(
        `
          SELECT amount, transaction_type
          FROM bank_transaction_tracker
          WHERE transaction_id = $1
            AND is_deleted = FALSE
          FOR UPDATE
        `,
        [payment.bank_transaction_id]
      );

      if (bankRes.rows.length > 0) {
        const { amount, transaction_type } = bankRes.rows[0];

        // Reverse bank balance
        const balanceDelta = transaction_type === "OUT" ? amount : -amount;

        await client.query(
          `
            UPDATE bank_ledger_balance
            SET balance = balance + $1,
                updated_at = NOW()
            WHERE bank_id = $2
          `,
          [balanceDelta, payment.bank_id]
        );

        await client.query(
          `
            UPDATE bank_transaction_tracker
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                deleted_by = $2
            WHERE transaction_id = $1
          `,
          [payment.bank_transaction_id, deletedByUserId]
        );
      }
    }

    /* ===============================
       4. Soft delete party payment
    =============================== */
    await client.query(
      `
        UPDATE party_payment_master
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            deleted_by = $2
        WHERE party_payment_id = $1
      `,
      [partyPaymentId, deletedByUserId]
    );

    await client.query("COMMIT");

    return {
      success: true,
      partyPaymentId,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
