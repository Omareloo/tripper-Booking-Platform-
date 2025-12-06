import Plan from "../models/plan_model.js";
import Reservation from "../models/reservation_model.js";
import HotelModel from "../models/hotel_model.js";
import ExperienceModel from "../models/experiance_model.js";
import Place from "../models/place_model.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

// Create a new plan (draft)
export const createPlan = asyncHandler(async (req, res) => {
  const { placeId, name, description, startDate, endDate, hotels, experiences } = req.body;
  const userId = req.user._id;

  if (!placeId || !name || !startDate || !endDate) {
    return res.status(400).json({ 
      message: "Place, name, start date, and end date are required" 
    });
  }

  // Verify place exists
  const place = await Place.findById(placeId);
  if (!place) {
    return res.status(404).json({ message: "Place not found" });
  }

  let totalPrice = 0;
  let totalGuests = 0;

  // Calculate prices for hotels
  if (hotels && hotels.length > 0) {
    for (const hotelData of hotels) {
      const hotel = await HotelModel.findById(hotelData.hotelId);
      if (!hotel) {
        return res.status(404).json({ message: `Hotel not found: ${hotelData.hotelId}` });
      }
      
      totalPrice += hotelData.totalPrice || 0;
      
      // Count guests from rooms
      if (hotelData.rooms) {
        hotelData.rooms.forEach(room => {
          totalGuests += room.guestsData?.length || 0;
        });
      }
    }
  }

  // Calculate prices for experiences
  if (experiences && experiences.length > 0) {
    for (const expData of experiences) {
      const experience = await ExperienceModel.findById(expData.experienceId);
      if (!experience) {
        return res.status(404).json({ message: `Experience not found: ${expData.experienceId}` });
      }
      
      totalPrice += expData.totalPrice || 0;
      totalGuests += expData.guestsCount || 0;
    }
  }

  const newPlan = new Plan({
    userId,
    placeId,
    name,
    description,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    hotels: hotels || [],
    experiences: experiences || [],
    totalGuests,
    totalPrice,
    status: "draft"
  });

  const savedPlan = await newPlan.save();
  await savedPlan.populate("placeId hotels.hotelId experiences.experienceId");

  res.status(201).json({
    message: "Plan created successfully",
    data: savedPlan
  });
});

// Get all plans for current user
export const getUserPlans = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const plans = await Plan.find({ userId })
    .populate("placeId", "name images address")
    .populate("hotels.hotelId", "name images price address")
    .populate("experiences.experienceId", "name images price")
    .sort({ createdAt: -1 });

  res.status(200).json(plans);
});

// Get plan by ID
export const getPlanById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const plan = await Plan.findById(id)
    .populate("placeId", "name images address description")
    .populate("hotels.hotelId", "name images price address amenities")
    .populate("experiences.experienceId", "name images price activities")
    .populate("reservationIds");

  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  // Check if user owns this plan
  if (plan.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.status(200).json(plan);
});

// Update plan
export const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const plan = await Plan.findOne({ _id: id, userId: req.user._id });
  
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  if (plan.status === "booked") {
    return res.status(400).json({ 
      message: "Cannot update a booked plan. Cancel it first." 
    });
  }

  // Recalculate totals if hotels/experiences changed
  if (updateData.hotels || updateData.experiences) {
    let totalPrice = 0;
    let totalGuests = 0;

    const hotels = updateData.hotels || plan.hotels;
    const experiences = updateData.experiences || plan.experiences;

    hotels.forEach(h => {
      totalPrice += h.totalPrice || 0;
      h.rooms?.forEach(r => totalGuests += r.guestsData?.length || 0);
    });

    experiences.forEach(e => {
      totalPrice += e.totalPrice || 0;
      totalGuests += e.guestsCount || 0;
    });

    updateData.totalPrice = totalPrice;
    updateData.totalGuests = totalGuests;
  }

  Object.assign(plan, updateData);
  await plan.save();
  
  await plan.populate("placeId hotels.hotelId experiences.experienceId");

  res.status(200).json({
    message: "Plan updated successfully",
    data: plan
  });
});

// Delete plan
export const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const plan = await Plan.findOne({ _id: id, userId: req.user._id });
  
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  if (plan.status === "booked" && plan.reservationIds.length > 0) {
    return res.status(400).json({ 
      message: "Cannot delete a booked plan with active reservations" 
    });
  }

  await plan.deleteOne();

  res.status(200).json({ message: "Plan deleted successfully" });
});

