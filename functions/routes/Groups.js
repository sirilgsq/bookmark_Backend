const express = require("express");
const { createGroupV2, updateGroupV2, getGroupsV2, deleteGroupV2 } = require("../utils/firebase-v2");
const { status, constants } = require("../utils/constants");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Apply authentication middleware to all group routes
router.use(authenticateToken);

router.post("/", async (req, res) => {
  try {
    let { name = "" } = req.body;
    const userId = req.user.uid; // Get user ID from authenticated request

    name = name.toString().trim();

    if (name !== "") {
      const newGroup = await createGroupV2(userId, name);
      res.json({ 
        success: true,
        status: status.SUCCESS,
        message: "Group created successfully",
        data: newGroup
      });
    } else {
      res.json({
        success: false,
        status: status.REQUIRED_FIELDS,
        message: "Group name is required!",
      });
    }
  } catch (error) {
    res.json({ 
      success: false,
      status: status.ERROR, 
      error: error.toString() 
    });
  }
});

router.put("/", async (req, res) => {
  try {
    let { name = "", groupId = "" } = req.body;
    const userId = req.user.uid; // Get user ID from authenticated request

    name = name.toString().trim();
    groupId = groupId.toString().trim();

    if (name !== "" && groupId !== "") {
      await updateGroupV2(userId, groupId, name);
      res.json({ 
        success: true,
        status: status.SUCCESS,
        message: "Group updated successfully"
      });
    } else {
      res.json({
        success: false,
        status: status.REQUIRED_FIELDS,
        message: "Group name and Group ID are required!",
      });
    }
  } catch (error) {
    res.json({ 
      success: false,
      status: status.ERROR, 
      error: error.toString() 
    });
  }
});

// Add GET route to retrieve all groups for a user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.uid; // Get user ID from authenticated request
    const groups = await getGroupsV2(userId);
    res.json({ 
      success: true,
      status: status.SUCCESS,
      groups 
    });
  } catch (error) {
    res.json({ 
      success: false,
      status: status.ERROR, 
      error: error.toString() 
    });
  }
});

// Add DELETE route to delete a group
router.delete("/", async (req, res) => {
  try {
    let { groupId = "" } = req.query;
    const userId = req.user.uid; // Get user ID from authenticated request
    
    groupId = groupId.toString().trim();

    if (groupId !== "") {
      await deleteGroupV2(userId, groupId);
      res.json({ 
        success: true,
        status: status.SUCCESS,
        message: "Group deleted successfully"
      });
    } else {
      res.json({
        success: false,
        status: status.REQUIRED_FIELDS,
        message: "Group ID is required!",
      });
    }
  } catch (error) {
    res.json({ 
      success: false,
      status: status.ERROR, 
      error: error.toString() 
    });
  }
});

module.exports = router;
