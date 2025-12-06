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
    searchHotels, getHotelsByHostById
} from "../controller/hotel.controller.js";

import { auth } from "../middlewares/is_Auth.js";
import { host } from "../middlewares/is_Host.js";
import upload from "../middlewares/hotelUpload.js";
import { admin } from "../middlewares/is_Admin.js";


router.get("/", getAllHotels);

router.get("/host", auth, host, getHotelsByHost);
router.get("/search", searchHotels);

router.get("/:id", getHotelById);

router.post("/", auth, host, upload.array("images", 5), createHotel);
router.put("/:id", auth, host, updateHotel);
router.patch("/:id/images", auth, host, upload.array("images", 5), updateHotelImages);

router.delete("/:id", auth, host, deleteHotel);

router.get("/by-host/:hostId", auth, getHotelsByHostById);



export default router;