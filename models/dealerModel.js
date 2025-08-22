import pool from "../configs/db.js";

// Get All Dealers with details
export const getAllDealers = async () => {
  const query = `
    SELECT 
      dm.dealer_id AS "dealerId",
      dm.dealer_code AS "dealerCode",
      dm.dealer_name AS "dealerName",
      dm.dealer_type AS "dealerType",
      dm.reporting_to_user_id AS "reportingToUserId",
      dm.gstin,
      dm.pan,
      dm.email,
      dm.phone,
      dm.website,
      dm.status,
      dm.created_at AS "createdAt",
      dm.updated_at AS "updatedAt",

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'addressId', da.address_id,
            'addressType', da.address_type,
            'addressLine1', da.address_line1,
            'addressLine2', da.address_line2,
            'city', da.city,
            'state', da.state,
            'stateName', da.state_name,
            'district', da.district,
            'pincode', da.pincode,
            'country', da.country,
            'isPrimary', da.is_primary
          )
        ) FILTER (WHERE da.address_id IS NOT NULL), '[]'
      ) AS "addresses",

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'contactId', dc.contact_id,
            'contactName', dc.contact_name,
            'designation', dc.designation,
            'email', dc.email,
            'phone', dc.phone,
            'isPrimary', dc.is_primary
          )
        ) FILTER (WHERE dc.contact_id IS NOT NULL), '[]'
      ) AS "contacts",

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'bankId', db.bank_id,
            'accountHolderName', db.account_holder_name,
            'accountNumber', db.account_number,
            'ifscCode', db.ifsc_code,
            'bankName', db.bank_name,
            'branchName', db.branch_name,
            'isPrimary', db.is_primary
          )
        ) FILTER (WHERE db.bank_id IS NOT NULL), '[]'
      ) AS "bankDetails"

    FROM dealer_master dm
    LEFT JOIN dealer_address da ON dm.dealer_id = da.dealer_id
    LEFT JOIN dealer_contact dc ON dm.dealer_id = dc.dealer_id
    LEFT JOIN dealer_bank_details db ON dm.dealer_id = db.dealer_id
    GROUP BY dm.dealer_id
    ORDER BY dm.dealer_name;
  `;
  const { rows } = await pool.query(query);
  return rows;
};


// Save or Update Dealer
export const saveOrUpdateDealer = async (dealerDTO) => {
  const client = await pool.connect();
  try {
    const {
      dealerId,
      dealerCode,
      dealerName,
      dealerType,
      gstin,
      pan,
      email,
      phone,
      website,
      reportingToUserId,
      status = true,
      userId,
      addresses = [],
      contacts = [],
      bankDetails = []
    } = dealerDTO;

    const timestamp = new Date();
    await client.query('BEGIN');

    const duplicateQuery = `
      SELECT 1 FROM dealer_master WHERE (dealer_code = $1 OR dealer_name = $2)
      ${dealerId ? 'AND dealer_id != $3' : ''} LIMIT 1;
    `;
    const dupParams = dealerId ? [dealerCode, dealerName, dealerId] : [dealerCode, dealerName];
    const dupResult = await client.query(duplicateQuery, dupParams);
    if (dupResult.rowCount > 0) throw new Error("Dealer code or name already exists.");

    let savedDealerId = dealerId;

    if (dealerId) {
      await client.query(`
        UPDATE dealer_master
        SET dealer_code = $1, dealer_name = $2, dealer_type = $3, gstin = $4,
            pan = $5, email = $6, phone = $7, website = $8, status = $9,
            reporting_to_user_id = $10, updated_at = $11
        WHERE dealer_id = $12
      `, [dealerCode, dealerName, dealerType, gstin, pan, email, phone, website, status, reportingToUserId, timestamp, dealerId]);
    } else {
      const insertResult = await client.query(`
        INSERT INTO dealer_master
        (dealer_code, dealer_name, dealer_type, gstin, pan, email, phone, website, status, reporting_to_user_id, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING dealer_id
      `, [dealerCode, dealerName, dealerType, gstin, pan, email, phone, website, status, reportingToUserId, timestamp, timestamp]);

      savedDealerId = insertResult.rows[0].dealer_id;
    }

    await client.query(`DELETE FROM dealer_contact WHERE dealer_id = $1`, [savedDealerId]);
    await client.query(`DELETE FROM dealer_bank_details WHERE dealer_id = $1`, [savedDealerId]);

    const { rows: existingAddresses } = await client.query(
      `SELECT address_id FROM dealer_address WHERE dealer_id = $1`,
      [savedDealerId]
    );
    const existingAddressIds = existingAddresses.map(row => row.address_id);
    const submittedAddressIds = [];

    for (const addr of addresses) {
      if (addr.addressId) {
        submittedAddressIds.push(addr.addressId);
        await client.query(`
          UPDATE dealer_address
          SET address_type = $1, address_line1 = $2, address_line2 = $3, city = $4, state = $5,
              state_name = $6, district = $7, pincode = $8, country = $9, is_primary = $10
          WHERE address_id = $11 AND dealer_id = $12
        `, [
          addr.addressType,
          addr.addressLine1,
          addr.addressLine2,
          addr.city,
          addr.state,
          addr.stateName,
          addr.district,
          addr.pincode,
          addr.country || 'India',
          addr.isPrimary || false,
          addr.addressId,
          savedDealerId
        ]);
      } else {
        await client.query(`
          INSERT INTO dealer_address
          (dealer_id, address_type, address_line1, address_line2, city, state, state_name, district, pincode, country, is_primary)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
          savedDealerId,
          addr.addressType,
          addr.addressLine1,
          addr.addressLine2,
          addr.city,
          addr.state,
          addr.stateName,
          addr.district,
          addr.pincode,
          addr.country || 'India',
          addr.isPrimary || false
        ]);
      }
    }

    const addressIdsToDelete = existingAddressIds.filter(id => !submittedAddressIds.includes(id));
    if (addressIdsToDelete.length > 0) {
      await client.query(`
        DELETE FROM dealer_address
        WHERE dealer_id = $1 AND address_id = ANY($2::int[])
      `, [savedDealerId, addressIdsToDelete]);
    }

    for (const contact of contacts) {
      await client.query(`
        INSERT INTO dealer_contact
        (dealer_id, contact_name, designation, email, phone, is_primary)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [savedDealerId, contact.contactName, contact.designation, contact.email, contact.phone, contact.isPrimary]);
    }

    for (const bank of bankDetails) {
      await client.query(`
        INSERT INTO dealer_bank_details
        (dealer_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name, is_primary)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [savedDealerId, bank.accountHolderName, bank.accountNumber, bank.ifscCode, bank.bankName, bank.branchName, bank.isPrimary]);
    }

    await client.query('COMMIT');
    return { success: true, dealerId: savedDealerId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


export const getDealersByReportingUser = async (reportingToUserId) => {
  let query = `
    SELECT 
      dealer_id AS "dealerId",
      dealer_code AS "dealerCode",
      dealer_name AS "dealerName",
      status AS "status"
    FROM dealer_master
    
  `;

  const params = [];

  if (reportingToUserId) {
    query += ` WHERE reporting_to_user_id = $1`;
    params.push(reportingToUserId);
  }

  query += ` ORDER BY dealer_name`;
  console.log()

  const { rows } = await pool.query(query, params);
  return rows;
};
