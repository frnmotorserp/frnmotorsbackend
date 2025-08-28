import pool from "../configs/db.js";

export const getDailyTotalTime = async (userId) => {
    const query = `
      SELECT 
        DATE(login_time) AS activity_date,
        ROUND(SUM(LEAST(duration_minutes, 120)), 2) AS total_minutes_spent
      FROM user_sessions
      WHERE user_id = $1
        AND duration_minutes IS NOT NULL
        AND login_time >= NOW() - INTERVAL '7 days'
      GROUP BY activity_date
      ORDER BY activity_date DESC;
    `;

  const params = [userId];
  const { rows } = await pool.query(query, params);
  return rows;
};


export const getTodayUsersTime = async () => {
  const query = `
    SELECT 
        u.user_id,
        CONCAT(u.first_name, ' ', COALESCE(u.middle_name, ''), ' ', u.last_name) AS full_name,
        CURRENT_DATE AS activity_date,
        COALESCE(ROUND(SUM(s.duration_minutes), 2), 0) AS total_minutes_spent
    FROM users u
    LEFT JOIN user_sessions s 
        ON u.user_id = s.user_id 
       AND DATE(s.login_time) = CURRENT_DATE
       AND s.duration_minutes IS NOT NULL
    GROUP BY u.user_id, full_name
    ORDER BY u.user_id;
  `;
  const { rows } = await pool.query(query);
  return rows;
};


export const getProductsSoldReport = async (period = "today") => {
  let dateCondition = "";

  switch (period) {
    case "7days":
      dateCondition = "som.order_date >= CURRENT_DATE - INTERVAL '7 days'";
      break;
    case "15days":
      dateCondition = "som.order_date >= CURRENT_DATE - INTERVAL '15 days'";
      break;
    case "1month":
      dateCondition = "som.order_date >= CURRENT_DATE - INTERVAL '1 month'";
      break;
    default: // today
      dateCondition = "som.order_date = CURRENT_DATE";
  }

  const query = `
    SELECT 
        p.product_id,
        p.product_code,
        p.product_name,
        p.unit AS uom,
        SUM(soi.quantity) AS total_quantity_sold
    FROM sales_order_master som
    JOIN sales_order_item soi 
        ON som.sales_order_id = soi.sales_order_id
    JOIN product_master p 
        ON soi.product_id = p.product_id
    WHERE ${dateCondition}
      AND som.status != 'CANCELLED'
    GROUP BY p.product_id, p.product_code, p.product_name
    ORDER BY total_quantity_sold DESC;
  `;


  const { rows } = await pool.query(query);
    //console.log(query, rows)
  return rows;
};


export const getInactiveSalesmen = async (periodDays = 1) => {
  if (![1, 7, 15, 30].includes(periodDays)) {
    throw new Error("Invalid period. Use 1, 7, 15, or 30.");
  }

  const query = `
    SELECT 
        u.user_id,
        CONCAT(u.first_name, ' ', COALESCE(u.middle_name, ''), ' ', u.last_name) AS salesman_name,
        u.login_id,
        u.primary_mobile
    FROM users u
    WHERE u.role_id = 5
      AND NOT EXISTS (
          SELECT 1
          FROM dealer_visit_log dvl
          WHERE dvl.salesman_id = u.user_id
            AND dvl.created_at::date BETWEEN CURRENT_DATE - ($1 - 1) AND CURRENT_DATE
      )
    ORDER BY salesman_name;
  `;

  const { rows } = await pool.query(query, [periodDays]);
  return rows;
};



