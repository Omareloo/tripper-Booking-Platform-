import { handleValidationErrors } from "../Validators/handleValidationErrors.js";
import { signupValidation } from "../Validators/signupValidations.js";
import { confirmEmail, filterUsersByStatus, getUserProfile, signin, signup, switchRole, uploadIdentity, verifyIdentity, getAllUsers, updateUserProfile, updateUserProfileImage, getHostProfileById } from "../controller/user.controller.js";
import { isEmailExists } from "../middlewares/isEmailExists.js";
import { auth } from "../middlewares/is_Auth.js";
import { admin } from "../middlewares/is_Admin.js";
import express from "express";
import upload from "../middlewares/identity_cards.js";
import uploadProfileImage from "../middlewares/uploadProfileImage.js";

 const userRouter = express.Router()

userRouter.get("/profile/:hostId", getHostProfileById); // ✅ هنا قبل protectRoute

userRouter.post('/signup', signupValidation ,handleValidationErrors, isEmailExists, signup)
userRouter.post('/signin',signin),
userRouter.get("/verify/:token", confirmEmail);
userRouter.patch("/upload-id", auth, upload.single("identityImageUrl"), uploadIdentity);
userRouter.patch("/switch-role", auth, switchRole);
userRouter.patch("/verify/:userId", auth, admin, verifyIdentity);
userRouter.get("/filter", auth, admin, filterUsersByStatus)
userRouter.get("/profile", auth, getUserProfile)
userRouter.patch("/profile", auth, updateUserProfile);
userRouter.patch("/profile/image", auth, uploadProfileImage.single("image"), updateUserProfileImage);



userRouter.get('/', auth, admin, getAllUsers);

export default userRouter   