const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
dotenv.config({ path: "./config.env" });
const morgan = require("morgan");
const mysql = require("mysql2");
const blogRoute = require("./Route/blogRoute");
const authRoute = require("./Route/authRoute");
const userRoute = require("./Route/userRoute");
const pagesRoute = require("./Route/pagesRoute");
const friendRoute = require("./Route/friendRoute");


const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(`${__dirname}/Public`));
app.set("view engine", "hbs");


app.use(morgan("dev"));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.log("error connecting to the database");
    return;
  }
  console.log("Connected to database");
});

app.use("/api/v1", blogRoute);
app.use("/api/v1/auth", authRoute);
app.use("/", pagesRoute);
app.use("/user", userRoute);
app.use("/", friendRoute);

app.use("*", (req, res) => {
  res.status(404).json({ status: "failed", message: "Page not found" });
});


const port = process.env.PORT || 7000;
const localhost = process.env.LOCALHOST;
app.listen(port, localhost, () => {
  console.log(`server is running on port ${port}`);
});