export const getDashboardSummary = async () => {
    try {
        
        // Use a single transaction for efficiency and atomicity
        await pool.query('BEGIN');

        // 1. Total orders today
        const totalOrdersTodayQuery = `
            SELECT COUNT(*) AS total_orders
            FROM sales_order_master
            WHERE status != 'CANCELLED' AND order_date = CURRENT_DATE;
        `;
        const totalOrdersTodayResult = await pool.query(totalOrdersTodayQuery);

        // 2. Total order value today
        const totalValueTodayQuery = `
            SELECT COALESCE(SUM(grand_total), 0.00) AS total_value
            FROM sales_order_master
            WHERE status != 'CANCELLED' AND order_date = CURRENT_DATE;
        `;
        const totalValueTodayResult = await pool.query(totalValueTodayQuery);

        // 1. Total orders yesterday
      const totalOrdersYesterdayQuery = `
          SELECT COUNT(*) AS total_orders
          FROM sales_order_master
          WHERE status != 'CANCELLED' AND order_date = CURRENT_DATE - 1;
      `;
      const totalOrdersYesterdayResult = await pool.query(totalOrdersYesterdayQuery);

      // 2. Total order value yesterday
      const totalValueYesterdayQuery = `
          SELECT COALESCE(SUM(grand_total), 0.00) AS total_value
          FROM sales_order_master
          WHERE status != 'CANCELLED' AND order_date = CURRENT_DATE - 1;
      `;
      const totalValueYesterdayResult = await pool.query(totalValueYesterdayQuery);


        // 3. Total orders this month
        const totalOrdersMonthQuery = `
            SELECT COUNT(*) AS total_orders
            FROM sales_order_master
            WHERE status != 'CANCELLED' AND order_date >= date_trunc('month', CURRENT_DATE)
            AND order_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
        `;
        const totalOrdersMonthResult = await pool.query(totalOrdersMonthQuery);

        // 4. Total order value this month
        const totalValueMonthQuery = `
            SELECT COALESCE(SUM(grand_total), 0.00) AS total_value
            FROM sales_order_master
            WHERE status != 'CANCELLED' AND order_date >= date_trunc('month', CURRENT_DATE)
            AND order_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
        `;
        const totalValueMonthResult = await pool.query(totalValueMonthQuery);

        // 5. Total orders previous month
        const totalOrdersPrevMonthQuery = `
            SELECT COUNT(*) AS total_orders
            FROM sales_order_master
            WHERE status != 'CANCELLED' AND order_date >= date_trunc('month', CURRENT_DATE - interval '1 month')
              AND order_date < date_trunc('month', CURRENT_DATE);
        `;
        const totalOrdersPrevMonthResult = await pool.query(totalOrdersPrevMonthQuery);

        // 6. Total order value previous month
        const totalValuePrevMonthQuery = `
            SELECT COALESCE(SUM(grand_total), 0.00) AS total_value
            FROM sales_order_master
            WHERE status != 'CANCELLED' AND order_date >= date_trunc('month', CURRENT_DATE - interval '1 month')
              AND order_date < date_trunc('month', CURRENT_DATE);
        `;
        const totalValuePrevMonthResult = await pool.query(totalValuePrevMonthQuery);



        // 5. Total  low stock products
        // counts products across all locations that are below the threshold.
        const lowStockProductsQuery = `
            SELECT COUNT(*) AS low_stock_count
            FROM inventory_stock s
            JOIN product_master p ON s.product_id = p.product_id
            WHERE s.quantity < COALESCE(p.low_stock_threshold, 0);
            `;
        const lowStockProductsResult = await pool.query(lowStockProductsQuery);
        
        // 6. Total locations, grouped by location name
        // NOTE: The provided schema for location_master does not contain a 'type' field.
        // This query groups by the location_name instead.
        const locationWiseQuery = `
            SELECT location_name
            FROM location_master;
        `;
        const locationWiseResult = await pool.query(locationWiseQuery);


        const dealerCountQuery = `
            SELECT COUNT(*) as dealer_count
            FROM dealer_master;
        `;
        const dealerCountResult = await pool.query(dealerCountQuery);

        const vendorCountQuery = `
            SELECT COUNT(*) as vendor_count
            FROM vendor_master;
        `;
        const vendorCountResult = await pool.query(vendorCountQuery);
        
        await pool.query('COMMIT');

        // Consolidate results into a single object
        const summary = {
            today: {
                totalOrders: parseInt(totalOrdersTodayResult.rows[0].total_orders, 10),
                totalOrderValue: parseFloat(totalValueTodayResult.rows[0].total_value)
            },
            yesterday: {
                totalOrders: parseInt(totalOrdersYesterdayResult.rows[0].total_orders, 10),
                totalOrderValue: parseFloat(totalValueYesterdayResult.rows[0].total_value)
            },
            thisMonth: {
                totalOrders: parseInt(totalOrdersMonthResult.rows[0].total_orders, 10),
                totalOrderValue: parseFloat(totalValueMonthResult.rows[0].total_value)
            },
            prevMonth: {
                totalOrders: parseInt(totalOrdersPrevMonthResult.rows[0].total_orders, 10),
                totalOrderValue: parseFloat(totalValuePrevMonthResult.rows[0].total_value)
            },
            inventory: {
                lowStockProducts: parseInt(lowStockProductsResult.rows[0].low_stock_count, 10)
            },
            locations: {
                locationWiseCount: locationWiseResult.rows.map(row => ({
                    location_name: row.location_name,
                    total_count: parseInt(row.total_count, 10)
                }))
            },
            vendorCount: parseInt(vendorCountResult.rows[0].vendor_count || 0),
            dealerCount: parseInt(dealerCountResult.rows[0].dealer_count || 0)

        };

        return summary;
    } catch (err) {
        if (pool) {
            await pool.query('ROLLBACK');
        }
        console.error('Database query failed:', err);
        throw err;
    } 
}