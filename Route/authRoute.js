const express = require("express");
const router = express.Router();
const authController = require("../Controller/authController");
const commentController = require("../Controller/commentController");

router.route("/signup").post(authController.signup);
router.route("/signin").post(authController.signin);
router.route("/signout").get(authController.signout);
router.route("/forgotPassword").post(authController.forgotPassword);
router.route("/resetPassword/:token").patch(authController.resetPassword);
router.route("/signout").get(authController.signout);

// handlin comment routes
router.route("/get-comment/:blog_id/:loadCount?").get(commentController.getComments);
router.route("/post-comment").post(authController.isSignedIn,commentController.postComment);

router.route("/get-sub-comment/:blog_id/:reply_id").get(commentController.getSubComments);
router.route("/post-sub-comment").post(authController.isSignedIn, commentController.postSubComment);


router.route("/get-comment-count/:blog_id").get(commentController.getCommentCount);
router.route("/get-blog-like-count/:blog_id").get(commentController.getIndiBlogLike);

router.route("/post-like").post(authController.isSignedIn,commentController.postLike);
router.route("/blogs-like-status").get(authController.isSignedIn,commentController.allBlogLikeStatus);


module.exports = router;