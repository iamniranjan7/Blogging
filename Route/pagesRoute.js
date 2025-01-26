const router = require("express").Router();
const authController = require("../Controller/authController");
const userController = require("../Controller/userController");
const friendController = require("../Controller/friendController");

router.get("/main", authController.isSignedIn, (req, res) => {
  res.render("index");
});


router.get("/create", authController.isSignedIn, (req, res) => {
  res.render("createblog");
});

router.get("/update-profile", authController.isSignedIn, (req, res) => {
  res.render("updateProfile");
});

router.get("/register", authController.isSignedIn, (req, res) => {
  res.render("register");
});

router.get("/login", authController.isSignedIn, (req, res) => {
  if (req.user) {
    res.render("index");
    return;
  }
  res.render("login");
});

router.get("/update-password", authController.isSignedIn, (req, res) => {
  res.render("update-password");
});

router.get("/my-posts", authController.isSignedIn, (req, res) => {
  res.render("my-profile");
});

router.get("/see-users", (req, res) => {
  res.render("see-users");
});

router.get("/see-users/:user_id", (req, res) => {
  res.render("user-profile");
});

router.get("/accept-friend-request/:user_id", (req, res) => {
  res.render("accept-req");
});

router.get(
  "/see-users/:user_id/userInfo",
  authController.isSignedIn,
  friendController.userProfile
);

router.get("/api/v1/auth/resetPassword/:token", (req, res) => {
  res.render("resetPassword");
});


router.get(
  "/accept-friend-request/:user_id/userInfo",
  authController.isSignedIn,
  friendController.userProfile
);

router.get("/no-user-found", (req, res) => {
  res.render("no-user-found");
});

router.get("/requests", (req, res) => {
  res.render("requests");
});


router.get("/friendsWith", (req, res) => {
  res.render("friendsWith");
});

router.get("/manage-friends", (req, res) => {
  res.render("manageFriends");
});

router.get("/search-user/:searched",(req, res) => {
  res.render("search");
});

router.get("/friends-blogs",(req, res) => {
  res.render("friends-blogs");
});

router.get("/forgot-password", (req, res) => {
  res.render("forgot-password");
});


router.get("/test-comment", (req, res) => {
  res.render("testComment");
})

module.exports = router;
