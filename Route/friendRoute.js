const router = require("express").Router();
const authController = require("../Controller/authController");
const friendController = require("../Controller/friendController");
const commentController = require("../Controller/commentController");

// router.route("/all-users").get(authController.isSignedIn, friendController.users);
router.route("/all-users").post(authController.isSignedIn, friendController.users);

router.route("/send-friend-request").post(authController.isSignedIn, friendController.sendFriendRequest);

router.route("/check-friend-request").get(authController.isSignedIn, friendController.checkPendingRequest);
  
router.route("/change-request-status").patch(authController.isSignedIn, friendController.changeRequestStatus);

router.route("/see-friends").get(authController.isSignedIn, friendController.seeFriends);

router.route("/get-my-friends").get(authController.isSignedIn, friendController.getAllFriends);

router.route("/check-if-friends").post(authController.isSignedIn, friendController.checkIfFriends);

router.route("/get-pending-request-count").get(authController.isSignedIn, friendController.getPendingRequestCount);

router.route("/search-user/:searched").post(authController.isSignedIn, friendController.searchFriends);

router.route("/get-friend-blog-comment-count/:blog_id").get(commentController.getFriendBlogCommentCount);

module.exports = router;