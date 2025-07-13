import pool from '../configs/db.js';

export const getAllUsersFromDB = async () => {
  const query = `
    SELECT 
      u.user_id AS "userId",
      u.first_name AS "userFirstname",
      u.middle_name AS "userMiddlename",
      u.last_name AS "userLastname",
      u.primary_email AS "userEmailPrimary",
      u.alternative_email AS "userEmailSecondary",
      u.primary_mobile AS "userMobilePrimary",
      u.secondary_mobile AS "userMobileSecondary",
      u.role_id AS "roleId",
      r.role_short_name AS "roleShortname",
      r.role_name AS "roleDescription",
      u.user_active_flag AS "userActiveFlag",
      u.login_id AS "loginId"
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    ORDER BY u.user_id;
  `;

  const result = await pool.query(query);
  //console.log(result.rows)
  return result.rows;
};


export const createUserInDB = async (userData) => {
  const {
    userFirstName,
    userMiddleName,
    userLastName,
    loginId,
    roleMasterId,
    mobileNumber,
    mobileNumberSecondary,
    email,
    emailSecondary,
    userActiveFlag,
    password,
  } = userData;

  const query = `
    INSERT INTO users 
    (first_name, middle_name, last_name, login_id, role_id, primary_mobile, secondary_mobile, primary_email, alternative_email, user_active_flag, password)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    userFirstName,
    userMiddleName,
    userLastName,
    loginId,
    roleMasterId,
    mobileNumber,
    mobileNumberSecondary,
    email,
    emailSecondary,
    userActiveFlag,
    password
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
export const updateUserInDB = async (userId, userData) => {
  const {
    userFirstName,
    userMiddleName,
    userLastName,
    loginId,
    roleMasterId,
    mobileNumber,
    mobileNumberSecondary,
    email,
    emailSecondary,
    userActiveFlag
  } = userData;

  const query = `
    UPDATE users
    SET
      first_name = $1,
      middle_name = $2,
      last_name = $3,
      login_id = $4,
      role_id = $5,
      primary_mobile = $6,
      secondary_mobile = $7,
      primary_email = $8,
      alternative_email = $9,
      user_active_flag = $10
    WHERE user_id = $11
    RETURNING *
  `;

  const values = [
    userFirstName,
    userMiddleName,
    userLastName,
    loginId,
    roleMasterId,
    mobileNumber,
    mobileNumberSecondary,
    email,
    emailSecondary,
    userActiveFlag,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};


export const getAllRolesModel = async () => {
  const query = 'SELECT role_id AS "roleMasterId", role_short_name AS "roleShortName", role_name AS "roleDescription" FROM roles ORDER BY role_id';
  const result = await pool.query(query);
  return result.rows;
};

