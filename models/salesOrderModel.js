import pool from "../configs/db.js";
import dayjs from 'dayjs';

// Get Sales Orders by Date Range (and optional customer/dealer)
export const getSalesOrdersByDateRange = async (startDate, endDate, customerId, dealerId) => {
  let filterClause = `order_date BETWEEN $1 AND $2`;
  const params = [startDate, endDate];

  if (customerId) {
    params.push(customerId);
    filterClause += ` AND customer_id = $${params.length}`;
  }
  if (dealerId) {
    params.push(dealerId);
    filterClause += ` AND dealer_id = $${params.length}`;
  }

  const query = `
    SELECT * FROM sales_order_master
    WHERE ${filterClause}
    ORDER BY order_date DESC;
  `;
  const { rows } = await pool.query(query, params);
  return rows;
};

// Get Summary Count by Status
export const getSalesOrderSummary = async () => {
  const query = `
    SELECT 
      status,
      COUNT(*) AS count,
      SUM(grand_total) AS total_amount
    FROM sales_order_master
    GROUP BY status;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Save or Update Sales Order with Items
export const saveOrUpdateSalesOrder = async (orderData, items) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const timestamp = new Date();

    const {
      salesOrderId,
      salesOrderCode,
      orderDate,
      orderType,
      expectedDeliveryDate,
      dispatchMode,
      bookedByUserId,
      customerId,
      dealerId,
      companyId,
      companyAddress,
      billingAddress,
      shippingAddress,
      companyStateCode,
      billingStateCode,
      shippingStateCode,
      transportMode,
      distanceKm,
      paymentTerms,
      remarks,
      subtotal,
      discountAmount,
      taxableAmount,
      taxType,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      grandTotal,
      status = "CONFIRMED",
      paymentStatus,
      salesLocationId,
      createdBy,
      updatedBy,
      irn,
      ackNo,
      ackDate,
      signedQrCode,
      cancelledAt,
      cancellationReason,
      transporterName,
      vehicleNo,

    } = orderData;

    let savedOrderId = salesOrderId;

    if (salesOrderId && salesOrderId > 0) {
      const updateQuery = `
        UPDATE sales_order_master
        SET sales_order_code=$1, order_date=$2, order_type=$3, expected_delivery_date=$4, 
            dispatch_mode=$5, booked_by_user_id=$6, customer_id=$7, dealer_id=$8, 
            company_id=$9, company_address=$10, billing_address=$11, shipping_address=$12,
            company_state_code=$13, billing_state_code=$14, shipping_state_code=$15,
            transport_mode=$16, distance_km=$17, payment_terms=$18, remarks=$19, 
            subtotal=$20, discount_amount=$21, taxable_amount=$22, tax_type=$23,
            cgst_amount=$24, sgst_amount=$25, igst_amount=$26, total_tax=$27, grand_total=$28,
            status=$29, payment_status=$30, updated_user_id=$31, updated_by=$32, updated_at=$33,
            irn=$34, ack_no=$35, ack_date=$36, signed_qr_code=$37,
            cancelled_at=$38, cancellation_reason=$39, transporter_name=$40, vehicle_no=$41, sales_point_location_id=$43
        WHERE sales_order_id=$42;
      `;
      await client.query(updateQuery, [
        salesOrderCode, orderDate, orderType, expectedDeliveryDate,
        dispatchMode, bookedByUserId, customerId, dealerId,
        companyId, companyAddress, billingAddress, shippingAddress,
        companyStateCode, billingStateCode, shippingStateCode,
        transportMode, distanceKm, paymentTerms, remarks,
        subtotal, discountAmount, taxableAmount, taxType,
        cgstAmount, sgstAmount, igstAmount, totalTax, grandTotal,
        status, paymentStatus, bookedByUserId, updatedBy, timestamp,
        irn, ackNo, ackDate, signedQrCode,
        cancelledAt, cancellationReason, transporterName, vehicleNo,
        salesOrderId, salesLocationId
      ]);
    } else {
      const insertQuery = `
        INSERT INTO sales_order_master (
          sales_order_code, order_date, order_type, expected_delivery_date, dispatch_mode,
          booked_by_user_id, customer_id, dealer_id, company_id,
          company_address, billing_address, shipping_address,
          company_state_code, billing_state_code, shipping_state_code,
          transport_mode, distance_km, payment_terms, remarks,
          subtotal, discount_amount, taxable_amount, tax_type,
          cgst_amount, sgst_amount, igst_amount, total_tax, grand_total,
          status, payment_status, created_user_id, created_by, created_at,
          irn, ack_no, ack_date, signed_qr_code,
          cancelled_at, cancellation_reason, transporter_name, vehicle_no, sales_point_location_id
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,
          $10,$11,$12,
          $13,$14,$15,
          $16,$17,$18,$19,
          $20,$21,$22,$23,
          $24,$25,$26,$27,$28,
          $29,$30,$31,$32,$33,
          $34,$35,$36,$37,
          $38,$39,$40,$41,$42
        )
        RETURNING sales_order_id;
      `;
      const insertResult = await client.query(insertQuery, [
        salesOrderCode, orderDate, orderType, expectedDeliveryDate, dispatchMode,
        bookedByUserId, customerId, dealerId, companyId,
        companyAddress, billingAddress, shippingAddress,
        companyStateCode, billingStateCode, shippingStateCode,
        transportMode, distanceKm, paymentTerms, remarks,
        subtotal, discountAmount, taxableAmount, taxType,
        cgstAmount, sgstAmount, igstAmount, totalTax, grandTotal,
        status, paymentStatus, bookedByUserId, createdBy, timestamp,
        irn, ackNo, ackDate, signedQrCode,
        cancelledAt, cancellationReason, transporterName, vehicleNo, salesLocationId
      ]);
      savedOrderId = insertResult.rows[0].sales_order_id;
    }

    // delete old items then insert again
    await client.query(`DELETE FROM sales_order_item WHERE sales_order_id = $1`, [savedOrderId]);

    for (const item of items) {
      const {
        productId, hsnCode, uom, batchNo, serialNo,
        quantity, unitPrice, discount, taxableValue,
        cgstPercentage, cgstAmount, sgstPercentage, sgstAmount,
        igstPercentage, igstAmount, lineTotal, discountPercentage,
        chasisNo, motorNo, controllerNo, productColor,
        charger, chargerSlNo, battery, batterySlNo, serialNoApplicable, productSerialIds
      } = item;

      const stockCheckQuery = `
        SELECT quantity 
        FROM inventory_stock
        WHERE product_id = $1
          AND location_id = $2;
      `;

      const stockRes = await client.query(stockCheckQuery, [productId, salesLocationId]);

      if (stockRes.rowCount === 0) {
        throw new Error(`No stock record found for product ${productId} at location ${salesLocationId}`);
      }

      const availableQty = parseFloat(stockRes.rows[0].quantity);

      if (availableQty < quantity) {
        throw new Error(`Only ${availableQty} available for product ${productId}, requested ${quantity}`);
      }

      if (serialNoApplicable && productSerialIds?.length > 0) {
        const updateSerialQuery = `
        UPDATE product_serials
        SET status = 'out_of_stock',
            last_updated = NOW(),
            modified_by = $2
        WHERE serial_id = ANY($1::uuid[])
          AND status = 'in_stock';
      `;

        const res = await client.query(updateSerialQuery, [productSerialIds, createdBy]);

        if (res.rowCount !== productSerialIds.length) {
          throw new Error("Some serial numbers are not available (already issued or out of stock)");
        }
      }



      const insertItemQuery = `
      INSERT INTO sales_order_item (
        sales_order_id, product_id, hsn_code, uom, batch_no, serial_no,
        quantity, unit_price, discount, taxable_value,
        cgst_percentage, cgst_amount, sgst_percentage, sgst_amount,
        igst_percentage, igst_amount, line_total, discount_percentage,
        chasis_no, motor_no, controller_no, product_color,
        charger, charger_sl_no, battery, battery_sl_no
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,$21,$22,
        $23,$24,$25,$26
      );
    `;

      await client.query(insertItemQuery, [
        savedOrderId, productId, hsnCode, uom, batchNo, serialNo,
        quantity, unitPrice, discount, taxableValue,
        cgstPercentage, cgstAmount, sgstPercentage, sgstAmount,
        igstPercentage, igstAmount, lineTotal, discountPercentage,
        chasisNo, motorNo, controllerNo, productColor,
        charger, chargerSlNo, battery, batterySlNo
      ]);


      const deductStockQuery = `
    UPDATE inventory_stock
    SET quantity = quantity - $1,
        last_update_ref = $4
    WHERE product_id = $2
      AND location_id = $3
      AND quantity >= $1
    RETURNING *;
  `;

      const stockResInsert = await client.query(deductStockQuery, [
        quantity, productId, salesLocationId, `SO-${salesOrderCode}`
      ]);

      if (stockResInsert.rowCount === 0) {
        throw new Error(`Insufficient stock for product ${productId} at location ${locationId}`);
      }
    }


    await client.query('COMMIT');
    return { success: true, salesOrderId: savedOrderId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get items by Sales Order ID
export const getSalesOrderItemsById = async (salesOrderId) => {
  const query = `
    SELECT soi.*, pm.product_name, pm.product_code, pm.serial_no_applicable, 
    pm.is_final_veichle
    FROM sales_order_item soi
    LEFT JOIN product_master pm ON soi.product_id = pm.product_id
    WHERE soi.sales_order_id = $1;
  `;
  const { rows } = await pool.query(query, [salesOrderId]);
  return rows;
};

// Update Sales Order Status
export const updateSalesOrderStatus = async (salesOrderId, newStatus, updatedBy) => {
  const query = `
    UPDATE sales_order_master
    SET status = $1,
        updated_by = $2,
        updated_at = NOW()
    WHERE sales_order_id = $3
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [newStatus, updatedBy, salesOrderId]);
  if (rows.length === 0) throw new Error(`No Sales Order found with ID ${salesOrderId}`);
  return { success: true, data: rows[0] };
};

