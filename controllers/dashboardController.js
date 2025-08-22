import { getDashboardSummary, getTodayUsersTime, getDailyTotalTime, getProductsSoldReport, getInactiveSalesmen  } from "../models/dashboardModel.js";

export const listTodayUsersTime = async (req, res) => {
  try {
    const rows = await getTodayUsersTime();

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Success",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching today's user time:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch today's user time",
      responseObject: [],
    });
  }
};



// Controller: Get daily total time for a user (last 7 days)
export const getUserDailyTotalTime = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "userId is required",
        responseObject: [],
      });
    }

    const rows = await getDailyTotalTime(userId);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Success",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching daily total time:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch daily total time",
      responseObject: [],
    });
  }
};


export const fetchProductsSoldReport = async (req, res) => {
  try {
    const { period = "today" } = req.body; // default = today

    const rows = await getProductsSoldReport(period);

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Success",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching products sold report:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch products sold report",
      responseObject: [],
    });
  }
};



export const listInactiveSalesmen = async (req, res) => {
  try {
    // Take periodDays from body/query, default = 1 (today)
    const { periodDays = 1 } = req.body;  

    // Validate input
    if (![1, 7, 15, 30].includes(Number(periodDays))) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: "validation_error" },
        status: false,
        message: "Invalid period. Use 1, 7, 15, or 30.",
        responseObject: [],
      });
    }

    const rows = await getInactiveSalesmen(Number(periodDays));

    res.json({
      sessionDTO: { status: true, reasonCode: "success" },
      status: true,
      message: "Success",
      responseObject: rows,
    });
  } catch (error) {
    console.error("Error fetching inactive salesmen:", error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch inactive salesmen",
      responseObject: [],
    });
  }
};


export const getDashboardSummaryController = async (req, res) => {
    try {
        const summaryData = await getDashboardSummary();

        res.json({
            sessionDTO: { status: true, reasonCode: "success" },
            status: true,
            message: "Dashboard summary fetched successfully.",
            responseObject: summaryData,
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        res.status(500).json({
            sessionDTO: { status: false, reasonCode: "error" },
            status: false,
            message: "Failed to fetch dashboard summary.",
            responseObject: null,
        });
    }
};