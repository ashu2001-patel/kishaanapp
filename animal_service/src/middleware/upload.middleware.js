const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");
const s3 = require("../config/s3");

const RAW_PREFIX = process.env.AWS_BUCKET_RAW_PREFIX || "raw";

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime"
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images (jpg, png, webp) and videos (mp4, mov) are allowed"), false);
  }
};

const upload = multer({
  fileFilter,
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname, uploadedBy: req.user?.id || "unknown" });
    },
    key: (req, file, cb) => {
      const mediaType = file.mimetype.startsWith("video") ? "videos" : "images";
      const uniqueName = `${uuidv4()}_${file.originalname.replace(/\s+/g, "_")}`;
      cb(null, `${RAW_PREFIX}/animals/${mediaType}/${uniqueName}`);
    }
  })
});

module.exports = upload;