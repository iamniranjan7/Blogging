const express = require("express");
const router = express.Router();
const blogController = require("../Controller/blogController");
const authController = require("../Controller/authController");

router.route("/create-blog").post(authController.isSignedIn, blogController.createBlog);
router.route("/get-blog").post(blogController.getBlogs);
router.route("/delete-blog").delete(blogController.deleteBlog);
router.route("/my-blog").get(authController.isSignedIn,blogController.getMyBlogs);
router.route("/user-blog/:id").post(authController.isSignedIn, blogController.getUserBlogs);

router.route("/get-friend-blogs/:loadCount?").get(authController.isSignedIn, blogController.getFriendsPublicPrivateBlog);

module.exports = router;
