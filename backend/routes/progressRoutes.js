const express = require("express");
const router = express.Router();
const { logUpdate, getHistory } = require("../controllers/progressController");

// Parallel Express routes for progress tracking
router.post("/update", logUpdate);
router.get("/:teamId", getHistory);

module.exports = router;
