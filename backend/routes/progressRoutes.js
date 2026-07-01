const express = require("express");
const { logUpdate, getHistory } = require("../controllers/progressController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/update", protect, logUpdate);
router.get("/:teamId", protect, getHistory);

module.exports = router;
