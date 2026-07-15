const express = require("express");
const router = express.Router();
const { logUpdate, getHistory } = require("../controllers/progressController");
const { protect } = require("../middleware/authMiddleware");

// Routes for progress tracking
router.post("/update", protect, logUpdate);
router.get("/:teamId", protect, getHistory);

module.exports = router;
