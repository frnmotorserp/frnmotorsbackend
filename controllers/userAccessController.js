import { getAllFunctions, getAllAccessTypes,  getAllRoles, getAllFunctionsWithSubFunctions, getRoleAccessMappings, saveRoleAccessMappings  } from "../models/userAccessModel.js";

export const getMenuAccess = async (req, res) => {
  try {
    // 1. Fetch all roles
    const roles = await getAllRoles();

    // 2. Fetch all functions and their sub-functions
    const functionSubFunctionList = await getAllFunctionsWithSubFunctions();
    //console.log("functionSubFunctionList", functionSubFunctionList)

    // 3. Fetch all role-based access mappings
    const accessMappings = await getRoleAccessMappings();

    // 4. Build the responseObject
    const responseObject = roles.map(role => {
      const mainFunctionDTOMap = {};
      
      functionSubFunctionList.forEach(item => {
        // Initialize main function if not already
        if (!mainFunctionDTOMap[item.functionMasterId]) {
          mainFunctionDTOMap[item.functionMasterId] = {
            functionMasterId: item.functionMasterId,
            functionShortName: item.functionShortName,
            mainSortOrder: item.mainSortOrder,
            subMenuDetailList: []
          };
        }

        // Get access list for this role and sub-function
        const accessList = accessMappings
          .filter(am => am.rolemasterid === role.rolemasterid && am.subfunctionmasterid === item.subFunctionMasterId)
          .map(am => ({
            accessType: am.accesstype
          }));

        // Push sub-menu
        mainFunctionDTOMap[item.functionMasterId].subMenuDetailList.push({
          subFunctionMasterId: item.subFunctionMasterId,
          subFunctionShortName: item.subFunctionShortName,
          subSortOrder: item.subSortOrder,
          accessDetailList: accessList
        });
      });

      // Convert to array and sort by mainSortOrder
      const mainFunctionDTOList = Object.values(mainFunctionDTOMap)
        .sort((a, b) => (a.mainSortOrder ?? 999) - (b.mainSortOrder ?? 999))
        .map(mainFunc => ({
          ...mainFunc,
          subMenuDetailList: mainFunc.subMenuDetailList.sort((a, b) => (a.subSortOrder ?? 999) - (b.subSortOrder ?? 999))
        }));

      return {
        mainFunctionDTOList,
        roleMasterDTO: {
          roleMasterId: role.rolemasterid,
          roleShortName: role.roleshortname,
          roleDescription: role.roledescription
        }
      };
    });

    // 5. Send response
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
    console.error('Error generating menu:', error);
    res.status(500).json({
      sessionDTO: {
        status: false,
        reasonCode: 'error'
      },
      status: false,
      message: 'Failed to generate menu',
      responseObject: []
    });
  }
};

export const getAllMenuFunctions = async (req, res) => {
  try {
    const rows = await getAllFunctions();

    const groupedData = {};

    rows.forEach(row => {
      if (!groupedData[row.mainFunctionId]) {
        groupedData[row.mainFunctionId] = {
          mainFunctionId: row.mainFunctionId,
          mainFunctionName: row.mainFunctionName,
          mainFunctionActiveFlag: 'Y',    // Optional — hardcoded or from DB
          mainFunctionSortOrder: row.mainFunctionSortOrder,
          subFunctionList: []
        };
      }

      if (row.subFunctionId) {
        groupedData[row.mainFunctionId].subFunctionList.push({
          subFunctionId: row.subFunctionId,
          subFunctionName: row.subFunctionName,
          subFunctionActiveFlag: 'Y',    // Optional — hardcoded or from DB
          subFunctionSortOrder: row.subFunctionSortOrder
        });
      }
    });

    const responseObject = Object.values(groupedData);

    res.json({
      sessionDTO: {
        status: true,
        reasonCode: "success"
      },
      status: true,
      message: "Success",
      responseObject
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: "error" },
      status: false,
      message: "Failed to fetch function list",
      responseObject: []
    });
  }
};

export const getAccessTypes = async (req, res) => {
  try {
    const accessTypes = await getAllAccessTypes();

    res.json({
      sessionDTO: {
        status: true,
        reasonCode: "success"
      },
      status: true,
      message: "Success",
      responseObject: accessTypes
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      sessionDTO: {
        status: false,
        reasonCode: "error"
      },
      status: false,
      message: "Failed to fetch access types",
      responseObject: []
    });
  }
};

export const saveRoleAccessMapping = async (req, res) => {
  const { roleFunctionMapDTOList } = req.body;

  if (!Array.isArray(roleFunctionMapDTOList)) {
    return res.status(400).json({
      sessionDTO: { status: false, reasonCode: 'validation_error' },
      status: false,
      message: 'Invalid role mapping data',
      responseObject: null
    });
  }

  try {
    await saveRoleAccessMappings(roleFunctionMapDTOList);

    res.status(200).json({
      sessionDTO: { status: true, reasonCode: 'success' },
      status: true,
      message: 'Role access mappings saved successfully',
      responseObject: null
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      sessionDTO: { status: false, reasonCode: 'server_error' },
      status: false,
      message: 'Failed to save role access mappings',
      responseObject: null
    });
  }
};