// Get all orders by Customer or Dealer
export const getSalesOrdersByParty = async (partyId, partyType = 'CUSTOMER') => {
  let clause, param;
  if (partyType === 'CUSTOMER') {
    clause = "customer_id = $1";
    param = partyId;
  } else {
    clause = "dealer_id = $1";
    param = partyId;
  }

  const query = `
    SELECT sales_order_id, sales_order_code, grand_total, payment_terms, 
           shipping_address, billing_address, tax_type, status
    FROM sales_order_master
    WHERE status != 'CANCELLED' AND ${clause}
    ORDER BY order_date DESC;
  `;
  const { rows } = await pool.query(query, [param]);
  return rows;
};



// Get All Inventory with a quantity greater than 0 and that is available for sale.
export const getAllAvailableItemsforSell = async (locationId) => {
  const result = await pool.query(
    `SELECT 
      i.product_id AS "productId", 
      p.product_name AS "productName", 
      p.product_code AS "productCode",
      p.unit AS "uom",
      p.serial_no_applicable AS "serialNoApplicable",
      p.is_final_veichle AS "isFinalVeichle",
      p.unit_price AS "unitPrice",
      i.location_id AS "locationId", 
      l.location_name AS "locationName", 
      i.quantity AS "availableQuantity",
      p.gst_percentage AS "gstPercentage",
      p.hsn_code AS "hsnCode",
      p.brand AS "brand"
      FROM inventory_stock i
      JOIN product_master p ON i.product_id = p.product_id
      JOIN location_master l ON i.location_id = l.location_id
      WHERE i.quantity > 0 AND p.is_available_for_sale = true AND i.location_id = $1
      ORDER BY p.product_name, l.location_name`,
    [locationId]
  );
  return result.rows;
};






