import { handleValidationErrors } from "../Validators/handleValidationErrors.js";
import { signupValidation } from "../Validators/signupValidations.js";
import { 
  confirmEmail, 
  filterUsersByStatus, 
  getUserProfile, 
  signin, 
  signup, 
  switchRole, 
  uploadIdentity, 
  verifyIdentity, 
  getAllUsers, 
  updateUserProfile, 
  updateUserProfileImage, 
  getHostProfileById, 
  forgotPassword,
  resetPassword
} from "../controller/user.controller.js";
import { isEmailExists } from "../middlewares/isEmailExists.js";
import { auth } from "../middlewares/is_Auth.js";
import { admin } from "../middlewares/is_Admin.js";
import express from "express";
import upload from "../middlewares/identity_cards.js";
import uploadProfileImage from "../middlewares/uploadProfileImage.js";

const userRouter = express.Router();

// ✅ Public Routes (بدون auth)
userRouter.post('/signup', signupValidation, handleValidationErrors, isEmailExists, signup);
userRouter.post('/signin', signin);
userRouter.get("/verify/:token", confirmEmail); // ✅ هنا الـ verification endpoint
userRouter.get("/profile/:hostId", getHostProfileById);

// ✅ Protected Routes (محتاجة auth)
userRouter.get("/profile", auth, getUserProfile);
userRouter.patch("/profile", auth, updateUserProfile);
userRouter.patch("/profile/image", auth, uploadProfileImage.single("image"), updateUserProfileImage);
userRouter.patch("/upload-id", auth, upload.single("identityImageUrl"), uploadIdentity);
userRouter.patch("/switch-role", auth, switchRole);

// ✅ Admin Routes
userRouter.get("/", auth, admin, getAllUsers);
userRouter.patch("/verify/:userId", auth, admin, verifyIdentity);
userRouter.get("/filter", auth, admin, filterUsersByStatus);


userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPassword);

export default userRouter;
