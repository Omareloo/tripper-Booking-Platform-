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
  getExperienceStats
} from "../controller/experiance.controller.js";

import { auth } from "../middlewares/is_Auth.js";
import { host } from "../middlewares/is_Host.js";
import upload from "../middlewares/experianceUpload.js";
import { admin } from "../middlewares/is_Admin.js";


// ------------------ Public ------------------
router.get("/", getAllExperiences);
router.get("/search", searchExperiences);

// ------------------ Admin ------------------
router.get("/admin/stats", auth, admin, getExperienceStats);
router.delete("/admin/:id", auth, admin, deleteExperience);

// ------------------ Host ------------------
router.get("/host", auth, host, getExperiencesByHost);
router.get("/by-host/:hostId", auth, getExperiencesByHostById);
router.post("/", auth, host, upload.array("images", 5), createExperience);

// ------------------ CRUD (AFTER ADMIN & HOST) ------------------
router.get("/:id", getExperienceById);
router.put("/:id", auth, host, updateExperience);
router.delete("/:id", auth, host, deleteExperience);


// Images
router.post("/:id/images", auth, host, upload.array("images", 5), addExperienceImages);

// Activities
router.post("/:id/activities", auth, host, upload.single("image"), addActivity);
router.delete("/:id/activities/:activityId", auth, host, removeActivity);

// Dates
router.post("/:id/dates", auth, host, addDate);
router.delete("/:id/dates", auth, host, removeDate);

export default router;
