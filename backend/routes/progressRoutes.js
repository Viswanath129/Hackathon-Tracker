const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { logUpdateExpress, getHistoryExpress } = require("../controllers/progressController");

const router = express.Router();

router.post("/update", protect, logUpdateExpress);
router.get("/:teamId", protect, getHistoryExpress);

module.exports = router;
