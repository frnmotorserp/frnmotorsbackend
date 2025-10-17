import pool from "../configs/db.js";

//  Get All Expense Categories
export const getAllExpenseCategories = async () => {
  const query = `
    SELECT 
      expense_category_id AS "expenseCategoryId",
      expense_category_name AS "expenseCategoryName",
      expense_type AS "expenseType",
      description,
      active_flag AS "activeFlag",
      created_by AS "createdBy",
      created_at AS "createdAt",
      updated_by AS "updatedBy",
      updated_at AS "updatedAt"
    FROM expense_category_master
    ORDER BY expense_category_name;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Save or Update Expense Category
export const saveOrUpdateExpenseCategory = async (expenseCategoryDTO) => {
  const {
    expenseCategoryId,
    expenseCategoryName,
    expenseType,
    description,
    activeFlag = 'Y',
    userId,
  } = expenseCategoryDTO;

  const timestamp = new Date();

  // Basic validation
  if (!expenseCategoryName || !userId) {
    throw new Error("Expense Category Name and User ID are required.");
  }

  // if (!["DIRECT", "INDIRECT"].includes(expenseType?.toUpperCase())) {
  //   throw new Error("Expense Type must be either 'DIRECT' or 'INDIRECT'.");
  // }

  //  Update existing category
  if (expenseCategoryId && expenseCategoryId > 0) {
    const updateQuery = `
      UPDATE expense_category_master
      SET 
        expense_category_name = $1,
        expense_type = $2,
        description = $3,
        active_flag = $4,
        updated_by = $5,
        updated_at = $6
      WHERE expense_category_id = $7
      RETURNING expense_category_id AS "expenseCategoryId";
    `;

    const updateParams = [
      expenseCategoryName,
      expenseType.toUpperCase(),
      description,
      activeFlag,
      userId,
      timestamp,
      expenseCategoryId,
    ];

    const { rows } = await pool.query(updateQuery, updateParams);
    return { isUpdate: true, updatedId: rows[0]?.expenseCategoryId || null };
  }

  //  Insert new category
  const insertQuery = `
    INSERT INTO expense_category_master 
      (expense_category_name, expense_type, description, active_flag, created_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING expense_category_id AS "expenseCategoryId";
  `;

  const insertParams = [
    expenseCategoryName,
    expenseType.toUpperCase(),
    description,
    activeFlag,
    userId,
    timestamp,
  ];

  const { rows } = await pool.query(insertQuery, insertParams);
  return { isInsert: true, insertedId: rows[0]?.expenseCategoryId || null };
};
