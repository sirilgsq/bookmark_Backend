const express = require("express");
const {
  createBookmarkV2,
  updateBookmarkV2,
  getAllBookmarksV2,
  getBookmarksV2,
  deleteBookmarkV2,
  moveBookmarkV2,
} = require("../utils/firebase-v2");
const { status, constants } = require("../utils/constants");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Apply authentication middleware to all bookmark routes
router.use(authenticateToken);

router.post("/", async (req, res) => {
  try {
    // Support both old and new field names for backward compatibility
    let { 
      title = "", 
      url = "", 
      group_id = "",
      // Legacy field names
      name = "",
      link = ""
    } = req.body;
    
    const userId = req.user.uid; // Get user ID from authenticated request

    // Use new field names if provided, otherwise fall back to legacy names
    const finalTitle = (title || name).toString().trim();
    const finalUrl = (url || link).toString().trim();
    const groupId = group_id.toString().trim();

    if (finalTitle !== "" && finalUrl !== "" && groupId !== "") {
      const bookmarkData = {
        title: finalTitle,
        url: finalUrl,
      };
      await createBookmarkV2(userId, groupId, bookmarkData);
      res.json({
        success: true,
        status: status.SUCCESS,
        message: "Bookmark created successfully",
      });
    } else {
      res.json({
        success: false,
        status: status.REQUIRED_FIELDS,
        message: "Title (or name), URL (or link), and Group ID are required!",
      });
    }
  } catch (error) {
    res.json({
      success: false,
      status: status.ERROR,
      error: error.toString(),
    });
  }
});

router.put("/", async (req, res) => {
  try {
    // Support both old and new field names for backward compatibility
    let { 
      title = "", 
      url = "", 
      groupId = "", 
      bookmarkId = "",
      // Legacy field names
      name = "",
      link = "",
      group_id = "",
      id = ""
    } = req.body;
    
    const userId = req.user.uid; // Get user ID from authenticated request

    // Use new field names if provided, otherwise fall back to legacy names
    const finalTitle = (title || name).toString().trim();
    const finalUrl = (url || link).toString().trim();
    const finalGroupId = (groupId || group_id).toString().trim();
    const finalBookmarkId = (bookmarkId || id).toString().trim();

    if (finalTitle !== "" && finalUrl !== "" && finalGroupId !== "" && finalBookmarkId !== "") {
      const bookmarkData = {
        title: finalTitle,
        url: finalUrl,
      };
      await updateBookmarkV2(userId, finalGroupId, finalBookmarkId, bookmarkData);
      res.json({
        success: true,
        status: status.SUCCESS,
        message: "Bookmark updated successfully",
      });
    } else {
      res.json({
        success: false,
        status: status.REQUIRED_FIELDS,
        message: "Title (or name), URL (or link), Group ID (or group_id), and Bookmark ID (or id) are required!",
      });
    }
  } catch (error) {
    res.json({
      success: false,
      status: status.ERROR,
      error: error.toString(),
    });
  }
});

router.patch("/", async (req, res) => {
  try {
    let { fromGroupId, toGroupId, bookmarkId, position } = req.query;
    const userId = req.user.uid; // Get user ID from authenticated request

    fromGroupId = fromGroupId.toString().trim();
    toGroupId = toGroupId.toString().trim();
    bookmarkId = bookmarkId.toString().trim();
    position = parseInt(position, 10);

    if (fromGroupId && toGroupId && bookmarkId && !isNaN(position)) {
      await moveBookmarkV2(
        userId,
        fromGroupId,
        toGroupId,
        bookmarkId,
        position
      );
      res.json({
        success: true,
        status: status.SUCCESS,
        message: "Bookmark moved successfully",
      });
    } else {
      res.json({
        success: false,
        status: status.REQUIRED_FIELDS,
        message:
          "From Group ID, To Group ID, Bookmark ID, and Position are required!",
      });
    }
  } catch (error) {
    res.json({
      success: false,
      status: status.ERROR,
      error: error.toString(),
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = req.user.uid; // Get user ID from authenticated request
    const { groupId } = req.query;

    if (groupId) {
      // Get bookmarks for a specific group
      const bookmarks = await getBookmarksV2(userId, groupId);
      res.json({
        success: true,
        status: status.SUCCESS,
        bookmarks,
      });
    } else {
      // Get all bookmarks across all groups with groups list
      const result = await getAllBookmarksV2(userId);
      res.json({
        success: true,
        status: status.SUCCESS,
        bookmarks: result.bookmarks,
        groups: result.groups,
      });
    }
  } catch (error) {
    res.json({
      success: false,
      status: status.ERROR,
      error: error.toString(),
    });
  }
});

router.delete("/", async (req, res) => {
  try {
    // Support both old and new field names for backward compatibility
    let { 
      groupId, 
      bookmarkId,
      // Legacy field names
      g_id,
      id
    } = req.query;
    
    const userId = req.user.uid; // Get user ID from authenticated request

    // Use new field names if provided, otherwise fall back to legacy names
    const finalGroupId = (groupId || g_id).toString().trim();
    const finalBookmarkId = (bookmarkId || id).toString().trim();

    if (finalGroupId !== "" && finalBookmarkId !== "") {
      await deleteBookmarkV2(userId, finalGroupId, finalBookmarkId);
      res.json({
        success: true,
        status: status.SUCCESS,
        message: "Bookmark deleted successfully",
      });
    } else {
      res.json({
        success: false,
        status: status.REQUIRED_FIELDS,
        message: "Group ID (or g_id) and Bookmark ID (or id) are required!",
      });
    }
  } catch (error) {
    res.json({
      success: false,
      status: status.ERROR,
      error: error.toString(),
    });
  }
});

module.exports = router;
