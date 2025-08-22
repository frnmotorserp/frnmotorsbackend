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




/**
 * Start a new session (login)
 * @param {number} userId - The user's ID
 * @param {string} token - The JWT token
 */
export const createSession = async (userId, token) => {
  const query = `
    INSERT INTO user_sessions (user_id, token, login_time)
    VALUES ($1, $2, NOW())
    RETURNING id, user_id, token, login_time;
  `;
  const params = [userId, token];
  const { rows } = await pool.query(query, params);
  return rows[0];
};

/**
 * End a session (logout)
 * @param {string} token - The JWT token to identify session
 */
export const endSession = async (token) => {
  const query = `
    UPDATE user_sessions
    SET logout_time = NOW(),
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - login_time)) / 60.0
    WHERE token = $1
      AND logout_time IS NULL
    RETURNING id, user_id, login_time, logout_time, duration_minutes;
  `;
  const params = [token];
  const { rows } = await pool.query(query, params);
  return rows[0];
};

/**
 * Get average time spent per user per day
 * @param {number} userId
 */
export const getDailyAvgTime = async (userId) => {
  const query = `
    SELECT 
      DATE(login_time) AS activity_date,
      ROUND(AVG(duration_minutes), 2) AS avg_minutes_spent
    FROM user_sessions
    WHERE user_id = $1
      AND duration_minutes IS NOT NULL
    GROUP BY activity_date
    ORDER BY activity_date DESC;
  `;
  const params = [userId];
  const { rows } = await pool.query(query, params);
  return rows;
};
