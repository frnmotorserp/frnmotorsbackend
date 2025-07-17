import pool from "../configs/db.js";

// Get All Vendors with details
export const getAllVendors = async () => {
  const query = `
    SELECT 
      vm.vendor_id AS "vendorId",
      vm.vendor_code AS "vendorCode",
      vm.vendor_name AS "vendorName",
      vm.vendor_type AS "vendorType",
      vm.gstin,
      vm.pan,
      vm.email,
      vm.phone,
      vm.website,
      vm.status,
      vm.created_at AS "createdAt",
      vm.updated_at AS "updatedAt",

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'addressId', va.address_id,
            'addressType', va.address_type,
            'addressLine1', va.address_line1,
            'addressLine2', va.address_line2,
            'city', va.city,
            'state', va.state,
            'stateName', va.state_name,
            'district', va.district,
            'pincode', va.pincode,
            'country', va.country,
            'isPrimary', va.is_primary
          )
        ) FILTER (WHERE va.address_id IS NOT NULL), '[]'
      ) AS "addresses",

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'contactId', vc.contact_id,
            'contactName', vc.contact_name,
            'designation', vc.designation,
            'email', vc.email,
            'phone', vc.phone,
            'isPrimary', vc.is_primary
          )
        ) FILTER (WHERE vc.contact_id IS NOT NULL), '[]'
      ) AS "contacts",

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'bankId', vb.bank_id,
            'accountHolderName', vb.account_holder_name,
            'accountNumber', vb.account_number,
            'ifscCode', vb.ifsc_code,
            'bankName', vb.bank_name,
            'branchName', vb.branch_name,
            'isPrimary', vb.is_primary
          )
        ) FILTER (WHERE vb.bank_id IS NOT NULL), '[]'
      ) AS "bankDetails"

    FROM vendor_master vm
    LEFT JOIN vendor_address va ON vm.vendor_id = va.vendor_id
    LEFT JOIN vendor_contact vc ON vm.vendor_id = vc.vendor_id
    LEFT JOIN vendor_bank_details vb ON vm.vendor_id = vb.vendor_id
    GROUP BY vm.vendor_id
    ORDER BY vm.vendor_name;
  `;
  const { rows } = await pool.query(query);
  return rows;
};


export const saveOrUpdateVendor = async (vendorDTO) => {
  const client = await pool.connect();
  try {
    const {
      vendorId,
      vendorCode,
      vendorName,
      vendorType,
      gstin,
      pan,
      email,
      phone,
      website,
      status = true,
      userId,
      addresses = [],
      contacts = [],
      bankDetails = []
    } = vendorDTO;

    const timestamp = new Date();
    await client.query('BEGIN');

    const duplicateQuery = `
      SELECT 1 FROM vendor_master WHERE (vendor_code = $1 OR vendor_name = $2)
      ${vendorId ? 'AND vendor_id != $3' : ''} LIMIT 1;
    `;
    const dupParams = vendorId ? [vendorCode, vendorName, vendorId] : [vendorCode, vendorName];
    const dupResult = await client.query(duplicateQuery, dupParams);
    if (dupResult.rowCount > 0) throw new Error("Vendor code or name already exists.");

    let savedVendorId = vendorId;

    if (vendorId) {
      await client.query(`
        UPDATE vendor_master
        SET vendor_code = $1, vendor_name = $2, vendor_type = $3, gstin = $4,
            pan = $5, email = $6, phone = $7, website = $8, status = $9,
            updated_at = $10
        WHERE vendor_id = $11
      `, [vendorCode, vendorName, vendorType, gstin, pan, email, phone, website, status, timestamp, vendorId]);
    } else {
      const insertResult = await client.query(`
        INSERT INTO vendor_master
        (vendor_code, vendor_name, vendor_type, gstin, pan, email, phone, website, status, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING vendor_id
      `, [vendorCode, vendorName, vendorType, gstin, pan, email, phone, website, status, timestamp, timestamp]);

      savedVendorId = insertResult.rows[0].vendor_id;
    }

    // Clean and re-insert details
    await client.query(`DELETE FROM vendor_address WHERE vendor_id = $1`, [savedVendorId]);
    await client.query(`DELETE FROM vendor_contact WHERE vendor_id = $1`, [savedVendorId]);
    await client.query(`DELETE FROM vendor_bank_details WHERE vendor_id = $1`, [savedVendorId]);

    for (const addr of addresses) {
      await client.query(`
        INSERT INTO vendor_address
        (vendor_id, address_type, address_line1, address_line2, city, state, district, pincode, country, is_primary, state_name)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [savedVendorId, addr.addressType, addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.district, addr.pincode, addr.country, addr.isPrimary, addr.stateName]);
    }

    for (const contact of contacts) {
      await client.query(`
        INSERT INTO vendor_contact
        (vendor_id, contact_name, designation, email, phone, is_primary)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [savedVendorId, contact.contactName, contact.designation, contact.email, contact.phone, contact.isPrimary]);
    }

    for (const bank of bankDetails) {
      await client.query(`
        INSERT INTO vendor_bank_details
        (vendor_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name, is_primary)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [savedVendorId, bank.accountHolderName, bank.accountNumber, bank.ifscCode, bank.bankName, bank.branchName, bank.isPrimary]);
    }

    await client.query('COMMIT');
    return { success: true, vendorId: savedVendorId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
