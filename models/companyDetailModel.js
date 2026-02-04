import pool from "../configs/db.js";
/**
 * Fetches all records from the 'company_details' table.
 * Maps snake_case database column names to camelCase for JavaScript consumption.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of company detail objects.
 */
export const getAllCompanyDetails = async () => {
  const query = `
    SELECT
      company_id AS "companyId",
      gstin,
      business_name AS "businessName",
      address,
      pincode,
      contact,
      email,
      state_id AS "stateId",
      entity_type AS "entityType",
      registration_type AS "registrationType",
      department_code_type AS "departmentCodeType",
      nature_of_business AS "natureOfBusiness",
      registration_date AS "registrationDate",
      status, -- Boolean values are usually mapped directly by Node.js drivers
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM company_details WHERE is_active = TRUE
    ORDER BY business_name; -- Ordering by business name for consistent listing
  `;

  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("Error fetching all company details:", error);
    throw error; // Re-throw to be handled by the calling component/service
  }
};
