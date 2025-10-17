import {
  getAllExpenseCategories,
  saveOrUpdateExpenseCategory
} from "../models/expenseCategoryModel.js";

// List All Expense Categories
export const listAllExpenseCategories = async (req, res) => {
  try {
    const rows = await getAllExpenseCategories();

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Success",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch expense categories",
      responseObject: [],
    });
  }
};

// Save or Update Expense Category
export const saveOrUpdateExpenseCategoryController = async (req, res) => {
  try {
    const {
      expenseCategoryId,
      expenseCategoryName,
      expenseType,
      description,
      activeFlag,
      userId,
    } = req.body;

    // Basic validation
    if (!expenseCategoryName || !expenseType ) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Expense Category Name, Type, and User ID are required",
        responseObject: [],
      });
    }

    // if (!["DIRECT", "INDIRECT"].includes(expenseType.toUpperCase())) {
    //   return res.status(400).json({
    //     sessionDTO: { status: false, reasonCode: "validation_error" },
    //     status: false,
    //     message: "Expense Type must be either 'DIRECT' or 'INDIRECT'",
    //     responseObject: [],
    //   });
    // }

    // Call model
    const result = await saveOrUpdateExpenseCategory({
      expenseCategoryId,
      expenseCategoryName,
      expenseType,
      description,
      activeFlag,
      userId,
    });

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: result.isInsert
        ? "Expense Category Created Successfully"
        : "Expense Category Updated Successfully",
      responseObject: result,
    });
  } catch (error) {
    console.error("Error saving/updating expense category:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to save or update expense category",
      responseObject: [],
    });
  }
};
