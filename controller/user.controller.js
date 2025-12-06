

import { asyncHandler } from "../middlewares/errorHandler.js";
import User from "../models/user_model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { template,hostApprovalTemplate,hostRejectionTemplate } from "../email/emailTemplate.js";
import sendEmail from "../email/email.js";
import mongoose from "mongoose";

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
    expiresIn: "24h",
  });

  // ✅ الـ link يروح على الـ Backend endpoint
  const verificationLink = `${process.env.BACKEND_URL || 'http://localhost:5000'}/user/verify/${token}`;
  const htmlTemplate = template(verificationLink);

  try {
    await sendEmail(req.body.email, "Verify Your Email", htmlTemplate);
  } catch (error) {
    console.error("Email sending error:", error);
  }

  res.status(201).json({
    message: "Account created successfully. Please check your email for verification.",
    data: user,
  });
});


export const getHostProfileById = asyncHandler(async (req, res) => {
  const { hostId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(hostId)) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid host ID format" 
    });
  }

  const user = await User.findById(hostId).select(
    "name email phone image role activeRole isVerified createdAt bio"
  );

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: "Host not found" 
    });
  }

  res.status(200).json({
    success: true,
    data: user
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

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:4000'}/verify-email?status=error&message=${encodeURIComponent('User not found')}`
      );
    }

    // ✅ Success redirect
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:4000'}/verify-email?status=success`
    );
    
  } catch (err) {
    console.error("Verify error:", err);
    
    const errorMessage = err.name === 'TokenExpiredError' 
      ? 'Verification link has expired' 
      : 'Invalid verification link';
    
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:4000'}/verify-email?status=error&message=${encodeURIComponent(errorMessage)}`
    );
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

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ 
      message: "No account found with this email address" 
    });
  }

  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1h" }
  );

  // Create reset link
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/reset-password?token=${resetToken}`;

  // Email template
  const emailTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; 
                    color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>We received a request to reset your password for your Tripper account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
            <p>For security reasons, never share this link with anyone.</p>
          </div>
          <div class="footer">
            <p>© 2024 Tripper. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await sendEmail(email, "Reset Your Password - Tripper", emailTemplate);
    res.status(200).json({ 
      message: "Password reset link sent to your email" 
    });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ 
      message: "Failed to send reset email. Please try again." 
    });
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ 
      message: "Token and new password are required" 
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ 
      message: "Password must be at least 8 characters" 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Send confirmation email
    const confirmationEmail = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
            <h2 style="color: #4caf50;">✅ Password Changed Successfully</h2>
            <p>Hi ${user.name},</p>
            <p>Your password has been successfully reset. You can now log in with your new password.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <p style="margin-top: 30px;">Best regards,<br/>The Tripper Team</p>
          </div>
        </body>
      </html>
    `;

    try {
      await sendEmail(user.email, "Password Changed - Tripper", confirmationEmail);
    } catch (error) {
      console.error("Confirmation email error:", error);
    }

    res.status(200).json({ 
      message: "Password reset successful. You can now log in with your new password." 
    });

  } catch (err) {
    console.error("Reset password error:", err);
    
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ 
        message: "Reset link has expired. Please request a new one." 
      });
    }
    
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ 
        message: "Invalid reset link" 
      });
    }

    res.status(500).json({ 
      message: "Failed to reset password. Please try again." 
    });
  }
});