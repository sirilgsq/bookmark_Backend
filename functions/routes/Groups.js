const express = require("express");
const { createGroup, updateGroup } = require("../utils/firebase");
const { status, constants } = require("../utils/constants");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    let { name = "" } = req.body;

    name = name.toString().trim();

    if (name !== "") {
      await createGroup(name);
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

router.put("/", async (req, res) => {
  try {
    let { name = "", group_id } = req.body;

    name = name.toString().trim();
    group_id = group_id.toString().trim();

    if (name !== "" && group_id !== "") {
      group = {
        name,
        group_id,
      };
      await updateGroup(group);
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
