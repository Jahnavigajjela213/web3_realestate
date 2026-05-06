const fs = require("fs");
const path = require("path");
const propertyMetadataPath = path.join(__dirname, "../data/properties.json");

async function getProperties(req, res, next) {
  try {
    const propertyMetadata = JSON.parse(fs.readFileSync(propertyMetadataPath, "utf-8"));
    const chainData = await req.services.blockchain.getProperties();

    const properties = chainData.map((prop) => {
      const meta = propertyMetadata.find((m) => m.id === prop.id) || {};
      return {
        ...prop,
        location: meta.location || "Unknown",
        image: meta.image || "",
        description: meta.description || ""
      };
    });

    return res.status(200).json({ data: properties });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin only — saves new property metadata to the JSON store.
 * The actual on-chain token is deployed by the admin wallet calling addProperty().
 */
async function addPropertyMetadata(req, res, next) {
  try {
    const { id, name, location, image, description } = req.body;
    if (id === undefined || !name) {
      return res.status(400).json({ error: "id and name are required." });
    }

    const metadata = JSON.parse(fs.readFileSync(propertyMetadataPath, "utf-8"));

    const existing = metadata.findIndex((m) => m.id === id);
    if (existing !== -1) {
      // Update if exists
      metadata[existing] = { id, location, image, description };
    } else {
      // Insert new
      metadata.push({ id, location, image, description });
    }

    fs.writeFileSync(propertyMetadataPath, JSON.stringify(metadata, null, 2), "utf-8");
    return res.status(200).json({ success: true, data: { id, name, location, image, description } });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProperties, addPropertyMetadata };
