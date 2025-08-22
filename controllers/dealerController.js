import { getAllDealers, saveOrUpdateDealer, getDealersByReportingUser } from "../models/dealerModel.js";

// 1. List All Dealers with Details
export const listAllDealers = async (req, res) => {
  try {
    const rows = await getAllDealers();

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Success',
      responseObject: rows
    });

  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch dealers',
      responseObject: []
    });
  }
};

// 2. Save or Update Dealer with Details
export const saveOrUpdateDealerController = async (req, res) => {
  try {
    const dealerDTO = req.body;

    if (!dealerDTO.dealerCode || !dealerDTO.dealerName || !dealerDTO.reportingToUserId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Dealer Code, Name, and Reporting User ID are required.',
        responseObject: []
      });
    }

    const result = await saveOrUpdateDealer(dealerDTO);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Dealer saved successfully.',
      responseObject: result
    });

  } catch (error) {
    console.error('Error saving/updating dealer:', error);
    const message = error.message || 'Failed to save or update dealer';

    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message,
      responseObject: []
    });
  }
};


export const getDealersByReportingUserController = async (req, res) => {
  try {
    const { reportingToUserId } = req.body; // optional
    if(!reportingToUserId){
       return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Reporting To User Id required.',
        responseObject: []
      });
    }

    const dealers = await getDealersByReportingUser(reportingToUserId);

    res.status(200).json({
      status: true,
      message: 'Dealers fetched successfully',
      responseObject: dealers
    });

  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch dealers',
      error: error.message
    });
  }
};