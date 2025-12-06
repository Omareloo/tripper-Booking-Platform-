import express from "express";
import {
  createPlan,
  getUserPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  bookPlan,
  addHotelToPlan,
  addExperienceToPlan,
  removeHotelFromPlan,
  removeExperienceFromPlan
} from "../controller/plan.controller.js";
import { auth } from "../middlewares/is_Auth.js";

const planRouter = express.Router();

// All routes require authentication
planRouter.use(auth);

// CRUD operations
planRouter.post("/", createPlan);                    // Create new plan
planRouter.get("/", getUserPlans);                   // Get all user's plans
planRouter.get("/:id", getPlanById);                 // Get specific plan
planRouter.put("/:id", updatePlan);                  // Update plan
planRouter.delete("/:id", deletePlan);               // Delete plan

// Booking
planRouter.post("/:id/book", bookPlan);              // Book the entire plan

// Add/Remove items from plan
planRouter.post("/:id/hotels", addHotelToPlan);      // Add hotel to plan
planRouter.post("/:id/experiences", addExperienceToPlan); // Add experience to plan
planRouter.delete("/:id/hotels/:hotelId", removeHotelFromPlan); // Remove hotel
planRouter.delete("/:id/experiences/:experienceId", removeExperienceFromPlan); // Remove experience

export default planRouter;