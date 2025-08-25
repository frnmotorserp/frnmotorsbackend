import pool from "../configs/db.js";

// Get All Customers
export const getAllCustomers = async () => {
  const query = `
    SELECT 
      customer_id AS "customerId",
      customer_code AS "customerCode",
      customer_name AS "customerName",
      phone,
      email,
      gstin,
      aadhar,
      pan,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM customer_master
    ORDER BY customer_name;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Save or Update Customer
export const saveOrUpdateCustomer = async (customerDTO) => {
  const client = await pool.connect();
  try {
    const {
      customerId,
      customerCode,
      customerName,
      customerType,
      phone,
      email,
      gstin,
      pan,
      aadhar,
      addressline1,
      addressline2,
      city,
      district ,
      state,
      pincode,
      country = 'India',
      status = true,
    } = customerDTO;
    console.log("customerDTO", customerDTO)

    const timestamp = new Date();
    await client.query('BEGIN');

 const duplicateCheck = `
  SELECT 1 FROM customer_master
  WHERE customer_code = $1
  ${customerId ? 'AND customer_id != $2' : ''}
  LIMIT 1;
`;

const dupParams = customerId ? [customerCode, customerId] : [customerCode];
const dupResult = await client.query(duplicateCheck, dupParams);
    if (dupResult.rowCount > 0) throw new Error("Customer code or name already exists.");

    let savedCustomerId = customerId;

    if (customerId) {
      await client.query(`
        UPDATE customer_master
        SET customer_code = $1, customer_name = $2, 
            phone = $3, email = $4, gstin = $5, pan = $6, status = $7, updated_at = $8, aadhar = $10
        WHERE customer_id = $9
      `, [customerCode, customerName,  phone, email, gstin, pan, status, timestamp, customerId, aadhar]);
    } else {
      const insertResult = await client.query(`
        INSERT INTO customer_master
        (customer_code, customer_name,  phone, email, gstin, pan, status, created_at, updated_at, aadhar)
        VALUES ($1,$2, $3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING customer_id
      `, [customerCode, customerName, phone, email, gstin, pan, status, timestamp, timestamp, aadhar]);

      savedCustomerId = insertResult.rows[0].customer_id;
    }

    await client.query('COMMIT');
    return { success: true, customerId: savedCustomerId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