// Book the entire plan (convert draft to booked)
export const bookPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const plan = await Plan.findOne({ _id: id, userId: req.user._id });
  
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  if (plan.status === "booked") {
    return res.status(400).json({ message: "Plan is already booked" });
  }

  const reservationIds = [];

  // Create reservations for each hotel
  for (const hotelData of plan.hotels) {
    const reservation = new Reservation({
      guestId: req.user._id,
      hotelId: hotelData.hotelId,
      rooms: hotelData.rooms,
      checkIn: hotelData.checkIn,
      checkOut: hotelData.checkOut,
      totalGuests: hotelData.rooms.reduce((sum, r) => sum + r.guestsData.length, 0),
      totalPrice: hotelData.totalPrice,
      status: "pending"
    });

    const savedReservation = await reservation.save();
    reservationIds.push(savedReservation._id);
  }

  // Create reservations for each experience
  for (const expData of plan.experiences) {
    const reservation = new Reservation({
      guestId: req.user._id,
      experienceId: expData.experienceId,
      checkIn: expData.date,
      totalGuests: expData.guestsCount,
      totalPrice: expData.totalPrice,
      status: "pending"
    });

    const savedReservation = await reservation.save();
    reservationIds.push(savedReservation._id);
  }

  // Update plan status
  plan.status = "booked";
  plan.reservationIds = reservationIds;
  await plan.save();

  await plan.populate("placeId hotels.hotelId experiences.experienceId reservationIds");

  res.status(200).json({
    message: "Plan booked successfully! Reservations created.",
    data: plan
  });
});

// Add hotel to existing plan
export const addHotelToPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotelData = req.body;
  
  const plan = await Plan.findOne({ _id: id, userId: req.user._id });
  
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  if (plan.status === "booked") {
    return res.status(400).json({ message: "Cannot modify a booked plan" });
  }

  plan.hotels.push(hotelData);
  plan.totalPrice += hotelData.totalPrice || 0;
  
  hotelData.rooms?.forEach(r => {
    plan.totalGuests += r.guestsData?.length || 0;
  });

  await plan.save();
  await plan.populate("hotels.hotelId");

  res.status(200).json({
    message: "Hotel added to plan",
    data: plan
  });
});

// Add experience to existing plan
export const addExperienceToPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expData = req.body;
  
  const plan = await Plan.findOne({ _id: id, userId: req.user._id });
  
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  if (plan.status === "booked") {
    return res.status(400).json({ message: "Cannot modify a booked plan" });
  }

  plan.experiences.push(expData);
  plan.totalPrice += expData.totalPrice || 0;
  plan.totalGuests += expData.guestsCount || 0;

  await plan.save();
  await plan.populate("experiences.experienceId");

  res.status(200).json({
    message: "Experience added to plan",
    data: plan
  });
});

// Remove hotel from plan
export const removeHotelFromPlan = asyncHandler(async (req, res) => {
  const { id, hotelId } = req.params;
  
  const plan = await Plan.findOne({ _id: id, userId: req.user._id });
  
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  if (plan.status === "booked") {
    return res.status(400).json({ message: "Cannot modify a booked plan" });
  }

  const hotelIndex = plan.hotels.findIndex(h => h.hotelId.toString() === hotelId);
  
  if (hotelIndex === -1) {
    return res.status(404).json({ message: "Hotel not found in plan" });
  }

  const removedHotel = plan.hotels[hotelIndex];
  plan.totalPrice -= removedHotel.totalPrice || 0;
  
  removedHotel.rooms?.forEach(r => {
    plan.totalGuests -= r.guestsData?.length || 0;
  });

  plan.hotels.splice(hotelIndex, 1);
  await plan.save();

  res.status(200).json({
    message: "Hotel removed from plan",
    data: plan
  });
});

// Remove experience from plan
export const removeExperienceFromPlan = asyncHandler(async (req, res) => {
  const { id, experienceId } = req.params;
  
  const plan = await Plan.findOne({ _id: id, userId: req.user._id });
  
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  if (plan.status === "booked") {
    return res.status(400).json({ message: "Cannot modify a booked plan" });
  }

  const expIndex = plan.experiences.findIndex(e => e.experienceId.toString() === experienceId);
  
  if (expIndex === -1) {
    return res.status(404).json({ message: "Experience not found in plan" });
  }

  const removedExp = plan.experiences[expIndex];
  plan.totalPrice -= removedExp.totalPrice || 0;
  plan.totalGuests -= removedExp.guestsCount || 0;

  plan.experiences.splice(expIndex, 1);
  await plan.save();

  res.status(200).json({
    message: "Experience removed from plan",
    data: plan
  });
});