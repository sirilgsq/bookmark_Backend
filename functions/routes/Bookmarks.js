const express = require("express");
const {
  createBookmark,
  updateBookmark,
  getBookmarks,
  deleteBookmark,
  moveBookmark,
} = require("../utils/firebase");
const { status, constants } = require("../utils/constants");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    let { name = "", link = "", group_id = "" } = req.body;

    name = name.toString().trim();
    link = link.toString().trim();
    group_id = group_id.toString().trim();

    if (name !== "" && link !== "" && group_id !== "") {
      const bookmark = {
        name,
        link,
        group_id,
      };
      await createBookmark(bookmark);
      res.json({ status: status.SUCCESS });
    } else {
      res.json({
        status: status.REQUIRED_FIELDS,
        message: "All fields are required!",
      });
    }
  } catch (error) {
    res.json({ status: status.ERROR, error: error.toString() });
  }
});

router.put("/", async (req, res) => {
  try {
    let { name = "", link = "", group_id = "", id = "" } = req.body;

    name = name.toString().trim();
    link = link.toString().trim();
    group_id = group_id.toString().trim();
    id = id.toString().trim();

    if (name !== "" && link !== "" && group_id !== "" && id !== "") {
      const bookmark = {
        name,
        link,
        group_id,
        id,
      };
      await updateBookmark(bookmark);
      res.json({ status: status.SUCCESS });
    } else {
      res.json({
        status: status.REQUIRED_FIELDS,
        message: constants.ALL_FIELDS_REQUIRED,
      });
    }
  } catch (error) {
    res.json({ status: status.ERROR, error: error.toString() });
  }
});

router.patch("/", async (req, res) => {
  try {
    let { fromGroupId, toGroupId, bookmarkId, position } = req.query;

    fromGroupId = fromGroupId.toString().trim();
    toGroupId = toGroupId.toString().trim();
    bookmarkId = bookmarkId.toString().trim();
    position = parseInt(position, 10);
    if (fromGroupId && toGroupId && bookmarkId && !isNaN(position)) {
      await moveBookmark(fromGroupId, toGroupId, bookmarkId, position);
      res.json({ status: status.SUCCESS });
    } else {
      res.json({
        status: status.REQUIRED_FIELDS,
        message: constants.ALL_FIELDS_REQUIRED_AND_POSITION_NUMBER,
      });
    }
  } catch (error) {
    res.json({ status: status.ERROR, error: error.toString() });
  }
});

router.get("/", async (req, res) => {
  try {
    const bookmarks = await getBookmarks();
    res.json({ status: status.SUCCESS, bookmarks });
  } catch (error) {
    res.json({ status: status.ERROR, error: error.toString() });
  }
});

router.delete("/", async (req, res) => {
  try {
    let group_id = req.query.g_id;
    let id = req.query.id;
    group_id = group_id.toString().trim();
    id = id.toString().trim();

    if (group_id !== "" && id !== "") {
      const bookmark = {
        group_id,
        id,
      };
      await deleteBookmark(bookmark);
      res.json({ status: status.SUCCESS });
    } else {
      res.json({
        status: status.REQUIRED_FIELDS,
        message: constants.ALL_FIELDS_REQUIRED,
      });
    }
  } catch (error) {
    res.json({ status: status.ERROR, error: error.toString() });
  }
});

module.exports = router;
