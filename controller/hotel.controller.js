import HotelModel from "../models/hotel_model.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import mongoose from "mongoose";

// Create new hotel
const createHotel = asyncHandler(async (req, res) => {
    const {
        name,
        description,
        price,
        amenities,
        address,
        rooms

    } = req.body;

    // Validate required fields
    if (!name || !address?.country || !address?.city || !address?.street) {
        return res.status(400).json({
            message: "Name, price, and complete address (country, city, street) are required"
        });
    }
    const images = req.files.map(file => file.path);

    const newHotel = new HotelModel({
        hostId: req.user._id,
        name,
        description,
        images: images || [],
        price,
        amenities: amenities || [],
        address,
        rooms: rooms || []
    });

    const savedHotel = await newHotel.save();
    res.status(201).json(savedHotel);
});



const updateHotelImages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const hotel = await HotelModel.findOne({ _id: id, hostId: req.user._id });
    
    if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
    }

    // ضيف الصور الجديدة بس
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.path);
        hotel.images = [...hotel.images, ...newImages];
    }

    await hotel.save();
    res.status(200).json(hotel);
});

// Delete hotel
const deleteHotel = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid hotel ID" });
    }

    const deletedHotel = await HotelModel.findOneAndDelete({
        _id: id,
        hostId: req.user._id
    });

    if (!deletedHotel) {
        return res.status(404).json({ message: "Hotel not found" });
    }

    res.status(200).json({
        message: "Hotel deleted successfully",
        deletedHotel
    });
});

// Get hotels by host
const getHotelsByHost = asyncHandler(async (req, res) => {
    const hostId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(hostId)) {
        return res.status(400).json({ message: "Invalid host ID" });
    }

    const hotels = await HotelModel.find({ hostId });
    res.status(200).json(hotels);
});


// ✅ IMPROVED: Get all hotels with error handling
 const getAllHotels = asyncHandler(async (req, res) => {
  try {
    const hotels = await HotelModel.find()
      .populate('hostId', 'name email image')
      .sort({ createdAt: -1 }); // ✅ Sort by newest first

    res.status(200).json(hotels);
  } catch (error) {
    console.error("Error fetching hotels:", error);
    res.status(500).json({ message: "Failed to fetch hotels" });
  }
});

// ✅ IMPROVED: Get hotel by ID with better validation
 const getHotelById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid hotel ID format" });
  }

  const hotel = await HotelModel.findById(id).populate('hostId', 'name email image phone');

  if (!hotel) {
    return res.status(404).json({ message: "Hotel not found" });
  }

  res.status(200).json(hotel);
});

// ✅ IMPROVED: Search with better filters
 const searchHotels = asyncHandler(async (req, res) => {
  const {
    city,
    country,
    minPrice,
    maxPrice,
    minRating,
    amenities,
    sortBy = 'createdAt', // ✅ Default sort
    order = 'desc'
  } = req.query;

  let filter = {};

  // Location filters (case-insensitive)
  if (city) filter['address.city'] = new RegExp(city, 'i');
  if (country) filter['address.country'] = new RegExp(country, 'i');

  // Price range filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Rating filter
  if (minRating) {
    filter.starRating = { $gte: Number(minRating) };
  }

  // Amenities filter
  if (amenities) {
    const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
    filter.amenities = { $all: amenitiesArray }; // ✅ Changed from $in to $all
  }

  // ✅ Sorting
  const sortOrder = order === 'asc' ? 1 : -1;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;

  const hotels = await HotelModel.find(filter)
    .populate('hostId', 'name email image')
    .sort(sortOptions);

  res.status(200).json(hotels);
});


 const updateHotel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid hotel ID format" });
  }

  // Prevent updating hostId
  if (updateData.hostId) {
    delete updateData.hostId;
  }

  // ✅ Validate price if provided
  if (updateData.price && updateData.price < 0) {
    return res.status(400).json({ message: "Price cannot be negative" });
  }

  const updatedHotel = await HotelModel.findOneAndUpdate(
    { _id: id, hostId: req.user._id },
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('hostId', 'name email image');

  if (!updatedHotel) {
    return res.status(404).json({ 
      message: "Hotel not found or you don't have permission to update it" 
    });
  }

  res.status(200).json({
    message: "Hotel updated successfully",
    data: updatedHotel
  });
});

const getHotelsByHostById = asyncHandler(async (req, res) => {
    const { hostId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(hostId)) {
        return res.status(400).json({ message: "Invalid host ID" });
    }

    const hotels = await HotelModel.find({ hostId });
    res.status(200).json(hotels);
});

export {
    getAllHotels,
    getHotelById,
    createHotel,
    updateHotel,
    updateHotelImages,
    deleteHotel,
    getHotelsByHost,
    searchHotels,
    getHotelsByHostById
};

