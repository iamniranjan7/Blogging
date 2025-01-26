const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const crypto = require("crypto");
const sendEmail = require("../Utils/email");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const jwtToken = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  return token;
};

const setCookie = (res, name, data) => {
  const cookieOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  res.cookie(name, data, cookieOption);
};

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

const createPasswordResetToken = async (email, res) => {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const token = crypto.createHash("sha256").update(resetToken).digest("hex");
  const tokenExpires = Date.now() + 10 * 60 * 1000;

  try {
    const q = `UPDATE user SET
     passwordResetToken = ? ,passwordResetExpires = FROM_UNIXTIME(?/1000)
     WHERE email = ?`;
    const [result] = await pool.query(q, [token, tokenExpires, email]);
    if (!result.affectedRows) {
      throwsError("error adding token and tokenExpired fields", 400);
    }
  } catch (err) {
    console.log(err);
    errMessage(err.message, err, res, err.statusCode);
  }
  return resetToken;
};

const createPassword = async (password, cpassword) => {
  
  if (password !== cpassword || !password) {
    throwsError("Passwords are not matching", 400);
  }

  if (password.length < 8) {
    throwsError("Password should be at least 8 characters long", 400);
  }
  const hashedPassword = await bcrypt.hash(password, 8);
  return hashedPassword;
};

exports.signup = async (req, res) => {
  const { username, email, password, cpassword } = req.body;

  try {
    if (!username || !email || !password || !cpassword) {
      throwsError("All fields are required..", 400);
    }
    const [existingUser] = await pool.query(
      "SELECT * FROM user WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      throwsError("Already user exist..", 400);
    }

    const hashedPassword = await createPassword(password, cpassword);
    // console.log(`from register: successfully hashed the password**`);
    const q = `INSERT INTO user (username,email,password,createdAt) value (?,?,?,FROM_UNIXTIME(?/1000))`;
    const [result] = await pool.query(q, [
      username,
      email,
      hashedPassword,
      Date.now(),
    ]);

    return successMessage("User registered", result.insertId, res, 200);
  } catch (error) {
    console.log(error);
    const statusCode = error.statusCode || 500;
    return errMessage(error.message, error, res, statusCode);
  }
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      throwsError("All fields are required..", 400);
    }
    const [result] = await pool.query(`SELECT * FROM user WHERE email = ?`, [
      email,
    ]);

    if (
      !result.length ||
      !(await bcrypt.compare(password, result[0].password))
    ) {
      throwsError("Email or password is incorrect..", 403);
    }
    const jwt_token = jwtToken(result[0].id);
    // console.log(jwt_token);
    setCookie(res, "jwt", jwt_token);
    const user = { ...result[0] };

    delete user.password;
    delete user.passwordResetToken;
    delete user.passwordResetExpires;
    delete user.passwordChangedAt;
    console.log("this does not work");
    return res.status(200).redirect("/main");

      // return successMessage(
      //   "User has successfully logged in",
      //   { user, jwt: jwt_token, cookie: req.cookies.jwt },
      //   res,
      //     200
      // );
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return errMessage(err.message, err, res, statusCode);
  }
};

exports.signout = (req, res) => {
  res.cookie("jwt", "logout", {
    expires: new Date(Date.now() + 2 * 1000),
    httpOnly: true,
  });
  // return successMessage("successfully logged out", [], res, 200);
  res.status(200).redirect("/main");
};

//to be finished letter
exports.isSignedIn = async (req, res, next) => {
  if (!req.cookies.jwt) {
    req.user = undefined;
    return next();
  }

  try {
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    );
    const q = `SELECT u.id,u.username,u.email,u.profilePicture,u.backgroundPicture,u.bio,
                u.birthdate,count(b.blog) AS blog_count FROM user AS u left join blogs AS b on
                u.id = b.bloogger_id and b.delete_blog = false where u.id = ? GROUP BY u.id,u.username,
                u.email,u.profilePicture,u.backgroundPicture,u.bio,u.birthdate`;

    const [result] = await pool.query(q, [decoded.id]);
    req.user = result[0] || undefined;
    return next();
  } catch (err) {
    console.log(err);
    req.user = undefined;
  }

  return next();
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log(email);
  try {
    const [result] = await pool.query(`SELECT * FROM user WHERE email = ?`, [
      email,
    ]);
    if (!result.length) {
      return throwsError("No email found", 400);
    }
    const resetToken = await createPasswordResetToken(result[0].email, res); //acquired reset token
    const resetPasswordUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/auth/resetPassword/${resetToken}`;
    const resetPasswordUrlMessage = `forgot your password? submit a patch request with your password and confirm password to: <a href="${resetPasswordUrl}">Click here</a> if you didn't forget your password, please ignore this message!`;

    try {
      await sendEmail({
        email,
        subject: "Your password reset token (Valid for only 10 minutes)",
        message: resetPasswordUrlMessage,
      });
      return successMessage(
        "Reset password request sent to your email",
        { url: resetPasswordUrl, token: resetToken },
        res,
        200
      );
    } catch (err) {
      console.log(err);
      // If sending email fails, reset password token and expire time
      const q = `UPDATE user SET
        passwordResetToken = NULL ,
        passwordResetExpires = NULL
        WHERE email = ?`;
      await pool.query(q, [email]);
      return throwsError("Reset password failed", 400);
    }
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return errMessage(err.message, err, res, statusCode);
  }
};

exports.resetPassword = async (req, res) => {
  // console.log(req.params.token);
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const { password, cpassword } = req.body;
  console.log("from body, ", req.body);
  try {
    const [result] = await pool.query(
      "SELECT * FROM user WHERE  passwordResetToken = ? AND passwordResetExpires > FROM_UNIXTIME(?/1000)",
      [hashedToken, Date.now()]
    );
    if (!result[0]) {
      throwsError("Reset token is invalid or expired", 400);
    }
    const hashedPassword = await createPassword(password, cpassword);
    const q = `UPDATE user SET password = ?,
              passwordChangedAt = FROM_UNIXTIME(?/1000),
              passwordResetExpires = NULL,
              passwordResetToken = NULL
              WHERE id = ?`;
    await pool.query(q, [hashedPassword, Date.now() - 1, result[0].id]);
    successMessage("Password has been successfully reseted", [], res, 200);
  } catch (err) {
    errMessage(err.message, err, res, err.statusCode);
  }
};