export const getOrdersWithPayments = async (customerId, dealerId, startDate, endDate) => {

  // Calculate current FY if dates not provided
  if (!startDate || !endDate) {
    const today = dayjs();
    const currentYear = today.year();

    if (today.month() + 1 >= 4) { // April or later
      startDate = dayjs(`${currentYear}-04-01`).format('YYYY-MM-DD');
      endDate = dayjs(`${currentYear + 1}-03-31`).format('YYYY-MM-DD');
    } else { // Before April → last FY
      startDate = dayjs(`${currentYear - 1}-04-01`).format('YYYY-MM-DD');
      endDate = dayjs(`${currentYear}-03-31`).format('YYYY-MM-DD');
    }
  }

  // Query DB
  const query = `
    SELECT 
      som.sales_order_id,
      som.sales_order_code,
      som.order_date,
      som.order_type,
      som.grand_total,
      som.payment_status,
      COALESCE(SUM(spt.payment_amount), 0) AS total_paid,
      json_agg(
        json_build_object(
          'payment_id', spt.payment_id,
          'payment_date', spt.payment_date,
          'payment_amount', spt.payment_amount,
          'payment_mode', spt.payment_mode,
          'transaction_reference', spt.transaction_reference,
          'payment_notes', spt.payment_notes,
          'payment_received_account_no', spt.payment_received_account_no
        )
        ORDER BY spt.payment_date
      ) FILTER (WHERE spt.payment_id IS NOT NULL) AS payment_details
    FROM sales_order_master som
    LEFT JOIN sales_payment_tracking_master spt 
      ON som.sales_order_id = spt.sales_order_id
    WHERE som.status = $5 AND som.order_date BETWEEN $1 AND $2
      AND (
        ($3::INT IS NOT NULL AND som.customer_id = $3) OR
        ($4::INT IS NOT NULL AND som.dealer_id = $4)
      )
    GROUP BY som.sales_order_id, som.sales_order_code, som.order_date, som.order_type, som.grand_total, som.payment_status
    ORDER BY som.order_date DESC;
  `;

  // console.log(query, startDate,
  //   endDate,
  //   customerId ,
  //   dealerId)

  const { rows } = await pool.query(query, [
    startDate,
    endDate,
    customerId || null,
    dealerId || null,
    'CONFIRMED'
  ]);

  return {
    startDate,
    endDate,
    orders: rows
  };
};




