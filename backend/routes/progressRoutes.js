const express = require("express");
const { logUpdate, getHistory } = require("../controllers/progressController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/update").post(protect, logUpdate);
router.route("/:teamId").get(protect, getHistory);

module.exports = router;
