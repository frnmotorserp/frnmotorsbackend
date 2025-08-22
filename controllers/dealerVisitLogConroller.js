
import { saveDealerVisitLog, listDealerVisitLogs } from "../models/dealerVisitLogModel.js";


export const saveDealerVisitController = async (req, res) => {
  try {
    const visitDTO = req.body;

    if (!visitDTO.salesmanId || (!visitDTO.dealerId && !visitDTO.isNewDealer)) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Salesman ID and Dealer ID (or isNewDealer flag) are required.',
        responseObject: []
      });
    }

    const result = await saveDealerVisitLog(visitDTO);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Dealer visit saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving dealer visit:', error);
    const message = error.message || 'Failed to save dealer visit';

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message,
      responseObject: []
    });
  }
};

export const getDealerVisitLogs = async (req, res) => {
  try {
    const { salesmanId, dealerId, startDate, endDate } = req.body;

    const logs = await listDealerVisitLogs({
      salesmanId,
      dealerId,
      startDate,
      endDate
    });

    res.json({
      status: true,
      responseObject: logs
    });
  } catch (err) {
    console.error("Error fetching dealer visit logs:", err);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};