// Get Day-wise Sales Report for a Month (with location + dealer details)
export const getMonthlySalesReport = async (year, month) => {
  const query = `
    SELECT 
      som.order_date::date AS sales_date,
      sp.location_name,
      d.dealer_name,
      som.sales_order_code,
      COUNT(som.sales_order_id) AS total_orders,
      SUM(som.subtotal) AS total_subtotal,
      SUM(som.total_tax) AS total_tax,
      SUM(som.grand_total) AS total_sales
    FROM sales_order_master som
    LEFT JOIN dealer_master d 
      ON som.dealer_id = d.dealer_id
    LEFT JOIN location_master sp 
      ON som.sales_point_location_id = sp.location_id
    WHERE som.status != 'CANCELLED' AND EXTRACT(YEAR FROM som.order_date) = $1
      AND EXTRACT(MONTH FROM som.order_date) = $2
    GROUP BY som.order_date, sp.location_name, d.dealer_name,  som.sales_order_code
    ORDER BY som.order_date, sp.location_name, d.dealer_name,  som.sales_order_code;
  `;

  const params = [year, month]; // e.g. (2025, 3) for March 2025
  const { rows } = await pool.query(query, params);
  return rows;
};



// Get Financial Year Sales Report (Month-wise with CGST & SGST)
export const getYearlySalesReport = async (year) => {
  // Financial year in India: April (year) → March (year+1)
  const startDate = `${year}-04-01`;   // e.g. 2025-04-01
  const endDate = `${parseInt(year) + 1}-03-31`; // 2026-03-31

  const query = `
    SELECT 
      TO_CHAR(som.order_date, 'Mon') AS month_name,
      EXTRACT(MONTH FROM som.order_date) AS month_number,
      COUNT(DISTINCT som.sales_order_id) AS total_orders,
      SUM(som.subtotal) AS total_subtotal,
      SUM(som.cgst_amount) AS total_cgst,
      SUM(som.sgst_amount) AS total_sgst,
      SUM(som.igst_amount) AS total_igst,
      SUM(som.total_tax)   AS total_tax,
      SUM(som.grand_total) AS total_sales
    FROM sales_order_master som
    WHERE som.status != 'CANCELLED' AND som.order_date BETWEEN $1 AND $2
    GROUP BY month_number, month_name
    ORDER BY month_number;
  `;

  const params = [startDate, endDate];
  const { rows } = await pool.query(query, params);

  return rows;
};



export const cancelSalesOrder = async (salesOrderId, cancelledBy, cancellationReason = "Cancelled by user") => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get sales order details
    const { rows: order } = await client.query(
      `SELECT sales_order_code, sales_point_location_id 
       FROM sales_order_master 
       WHERE sales_order_id = $1`,
      [salesOrderId]
    );
    if (order.length === 0) throw new Error("Sales order not found");
    const { sales_order_code, sales_point_location_id } = order[0];

    // 2. Get items to restore stock
    const { rows: items } = await client.query(
      `SELECT product_id, quantity, serial_no
       FROM sales_order_item 
       WHERE sales_order_id = $1`,
      [salesOrderId]
    );


    for (const item of items) {
      // 3. Restore stock
      await client.query(
        `UPDATE inventory_stock
         SET quantity = quantity + $1,
             last_update_ref = $4
         WHERE product_id = $2 AND location_id = $3`,
        [item.quantity, item.product_id, sales_point_location_id, `SO-CANCEL-${sales_order_code}`]
      );

      // 4. Restore serial numbers if applicable
      if (item.serial_no ) {
        let serialNumbers = [];

        if (typeof item.serial_no === "string" && item.serial_no.trim() !== "") {
          serialNumbers = item.serial_no
            .split(",")               // split by comma
            .map(s => s.trim())       // remove extra spaces
            .filter(Boolean) || [];         // remove empty entries
        }

        if(serialNumbers?.length > 0){
          await client.query(
            `UPDATE product_serials
          SET status = 'in_stock',
              last_updated = NOW(),
              modified_by = $2
          WHERE serial_number = ANY($1::text[])`,
            [serialNumbers, cancelledBy]
          );
        }

        
      }
    }

    // 5. Delete order items
    // await client.query(
    //   `DELETE FROM sales_order_item WHERE sales_order_id = $1`,
    //   [salesOrderId]
    // );

    // 6. Update master status
    await client.query(
      `UPDATE sales_order_master
       SET status = 'CANCELLED',
           cancellation_reason = $2,
           cancelled_at = NOW(),
           updated_by = $3,
           updated_at = NOW()
       WHERE sales_order_id = $1`,
      [salesOrderId, cancellationReason, cancelledBy]
    );

    await client.query("COMMIT");
    return { success: true, cancelled: true, salesOrderId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
