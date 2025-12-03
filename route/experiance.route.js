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
    getExperiencesByHostById
} from "../controller/experiance.controller.js";


import { auth } from "../middlewares/is_Auth.js";
import { host } from "../middlewares/is_Host.js";
import upload from "../middlewares/experianceUpload.js";
import { admin } from "../middlewares/is_Admin.js";

router.get("/", getAllExperiences);

router.get("/host", auth, host, getExperiencesByHost);
router.get("/search", searchExperiences);

router.get("/:id", getExperienceById);

router.post("/", auth, host, upload.array("images", 5), createExperience);
router.put("/:id", auth, host, updateExperience);
router.delete("/:id", auth,  host, deleteExperience);

// علشان تعديل الصورة بتاعت الاكسبريانس
router.post("/:id/images", auth, host, upload.array("images", 5), addExperienceImages);

router.post("/:id/activities", auth, host, upload.single("image"), addActivity);
router.delete("/:id/activities/:activityId", auth, host, removeActivity);

router.post("/:id/dates", auth, host, addDate);
router.delete("/:id/dates", auth, host, removeDate);


router.get("/by-host/:hostId", auth,admin, getExperiencesByHostById);



export default router;