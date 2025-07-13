import pool from "../configs/db.js";

export const getAllFunctions = async () => {
  const query = `
    SELECT 
      fm.function_master_id AS "mainFunctionId",
      fm.function_name AS "mainFunctionName",
      fm.function_short_name AS "mainFunctionShortName",
      fm.function_master_id AS "mainFunctionSortOrder",  -- or add actual sort_order column if you have
      sfm.sub_function_master_id AS "subFunctionId",
      sfm.sub_function_name AS "subFunctionName",
      sfm.sub_function_short_name AS "subFunctionShortName",
      sfm.sub_function_master_id AS "subFunctionSortOrder"  -- or add actual sort_order column if you have
    FROM function_master fm
    LEFT JOIN sub_function_master sfm ON sfm.function_master_id = fm.function_master_id
    ORDER BY fm.function_master_id, sfm.sub_function_master_id;
  `;

  const result = await pool.query(query);
  return result.rows;
};



export const getFullMenuAccess = async () => {
  // 1. Get all main functions
  const mainFunctionsQuery = `
    SELECT function_master_id, function_short_name, COALESCE(main_sort_order, 0) AS main_sort_order
    FROM function_master
    ORDER BY main_sort_order
  `;
  const { rows: mainFunctions } = await pool.query(mainFunctionsQuery);

  const result = [];

  for (const mainFunc of mainFunctions) {
    // 2. For each main function, get subfunctions and their access types
    const subFunctionsQuery = `
      SELECT 
        sf.sub_function_master_id,
        sf.sub_function_short_name,
        sf.sub_sort_order,
        COALESCE(json_agg(DISTINCT a.access_type) FILTER (WHERE a.access_type IS NOT NULL), '[]') AS access_types
      FROM sub_function_master sf
      LEFT JOIN role_function_access_map rfam ON sf.sub_function_master_id = rfam.sub_function_master_id
      LEFT JOIN access_master a ON rfam.access_type_id = a.access_type_id
      WHERE sf.function_master_id = $1
      GROUP BY sf.sub_function_master_id
      ORDER BY sf.sub_sort_order NULLS LAST
    `;
    const { rows: subFunctions } = await pool.query(subFunctionsQuery, [mainFunc.function_master_id]);

    const subMenuDetailList = subFunctions.map(sub => ({
      subFunctionMasterId: sub.sub_function_master_id,
      subFunctionShortName: sub.sub_function_short_name,
      subSortOrder: sub.sub_sort_order,
      accessDetailList: sub.access_types.map(type => ({ accessType: type }))
    }));

    result.push({
      functionMasterId: mainFunc.function_master_id,
      functionShortName: mainFunc.function_short_name,
      mainSortOrder: mainFunc.main_sort_order,
      subMenuDetailList
    });
  }

  return result;
};

export const getAllAccessTypes = async () => {
  const query = `SELECT access_type_id AS "accessId", access_type AS "accessType" FROM access_master ORDER BY access_type_id`;
  const { rows } = await pool.query(query);
  return rows;
};


// Fetch all roles with their details
export const getAllRoles = async () => {
  const query = `
    SELECT role_id AS roleMasterId, role_short_name AS roleShortName, role_name AS roleDescription
    FROM roles
    ORDER BY role_id;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

// Fetch all main functions and sub functions
export const getAllFunctionsWithSubFunctions = async () => {
  const query = `
    SELECT 
      fm.function_master_id AS "functionMasterId",
      fm.function_short_name AS "functionShortName",
      fm.main_sort_order AS "mainSortOrder",
      sfm.sub_function_master_id AS "subFunctionMasterId",
      sfm.sub_function_short_name AS "subFunctionShortName",
      sfm.sub_sort_order AS "subSortOrder"
    FROM function_master fm
    LEFT JOIN sub_function_master sfm ON sfm.function_master_id = fm.function_master_id
    ORDER BY fm.main_sort_order, sfm.sub_sort_order;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

// Fetch access types for each role and sub-function
export const getRoleAccessMappings = async () => {
  const query = `
    SELECT 
      rfa.role_id AS roleMasterId,
      rfa.sub_function_master_id AS subFunctionMasterId,
      am.access_type AS accessType
    FROM role_function_access_map rfa
    INNER JOIN access_master am ON rfa.access_type_id = am.access_type_id;
  `;
  const { rows } = await pool.query(query);
  return rows;
}


export const saveRoleAccessMappings = async (roleFunctionMapDTOList) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const roleMap of roleFunctionMapDTOList) {
      const roleId = roleMap.roleMasterDTO?.roleMasterId;
      if (!roleId || !Array.isArray(roleMap.subFunctionMasterDTOList)) continue;

      

      for (const subFunction of roleMap.subFunctionMasterDTOList) {
        const subFunctionId = subFunction.subFunctionMasterId;
        await client.query('DELETE FROM role_function_access_map WHERE role_id = $1 AND sub_function_master_id = $2', [roleId, subFunctionId]);
        for (const access of subFunction.accessDetailList) {
          const accessTypeId = access.accessType;
          await client.query(
            `INSERT INTO role_function_access_map (role_id, sub_function_master_id, access_type_id)
             VALUES ($1, $2, $3)`,
            [roleId, subFunctionId, accessTypeId]
          );
        }
      }
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


