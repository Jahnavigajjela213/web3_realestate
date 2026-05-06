const express = require("express");
const { getProperties, addPropertyMetadata } = require("../controllers/propertyController");

const router = express.Router();

router.get("/", getProperties);
router.post("/", addPropertyMetadata);

module.exports = router;
