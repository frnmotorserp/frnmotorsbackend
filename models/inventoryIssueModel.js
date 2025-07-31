import pool from '../configs/db.js';

// Create a new issue entry
export const createInventoryIssue = async (issueData, issueItems, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert into inventory_issue
    const issueResult = await client.query(
      `INSERT INTO inventory_issue (issue_number, issue_date, location_id, issued_to, remarks)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING issue_id`,
      [
        issueData.issueNumber,
        issueData.issueDate,
        issueData.locationId,
        issueData.issuedTo,
        issueData.remarks || null,
      ]
    );

    const issueId = issueResult.rows[0].issue_id;

    // Insert issue items
    for (const item of issueItems) {
      await client.query(
        `INSERT INTO inventory_issue_item (issue_id, product_id, quantity_issued, location_id, created_by )
         VALUES ($1, $2, $3, $4, $5)`,
        [issueId, item.productId, item.quantityIssued, item.locationId, userId]
      );


        await client.query(`
        INSERT INTO inventory_stock (
          product_id, location_id, quantity, last_update_ref
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET
          quantity = inventory_stock.quantity - EXCLUDED.quantity,
          last_update_ref = EXCLUDED.last_update_ref;
      `, [
         item.productId,
        item.locationId,
        item.quantityIssued,
        `INVISSUE#${issueData.remarks || ''}`
      ]);

      const serialNumbersRemove = item.serialNumbersRemove || []

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
    return { success: true, issue_id: issueId };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating inventory issue:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Fetch all inventory issue records (with optional filters later)
export const getAllInventoryIssues = async (startDate = null, endDate = null) => {
  let query = `
    SELECT 
      ii.issue_id, ii.issue_number, ii.issue_date, ii.issued_to, ii.remarks,
      ii.location_id, l.location_name,
      ii.created_at,
      array_agg(json_build_object(
        'issue_item_id', iit.issue_item_id,
        'product_id', iit.product_id,
        'product_name', p.product_name,
        'quantity_issued', iit.quantity_issued
      )) AS items
    FROM inventory_issue ii
    JOIN location_master l ON ii.location_id = l.location_id
    JOIN inventory_issue_item iit ON ii.issue_id = iit.issue_id
    JOIN product_master p ON iit.product_id = p.product_id
  `;

  const values = [];
  if (startDate && endDate) {
    query += ` WHERE ii.issue_date BETWEEN $1 AND $2`;
    values.push(startDate, endDate);
  }

  query += `
    GROUP BY ii.issue_id, l.location_name
    ORDER BY ii.issue_date DESC, ii.issue_id DESC
  `;

  const result = await pool.query(query, values);
  return result.rows;
};


// Get a single issue by ID
export const getInventoryIssueById = async (issueId) => {
  const result = await pool.query(
    `SELECT 
       ii.issue_id, ii.issue_number, ii.issue_date, ii.issued_to, ii.remarks,
       ii.location_id, l.location_name,
       ii.created_at,
       array_agg(json_build_object(
         'issue_item_id', iit.issue_item_id,
         'product_id', iit.product_id,
         'product_name', p.product_name,
         'quantity_issued', iit.quantity_issued
       )) AS items
     FROM inventory_issue ii
     JOIN location_master l ON ii.location_id = l.location_id
     JOIN inventory_issue_item iit ON ii.issue_id = iit.issue_id
     JOIN product_master p ON iit.product_id = p.product_id
     WHERE ii.issue_id = $1
     GROUP BY ii.issue_id, l.location_name`,
    [issueId]
  );
  return result.rows[0];
};
