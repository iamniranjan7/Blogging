const mysql = require("mysql2/promise");
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("../Utils/cloudinary");
const crypto = require("crypto");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const authController = require(`${__dirname}/authController`);

const createPassword = async (password, cpassword) => {
  if (password.length < 8) {
    throwsError("Password should be at least 8 characters long", 400);
  }
  if (password !== cpassword || !password) {
    throwsError("Passwords are not matching", 400);
  }
  const hashedPassword = await bcrypt.hash(password, 8);
  return hashedPassword;
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const errMessage = (msg, err, res, statusCode) => {
  this.statusCode = statusCode || 500;
  return res.status(this.statusCode).json({
    status: "failed",
    message: msg,
    err,
  });
};

const throwsError = (msg, statusCode) => {
  const error = new Error(msg);
  error.statusCode = statusCode || 500;
  error.st = error.stack;
  throw error;
};

const successMessage = (msg, result, res, statusCode) => {
  return res.status(statusCode).json({
    status: "success",
    message: msg,
    result,
  });
};

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    req.fileFilterPassed = true;
    cb(null, true);
  } else {
    req.fileFilterPassed = false;
    req.file = file;
    cb(null, false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImage = upload.fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "backgroundPicture", maxCount: 1 },
]);

exports.resizeUploadedImage = async (req, res, next) => {
  if (!req.files) return next();
  // console.log(req.file);
  try {
    if (req.files.profilePicture && req.fileFilterPassed) {
      const profilePic = req.files.profilePicture[0];
      profilePic.filename = `${
        req.user.id
      }-${Date.now()}-${crypto.randomUUID()}-profile.jpeg`;

      await sharp(profilePic.buffer)
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`Public/img/users/${profilePic.filename}`);

      if (profilePic.size > 5242880) {
        fs.unlink(
          `Public/img/users/${req.files.profilePicture[0].filename}`,
          (err) => {
            if (err) throw err;
            console.log("pfp unlinked");
          }
        );
        console.log("unlinked due to size is too big");
        throwsError(
          "Profile image size is too big, image can be of size 5Mb",
          400
        );
      }
    }
    if (req.files.backgroundPicture && req.fileFilterPassed) {
      const bgPic = req.files.backgroundPicture[0];
      bgPic.filename = `${
        req.user.id
      }-${Date.now()}-${crypto.randomUUID()}-background.jpeg`;

      await sharp(bgPic.buffer)
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`Public/img/users/${bgPic.filename}`);

      if (bgPic.size > 5242880) {
        throwsError(
          "Profile image size is too big, image can be of size 5Mb",
          400
        );
      }
    }

    next();
  } catch (err) {
    console.log(err);
    errMessage(err.message, err, res, err.statusCode);
  }
};

exports.uploadToCloudinary = async (req, res, next) => {
  if (!req.files) return next();
  try {
    if (req.files.profilePicture && req.fileFilterPassed) {
      const result = await cloudinary.uploader.upload(
        `Public/img/users/${req.files.profilePicture[0].filename}`
      );

      req.profilePictureUrl = result.url;
      req.profilePictureSecureUrl = result.secure_url;
    }

    if (req.files.backgroundPicture && req.fileFilterPassed) {
      const result = await cloudinary.uploader.upload(
        `Public/img/users/${req.files.backgroundPicture[0].filename}`
      );

      req.backgroundPictureUrl = result.url;
      req.backgroundPictureSecureUrl = result.secure_url;
    }

    next();
  } catch (error) {
    errMessage(error.message, error, res, error.statusCode);
  }
};

exports.updateProfile = async (req, res) => {
  //id,username,profilePicture,backgroundPicture,bio,birthdate

  const { username, profilePicture, backgroundPicture, bio, birthdate } = req.body;

  let changed = false;

  try {
    if (req.file && !req.fileFilterPassed) {
      throwsError("Not an image! Please upload only image.", 400);
    }
    if (req.user) {
      const [result] = await pool.query(
        `SELECT * FROM user WHERE username = ?`,
        [username]
      );
      if (result.length) {
        return throwsError("Username already exists, try something else", 400);
      }

      if (bio) {
        await pool.query(`UPDATE user SET bio = ? WHERE id = ?`, [
          bio,
          req.user.id,
        ]);
        changed = true;
      }
      if (username) {
        try {
          await pool.query(`UPDATE user SET username = ? WHERE id = ?`, [
            username,
            req.user.id,
          ]);
          changed = true;
        } catch (err) {
          errMessage(
            "Username already taken, try something else",
            err,
            res,
            400
          );
        }
      }
      if (await req.profilePictureUrl) {
        const url = req.profilePictureUrl;
        await pool.query(`UPDATE user SET profilePicture = ? WHERE id = ?`, [
          url,
          req.user.id,
        ]);
        fs.unlink(
          `Public/img/users/${req.files.profilePicture[0].filename}`,
          (err) => {
            if (err) throw err;
            console.log("pfp unlinked");
          }
        );
        changed = true;
      }

      if (await req.backgroundPictureUrl) {
        console.log("in bg");
        const url = await req.backgroundPictureUrl;

        await pool.query(`UPDATE user SET backgroundPicture = ? WHERE id = ?`, [
          url,
          req.user.id,
        ]);
        fs.unlink(
          `Public/img/users/${req.files.backgroundPicture[0].filename}`,
          (err) => {
            if (err) throw err;
            console.log("bgimg unliked");
          }
        );
        changed = true;
      }
      if (birthdate) {
        //format 2023-06-17
        await pool.query(`UPDATE user SET birthdate = ? WHERE id = ?`, [
          birthdate,
          req.user.id,
        ]);
        changed = true;
      }
      const [user] = await pool.query(
        "SELECT username,email,profilePicture,backgroundPicture,bio,birthdate FROM user WHERE id = ?",
        [req.user.id]
      );
      console.log(changed, " from change");
      if (changed) {
        return successMessage("Successfully updated profile...", user, res, 200);
      } else {
        return successMessage("Nothing to update...", user, res, 200);
      }
    } else {
      return throwsError(`Your'e not signed in`, 400);
    }
  } catch (err) {
    errMessage(err.message, err, res, err.statusCode);
  }
};

exports.profile = async (req, res) => {
  // console.log(req.user," from middleware")
  try {
    if (req.user) {

      if (!req.user.id) {
        return  successMessage("Your'e not logged in", { profile: req.user }, res, 200);
      }

      successMessage("Your'e logged in", { profile: req.user }, res, 200);
    } else {
      throwsError(`Your'e not logged in`, 400);
    }
  } catch (err) {
    errMessage(err.message, err, res, err.statusCode);
  }
};

exports.updateCurrentPassword = async (req, res) => {
  const { password, newPassword, confirmNewPassword } = req.body;
  if (!req.user.id) {
    throwsError(`Your'e not logged in!!`, 400);
  }
  try {
    const [result] = await pool.query("SELECT * FROM user WHERE id = ?", [
      req.user.id,
    ]);
    if (!(await bcrypt.compare(password, result[0].password))) {
      throwsError("Old password is wrong", 400);
    }
    const hashedPassword = await createPassword(
      newPassword,
      confirmNewPassword
    );
    const q = `UPDATE user SET password = ? WHERE id = ?`;
    await pool.query(q, [hashedPassword, req.user.id]);
    successMessage(
      "Successfully updated the password",
      hashedPassword,
      res,
      200
    );
  } catch (err) {
    errMessage(err.message, err, res, err.statusCode);
  }
};
