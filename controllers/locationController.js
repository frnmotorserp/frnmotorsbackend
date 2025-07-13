import { getAllStates, getAllDistricts, saveOrUpdateDistrict, getAllLocationTypes, saveOrUpdateLocationTypeModel, saveOrUpdateLocation, getAllLocations,getAllUserLocationMappings,
saveOrUpdateUserLocationMapping    } from "../models/locationModel.js";

export const getStateList = async (req, res) => {
  try {
    const states = await getAllStates();

    const responseObject = states.map(state => ({
      stateId: state.state_id,
      stateName: state.state_name
      // stateCode is intentionally omitted as you requested
    }));

    res.json({
      sessionDTO: {
        status: true,
        reasonCode: 'success'
      },
      status: true,
      message: 'Success',
      responseObject
    });

  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      sessionDTO: {
        status: false,
        reasonCode: 'error'
      },
      status: false,
      message: 'Failed to fetch state list',
      responseObject: []
    });
  }
};

export const listAllDistricts = async (req, res) => {
  try {
    const districts = await getAllDistricts();

    const responseObject = districts.map(district => ({
      districtId: district.district_id,
      districtName: district.district_name,
      stateId: district.state_id
    }));

    res.json({
      sessionDTO: {
        status: true,
        reasonCode: 'success'
      },
      status: true,
      message: 'Success',
      responseObject
    });

  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      sessionDTO: {
        status: false,
        reasonCode: 'error'
      },
      status: false,
      message: 'Failed to fetch district list',
      responseObject: []
    });
  }
};


export const saveOrUpdateDistrictController = async (req, res) => {
  try {
    const { districtId, stateId, districtName } = req.body;

    if (!stateId || !districtName) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'stateId and districtName are required',
        responseObject: []
      });
    }

    const result = await saveOrUpdateDistrict(districtId, stateId, districtName);

    if (!result) {
      return res.status(404).json({
        sessionDTO: { status: false, reasonCode: 'not_found' },
        status: false,
        message: districtId ? 'District not found for update' : 'Failed to create district',
        responseObject: []
      });
    }

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: districtId ? 'District updated successfully' : 'District created successfully',
      responseObject: result
    });

  } catch (error) {
    console.error('Error in saveOrUpdateDistrict:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to save or update district',
      responseObject: []
    });
  }
};

export const listAllLocationTypes = async (req, res) => {
    try {
        const rows = await getAllLocationTypes();

        res.json({
            sessionDTO: {
                status: true,
                reasonCode: 'success'
            },
            status: true,
            message: 'Success',
            responseObject: rows
        });

    } catch (error) {
        console.error('Error fetching location types:', error);
        res.status(500).json({
            sessionDTO: {
                status: false,
                reasonCode: 'error'
            },
            status: false,
            message: 'Failed to fetch location types',
            responseObject: []
        });
    }
};

export const saveOrUpdateLocationTypeController = async (req, res) => {
    try {
        const { locationTypeId, locationTypeName, description, activeFlag, userId } = req.body;

        const result = await saveOrUpdateLocationTypeModel({
            locationTypeId,
            locationTypeName,
            description,
            activeFlag,
            userId
        });

        res.json({
            sessionDTO: {
                status: true,
                reasonCode: 'success'
            },
            status: true,
            message: result.isInsert ? 'Location Type Created Successfully' : 'Location Type Updated Successfully',
            responseObject: result
        });

    } catch (error) {
        console.error('Error saving/updating location type:', error);
        res.status(500).json({
            sessionDTO: {
                status: false,
                reasonCode: 'error'
            },
            status: false,
            message: 'Failed to save or update location type',
            responseObject: []
        });
    }
};



export const saveOrUpdateLocationController = async (req, res) => {
  try {
    const {
      locationId,
      locationName,
      address,
      stateId,
      districtId,
      pincode,
      locationTypeIds,
      activeFlag,
      userId
    } = req.body;

    // Basic validation
    if (!locationName || !address || !stateId || !districtId || !pincode || !userId) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'Required fields: locationName, address, stateId, districtId, pincode, userId',
        responseObject: []
      });
    }

    const result = await saveOrUpdateLocation({
      locationId,
      locationName,
      address,
      stateId,
      districtId,
      pincode,
      locationTypeIds,
      activeFlag: activeFlag || 'Y',
      userId
    });

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: locationId ? 'Location updated successfully' : 'Location created successfully',
      responseObject: result
    });

  } catch (error) {
    console.error('Error in saveOrUpdateLocationController:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to save or update location',
      responseObject: []
    });
  }
};

export const listAllLocationsController = async (req, res) => {
  try {
    const locations = await getAllLocations();

    res.status(200).json({
      sessionDTO: {
        status: true,
        reasonCode: 'success'
      },
      status: true,
      message: 'Fetched all locations successfully.',
      responseObject: locations
    });

  } catch (error) {
    console.error('Error fetching locations:', error.message);
    res.status(500).json({
      sessionDTO: {
        status: false,
        reasonCode: 'server_error'
      },
      status: false,
      message: 'Failed to fetch locations.',
      responseObject: []
    });
  }
};

//Get all user-location mappings
export const listAllUserLocationMappings = async (req, res) => {
  try {
    const mappings = await getAllUserLocationMappings();

    const responseObject = mappings.map(mapping => ({
      userId: mapping.user_id,
      loginId: mapping.login_id,
      userName: `${mapping.first_name} ${mapping.middle_name || ''} ${mapping.last_name}`.trim(),
      mobile: mapping.primary_mobile,
      locations: mapping.locations
    }));

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'User-Location mappings fetched successfully',
      responseObject
    });
  } catch (error) {
    console.error('Error fetching user-location mappings:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to fetch user-location mappings',
      responseObject: []
    });
  }
};

//Save or Update mappings for a user
export const saveOrUpdateUserLocationMappingController = async (req, res) => {
  try {
    const { userId, locationIds, assignedBy } = req.body;

    if (!userId || !Array.isArray(locationIds) || locationIds.length === 0) {
      return res.status(400).json({
        sessionDTO: { status: false, reasonCode: 'validation_error' },
        status: false,
        message: 'userId and locationIds are required',
        responseObject: []
      });
    }

    const result = await saveOrUpdateUserLocationMapping(userId, locationIds, assignedBy);

    res.json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'User-Location Mapping saved successfully',
      responseObject: result
    });
  } catch (error) {
    console.error('Error saving/updating user-location mapping:', error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'error' },
      status: false,
      message: 'Failed to save or update user-location mapping',
      responseObject: []
    });
  }
};


