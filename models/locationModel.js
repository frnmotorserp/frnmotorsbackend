import pool from "../configs/db.js";

export const getAllStates = async () => {
  const query = `SELECT state_id, state_name FROM state_master ORDER BY state_name`;
  const { rows } = await pool.query(query);
  return rows;
};

export const getAllDistricts = async () => {
  const query = `SELECT district_id, district_name, state_id FROM district_master ORDER BY district_name`;
  const { rows } = await pool.query(query);
  return rows;
};

// Save or Update District
export const saveOrUpdateDistrict = async (districtId, stateId, districtName) => {
  if (districtId) {
    // UPDATE if districtId exists
    const updateQuery = `
      UPDATE district_master
      SET state_id = $1,
          district_name = $2
      WHERE district_id = $3
      RETURNING district_id, district_name, state_id
    `;
    const { rows } = await pool.query(updateQuery, [stateId, districtName, districtId]);
    return rows[0];
  } else {
    // INSERT if districtId is not provided
    const insertQuery = `
      INSERT INTO district_master (state_id, district_name)
      VALUES ($1, $2)
      RETURNING district_id, district_name, state_id
    `;
    const { rows } = await pool.query(insertQuery, [stateId, districtName]);
    return rows[0];
  }
};

export const getAllLocationTypes = async () => {
  const query = `
    SELECT 
      location_type_id AS "locationTypeId", 
      location_type_name AS "locationTypeName", 
      description, 
      active_flag AS "activeFlag" 
    FROM location_type_master
    ORDER BY location_type_name;
  `;
  
  const { rows } = await pool.query(query);
  return rows;
};


export const saveOrUpdateLocationTypeModel = async (locationTypeDTO) => {
  const { locationTypeId, locationTypeName, description, activeFlag, userId } = locationTypeDTO;
  const timestamp = new Date();

  if (!locationTypeName || !userId) {
    throw new Error('Location Type Name and User ID are required.');
  }

  if (locationTypeId && locationTypeId > 0) {
    const updateQuery = `
      UPDATE location_type_master
      SET 
        location_type_name = $1,
        description = $2,
        active_flag = $3,
        updated_by = $4,
        updated_at = $5
      WHERE location_type_id = $6
      RETURNING location_type_id AS "locationTypeId";
    `;
    const updateParams = [
      locationTypeName,
      description,
      activeFlag || 'Y',
      userId,
      timestamp,
      locationTypeId
    ];
    const { rows } = await pool.query(updateQuery, updateParams);
    return { isUpdate: true, updatedId: rows[0]?.locationTypeId || null };

  } else {
    const insertQuery = `
      INSERT INTO location_type_master 
        (location_type_name, description, active_flag, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING location_type_id AS "locationTypeId";
    `;
    const insertParams = [
      locationTypeName,
      description,
      activeFlag || 'Y',
      userId,
      timestamp
    ];
    const { rows } = await pool.query(insertQuery, insertParams);
    return { isInsert: true, insertedId: rows[0]?.locationTypeId || null };
  }
};


export const getAllLocations = async () => {
  const query = `
    SELECT 
      lm.location_id AS "locationId",
      lm.location_name AS "locationName",
      lm.address,
      lm.state_id AS "stateId",
      sm.state_name AS "stateName",
      lm.district_id AS "districtId",
      dm.district_name AS "districtName",
      lm.pincode,
      lm.active_flag AS "activeFlag",
      lm.created_by AS "createdBy",
      lm.created_at AS "createdAt",
      lm.updated_by AS "updatedBy",
      lm.updated_at AS "updatedAt",
      ARRAY_AGG(ltm.location_type_id) AS "locationTypeIds",
      ARRAY_AGG(ltm.location_type_name) AS "locationTypeNames"
    FROM location_master lm
    JOIN state_master sm ON sm.state_id = lm.state_id
    JOIN district_master dm ON dm.district_id = lm.district_id
    LEFT JOIN location_type_mapping ltmmap ON ltmmap.location_id = lm.location_id
    LEFT JOIN location_type_master ltm ON ltm.location_type_id = ltmmap.location_type_id
    GROUP BY lm.location_id, sm.state_name, dm.district_name
    ORDER BY lm.location_name;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Save or update location with type mapping
export const saveOrUpdateLocation = async (locationDTO) => {
  const {
    locationId,
    locationName,
    address,
    stateId,
    districtId,
    pincode,
    locationTypeIds = [],
    activeFlag = 'Y',
    userId
  } = locationDTO;

  const timestamp = new Date();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let locId;
    if (locationId && locationId > 0) {
      // UPDATE
      const updateQuery = `
        UPDATE location_master SET
          location_name = $1,
          address = $2,
          state_id = $3,
          district_id = $4,
          pincode = $5,
          updated_by = $6,
          updated_at = $7,
          active_flag = $8
        WHERE location_id = $9
        RETURNING location_id;
      `;
      const { rows } = await client.query(updateQuery, [
        locationName, address, stateId, districtId, pincode,
        userId, timestamp, activeFlag, locationId
      ]);
      locId = rows[0].location_id;

      // Clear old mappings
      await client.query('DELETE FROM location_type_mapping WHERE location_id = $1', [locId]);

    } else {
      // INSERT
      const insertQuery = `
        INSERT INTO location_master 
          (location_name, address, state_id, district_id, pincode, active_flag, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING location_id;
      `;
      const { rows } = await client.query(insertQuery, [
        locationName, address, stateId, districtId, pincode,
        activeFlag, userId, timestamp
      ]);
      locId = rows[0].location_id;
    }

    // Insert new type mappings
    for (const typeId of locationTypeIds) {
      await client.query(
        `INSERT INTO location_type_mapping (location_id, location_type_id) VALUES ($1, $2)`,
        [locId, typeId]
      );
    }

    await client.query('COMMIT');
    return { success: true, locationId: locId };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};



export const getAllUserLocationMappings = async () => {
  const query = `
    SELECT 
      u.user_id,
      u.login_id,
      u.first_name,
      u.middle_name,
      u.last_name,
      u.primary_mobile,
      ARRAY_AGG(lm.location_name) AS locations
    FROM user_location_mapping ulm
    JOIN users u ON u.user_id = ulm.user_id
    JOIN location_master lm ON lm.location_id = ulm.location_id
    WHERE ulm.active_flag = 'Y'
    GROUP BY u.user_id, u.login_id, u.first_name, u.middle_name, u.last_name, u.primary_mobile
    ORDER BY u.first_name;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Save or update user-location mapping
export const saveOrUpdateUserLocationMapping = async (userId, locationIds, assignedBy) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deactivate existing mappings
    await client.query(
      `UPDATE user_location_mapping 
       SET active_flag = 'N', updated_by = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2`,
      [assignedBy, userId]
    );

    // Insert new mappings
    for (let locationId of locationIds) {
      await client.query(
        `INSERT INTO user_location_mapping 
         (user_id, location_id, active_flag, assigned_by, assigned_at, created_by, created_at, updated_by, updated_at)
         VALUES ($1, $2, 'Y', $3, CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, location_id) DO UPDATE 
         SET active_flag = 'Y', 
             updated_by = EXCLUDED.updated_by, 
             updated_at = EXCLUDED.updated_at`,
        [userId, locationId, assignedBy]
      );
    }

    await client.query('COMMIT');
    return { userId, locationIds, assignedBy };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving user-location mapping:', error);
    throw error;
  } finally {
    client.release();
  }
};