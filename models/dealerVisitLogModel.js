import pool from "../configs/db.js";
import dayjs from "dayjs";

/**
 * Save a dealer visit log
 * @param {Object} visitData - Data for the visit
 * @param {number} visitData.salesmanId - ID of the salesman (required)
 * @param {number|null} visitData.dealerId - Dealer ID (null if new dealer)
 * @param {boolean} visitData.isNewDealer - True if visiting a new dealer
 * @param {string|null} visitData.newDealerDetails - Description if new dealer
 * @param {string} visitData.activitiesDone - Notes on activities done (required)
 * @param {number|null} visitData.locationLat - Latitude
 * @param {number|null} visitData.locationLng - Longitude
 * @param {string|null} visitData.locationAddress - Reverse geocoded address
 * @param {string} visitData.outcomeDetails - Outcome notes (required)
 */
export const saveDealerVisitLog = async (visitData) => {
  const {
    salesmanId,
    dealerId,
    isNewDealer,
    newDealerDetails,
    activitiesDone,
    locationLat,
    locationLng,
    locationAddress,
    outcomeDetails
  } = visitData;

  const query = `
    INSERT INTO dealer_visit_log (
      salesman_id,
      dealer_id,
      is_new_dealer,
      new_dealer_details,
      activities_done,
      location_lat,
      location_lng,
      location_address,
      outcome_details
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING visit_id, created_at;
  `;

  const values = [
    salesmanId,
    dealerId || null,
    isNewDealer,
    newDealerDetails || null,
    activitiesDone,
    locationLat || null,
    locationLng || null,
    locationAddress || null,
    outcomeDetails
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};



export const listDealerVisitLogs = async ({ salesmanId, dealerId, startDate, endDate }) => {
  let query = `
    SELECT 
      dvl.visit_id,
      dvl.salesman_id,
      um.first_name AS salesman_name,
      um.login_id AS salesman_login_id,
      dvl.dealer_id,
      dm.dealer_name,
      dvl.is_new_dealer,
      dvl.new_dealer_details,
      dvl.activities_done,
      dvl.location_lat,
      dvl.location_lng,
      dvl.location_address,
      dvl.outcome_details,
      dvl.created_at
    FROM dealer_visit_log dvl
    LEFT JOIN users um ON um.user_id = dvl.salesman_id
    LEFT JOIN dealer_master dm ON dm.dealer_id = dvl.dealer_id
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (salesmanId) {
    query += ` AND dvl.salesman_id = $${paramIndex++}`;
    params.push(salesmanId);
  }

  if (dealerId) {
    query += ` AND dvl.dealer_id = $${paramIndex++}`;
    params.push(dealerId);
  }

  // Date filter
  if (!startDate && !endDate) {
    // Default to today's logs
    startDate = dayjs().startOf("day").format("YYYY-MM-DD");
    endDate = dayjs().endOf("day").format("YYYY-MM-DD");
  } else if (startDate && !endDate) {
    endDate = startDate; // same day
  } else if (!startDate && endDate) {
    startDate = endDate; // same day
  }

  if (startDate && endDate) {
    query += ` AND dvl.created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    params.push(startDate, endDate);
  }

  query += ` ORDER BY dvl.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};
