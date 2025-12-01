import { asyncHandler } from "../middlewares/errorHandler.js";
import User from "../models/user_model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { template,hostApprovalTemplate,hostRejectionTemplate } from "../email/emailTemplate.js";
import sendEmail from "../email/email.js";

export const signup = asyncHandler(async (req, res) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(409).json({ 
      message: "This email is already registered" 
    });
  }

  // Hash password
  req.body.password = await bcrypt.hash(req.body.password, 10);

  // Create user
  let user = await User.create(req.body);
  user.password = undefined;

  // Generate verification token
  const token = jwt.sign({ email: req.body.email }, "myEmail", {
    expiresIn: "24h", // ✅ زودت المدة من ساعة لـ 24 ساعة
  });

  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/user/verify/${token}`;
  const htmlTemplate = template(verificationLink);

  try {
    await sendEmail(req.body.email, "Verify Your Email", htmlTemplate);
  } catch (error) {
    console.error("Email sending error:", error);
    // ✅ Don't fail registration if email fails
  }

  res.status(201).json({
    message: "Account created successfully. Please check your email for verification.",
    data: user,
  });
});

// ✅ تحسين الـ signin function
export const signin = asyncHandler(async (req, res) => {
  // Find user
  let user = await User.findOne({ email: req.body.email });
  
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check email confirmation
  if (user.isConfirmed === false) {
    return res.status(403).json({ 
      message: "Please verify your email before logging in. Check your inbox." 
    });
  }

  // Generate token
  let token = jwt.sign(
    { 
      _id: user._id, 
      activeRole: user.activeRole, 
      email: user.email 
    }, 
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' } // ✅ أضفت expiration time
  );

  return res.json({
    message: "Login successful",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      activeRole: user.activeRole,
    },
    token,
  });
});

//logout
export const logout = asyncHandler(async (req, res) => {
  return res.status(200).json({ message: "User logged out successfully" });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json(users);
});

//switchRole[guest-host]
export const switchRole = asyncHandler(async (req, res) => {
  const { newRole } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  
  if (user.activeRole === "guest" && newRole === "host") {
    if (!user.identityImageUrl) {
      return res.status(400).json({ message: "Upload your ID first" });
    }
    if (user.isVerified !== "verified") {
      return res.status(400).json({ message: "Wait for admin approval" });
    }
  }

  user.activeRole = newRole;
  await user.save();

  // 🔥 Generate new token with updated activeRole
  const newToken = jwt.sign(
    { 
      _id: user._id, 
      activeRole: user.activeRole, 
      email: user.email 
    }, 
    'secret'
  );

  res.status(200).json({
    message: `Role switched to '${newRole}' successfully`,
    activeRole: user.activeRole,
    token: newToken, // ✅ Return new token
    user: {
      _id: user._id,
      email: user.email,
      role: user.role,
      activeRole: user.activeRole,
    }
  });
});


export const verifyIdentity = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status, reason } = req.body;

  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid verification status" });
  }

  if (!reason || reason.trim() === "") {
    return res.status(400).json({ message: "Reason is required" });
  }

  if (reason.trim().length < 10) {
    return res.status(400).json({ message: "Reason must be at least 10 characters" });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isVerified = status;
  user.role = status === "verified" ? ["guest", "host"] : ["guest"];
  await user.save();

  let emailSubject, emailTemplate;

  if (status === "verified") {
    emailSubject = "🎉 Your Host Application Has Been Approved!";
    emailTemplate = hostApprovalTemplate(user.name, reason);
  } else {
    emailSubject = "Host Application Update - Tripper";
    emailTemplate = hostRejectionTemplate(user.name, reason);
  }

  try {
    await sendEmail(user.email, emailSubject, emailTemplate);
  } catch (error) {
    console.error("Email sending error:", error);
    return res.status(500).json({ 
      message: "User status updated but failed to send email",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        role: user.role
      }
    });
  }

  res.status(200).json({
    message: `User ${status === 'verified' ? 'approved' : 'rejected'} successfully and email sent`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role
    }
  });
});


export const confirmEmail = asyncHandler(async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, "myEmail");

    const user = await User.findOneAndUpdate(
      { email: decoded.email },
      { isConfirmed: true },
      { new: true }
    );

    if (!user) return res.status(404).send("User not found");

    res.status(200).send("Email confirmed successfully");
    // res.redirect("http://localhost:4000/signin");
  } catch (err) {
    console.error("Verify error:", err);
    // res.redirect("http://localhost:4000/signup");
  }
});


//uploadIdentityCard
export const uploadIdentity = asyncHandler(async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Please upload an ID image" });
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.identityImageUrl = req.file.path;
  user.isVerified = "pending";
  await user.save()
  res.status(200).json({
    message: "Identity uploaded successfully. Waiting for admin approval.",
    identityImage: user.identityImageUrl,
    status: user.isVerified,
  });

});

export const filterUsersByStatus = asyncHandler(async (req, res) => {
  const { isVerified } = req.query;
  const filter = isVerified ? { isVerified } : {};
  const users = await User.find(filter);
  res.status(200).json(users);
});


//Hazem
// export const getUserProfile = async (req, res) => {
//   try {
//     const userId = req.user._id; 
//     const user = await User.findById(userId).select('name phone email role isConfirmed isVerified'); 
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     res.status(200).json({
//       message: "User profile fetched successfully",
//       user: {
//         name: user.name,
//         phone: user.phone,
//         email: user.email,
//         role: user.role,
//         isConfirmed: user.isConfirmed,
//         isVerified: user.isVerified
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Something went wrong", error: err.message });
//   }
// };


// Mina


//Mina
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "name email phone image activeRole isVerified isConfirmed"
  );

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.status(200).json({
    success: true,
    data: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      activeRole: user.activeRole,
      isVerified: user.isVerified,
      isConfirmed: user.isConfirmed
    },
  });
});


export const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;
  
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (email) user.email = email;

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      name: user.name,
      phone: user.phone,
      email: user.email,
      image: user.image,
      activeRole: user.activeRole,
      isVerified: user.isVerified,
      isConfirmed: user.isConfirmed
    }
  });
});


export const updateUserProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image uploaded" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  user.image = req.file.path;
  await user.save();

  res.status(200).json({
    success: true,
    data: { image: user.image },
    message: "Profile image updated successfully"
  });
});