import pool from '../configs/db.js';
import bcrypt from 'bcrypt';

export const getUserByLoginId = async (loginId) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE login_id = $1',
    [loginId]
  );
  return result.rows[0];
};
export const getUserByUserId = async (userId) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  };

export const getRoleById = async (roleId) => {
  const result = await pool.query(
    'SELECT * FROM roles WHERE role_id = $1',
    [roleId]
  );
  return result.rows[0];
};

export const getUserAccessByRoleId = async (roleId) => {
  const result = await pool.query(`
    SELECT 
      fm.function_master_id,
      fm.function_short_name,
      sf.sub_function_master_id,
      sf.sub_function_short_name,
      am.access_type,
      sf.sub_sort_order
    FROM role_function_access_map rfm
    JOIN sub_function_master sf ON rfm.sub_function_master_id = sf.sub_function_master_id
    JOIN function_master fm ON sf.function_master_id = fm.function_master_id
    JOIN access_master am ON rfm.access_type_id = am.access_type_id
    WHERE rfm.role_id = $1
  `, [roleId]);

  return result.rows;
};

export const updateUserPassword = async (userId, hashedPassword) => {
    const result = await pool.query(
      `UPDATE users
       SET password = $1, first_login_flag = false, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING user_id, login_id`,
      [hashedPassword, userId]
    );
    return result.rows[0];
  };

  export const resetUserPasswordByAdmin = async (userId) => {
  const defaultPassword = 'Abcd@1234';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const result = await pool.query(
    `UPDATE users
     SET password = $1,
         first_login_flag = true,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2
     RETURNING user_id, login_id`,
    [hashedPassword, userId]
  );

  return result.rows[0];
};
