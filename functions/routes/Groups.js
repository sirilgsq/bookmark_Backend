const express = require("express");
const { createGroup } = require("../utils/firebase");
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

module.exports = router;
