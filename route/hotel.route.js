import express from "express";
const router = express.Router();

import {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelsByHost,
  updateHotelImages,
  searchHotels,
  getHotelsByHostById,
  getHotelStats
} from "../controller/hotel.controller.js";

import { auth } from "../middlewares/is_Auth.js";
import { host } from "../middlewares/is_Host.js";
import upload from "../middlewares/hotelUpload.js";
import { admin } from "../middlewares/is_Admin.js";


// ------------------ Public ------------------
router.get("/", getAllHotels);
router.get("/search", searchHotels);

// ------------------ Admin ------------------
router.get("/admin/stats", auth, admin, getHotelStats);
router.delete("/admin/:id", auth, admin, deleteHotel);

// ------------------ Host ------------------
router.get("/host", auth, host, getHotelsByHost);
router.get("/by-host/:hostId", auth, getHotelsByHostById);
router.post("/", auth, host, upload.array("images", 5), createHotel);

// ------------------ CRUD (بعد admin و host) ------------------
router.get("/:id", getHotelById);
router.put("/:id", auth, host, updateHotel);
router.patch("/:id/images", auth, host, upload.array("images", 5), updateHotelImages);
router.delete("/:id", auth, host, deleteHotel);

export default router;
