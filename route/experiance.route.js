import express from "express";
const router = express.Router();

import {
    getAllExperiences,
    getExperienceById,
    createExperience,
    updateExperience,
    deleteExperience,
    getExperiencesByHost,
    searchExperiences,
    addActivity,
    removeActivity,
    addDate,
    addExperienceImages,
    removeDate,
    getExperiencesByHostById,
    getExperienceStats  // ← إضافة دي
} from "../controller/experiance.controller.js";

import { auth } from "../middlewares/is_Auth.js";
import { host } from "../middlewares/is_Host.js";
import upload from "../middlewares/experianceUpload.js";
import { admin } from "../middlewares/is_Admin.js";

// Public routes
router.get("/", getAllExperiences);
router.get("/search", searchExperiences);
router.get("/:id", getExperienceById);

// Admin routes
router.get("/admin/stats", auth, admin, getExperienceStats);  // ← إضافة دي
router.delete("/admin/:id", auth, admin, deleteExperience);   // ← admin delete

// Host routes
router.get("/host", auth, host, getExperiencesByHost);
router.post("/", auth, host, upload.array("images", 5), createExperience);
router.put("/:id", auth, host, updateExperience);
router.delete("/:id", auth, host, deleteExperience);  // host delete

router.post("/:id/images", auth, host, upload.array("images", 5), addExperienceImages);
router.post("/:id/activities", auth, host, upload.single("image"), addActivity);
router.delete("/:id/activities/:activityId", auth, host, removeActivity);
router.post("/:id/dates", auth, host, addDate);
router.delete("/:id/dates", auth, host, removeDate);
router.get("/by-host/:hostId", auth, getExperiencesByHostById);

export default router;