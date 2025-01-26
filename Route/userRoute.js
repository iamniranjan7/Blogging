const router = require("express").Router();
const userController = require("../Controller/userController");
const authController = require("../Controller/authController");

router.route("/profile").get(
  authController.isSignedIn,
  (req, res, next) => {
    // console.log(req.user);
   
    if (!req.user) {
      req.user = {
        username: "Not logged in",
        bio: "",
        profilePicture:
          "http://res.cloudinary.com/dfxohnig6/image/upload/v1716905965/fa3btlium1l1xgbqw1fi.jpg",
        blog_count : 0,
      };
      next();
    }
     if (!req.user.profilePicture) {
       req.user.profilePicture =
         "http://res.cloudinary.com/dfxohnig6/image/upload/v1716905965/fa3btlium1l1xgbqw1fi.jpg";
     }
    next();
  },
  userController.profile
);

router
  .route("/updatePassword")
  .patch(authController.isSignedIn, userController.updateCurrentPassword);

router
  .route("/updateProfile")
  .patch(
    authController.isSignedIn,
    userController.uploadImage,
    userController.resizeUploadedImage,
    userController.uploadToCloudinary,
    userController.updateProfile
  );
/*
  flow of this router : authenticated ->(if) uploads image ->(if) resize uploaded image ->(if) upload to cloud -> updates profile
*/

module.exports = router;
