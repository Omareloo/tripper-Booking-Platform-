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
        rooms,
        notes,
        propertyType,
        type // يمكن يجي من الـ frontend كـ type
    } = req.body;

    // Validate required fields
    if (!name || !address?.country || !address?.city || !address?.street) {
        return res.status(400).json({
            message: "Name and complete address (country, city, street) are required"
        });
    }

    const images = req.files.map(file => file.path);

    // استخدام propertyType أو type
    const finalPropertyType = propertyType || type || "hotel";

    const newHotel = new HotelModel({
        hostId: req.user._id,
        name,
        description,
        images: images || [],
        price: price || 0,
        amenities: amenities || [],
        address,
        rooms: rooms || [],
        notes,
        propertyType: finalPropertyType
    });

    const savedHotel = await newHotel.save();
    res.status(201).json(savedHotel);
});

const updateHotelImages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const hotel = await HotelModel.findOne({ _id: id, hostId: req.user._id });
    
    if (!hotel) {
        return res.status(404).json({ message: "Property not found" });
    }

    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.path);
        hotel.images = [...hotel.images, ...newImages];
    }

    await hotel.save();
    res.status(200).json(hotel);
});

const deleteHotel = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
    }

    const deletedHotel = await HotelModel.findOneAndDelete({
        _id: id,
        hostId: req.user._id
    });

    if (!deletedHotel) {
        return res.status(404).json({ message: "Property not found" });
    }

    res.status(200).json({
        message: "Property deleted successfully",
        deletedHotel
    });
});

const getHotelsByHost = asyncHandler(async (req, res) => {
    const hostId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(hostId)) {
        return res.status(400).json({ message: "Invalid host ID" });
    }

    const hotels = await HotelModel.find({ hostId });
    res.status(200).json(hotels);
});

const getAllHotels = asyncHandler(async (req, res) => {
  try {
    const hotels = await HotelModel.find()
      .populate('hostId', 'name email image')
      .sort({ createdAt: -1 });

    res.status(200).json(hotels);
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ message: "Failed to fetch properties" });
  }
});

const getHotelById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid property ID format" });
  }

  const hotel = await HotelModel.findById(id).populate('hostId', 'name email image phone');

  if (!hotel) {
    return res.status(404).json({ message: "Property not found" });
  }

  res.status(200).json(hotel);
});

const searchHotels = asyncHandler(async (req, res) => {
  const {
    city,
    country,
    minPrice,
    maxPrice,
    minRating,
    amenities,
    propertyType,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  let filter = {};

  // Location filters
  if (city) filter['address.city'] = new RegExp(city, 'i');
  if (country) filter['address.country'] = new RegExp(country, 'i');

  // Property type filter
  if (propertyType && propertyType !== 'all') {
    filter.propertyType = propertyType;
  }

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
    filter.amenities = { $all: amenitiesArray };
  }

  // Sorting
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
    return res.status(400).json({ message: "Invalid property ID format" });
  }

  if (updateData.hostId) {
    delete updateData.hostId;
  }

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
      message: "Property not found or you don't have permission to update it" 
    });
  }

  res.status(200).json({
    message: "Property updated successfully",
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

const getHotelStats = asyncHandler(async (req, res) => {
  const totalHotels = await HotelModel.countDocuments();
  
  const topCities = await HotelModel.aggregate([
    { $group: { _id: "$address.city", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const topCountries = await HotelModel.aggregate([
    { $group: { _id: "$address.country", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const avgPrice = await HotelModel.aggregate([
    { $group: { _id: null, avgPrice: { $avg: "$price" } } }
  ]);

  const avgRating = await HotelModel.aggregate([
    { $group: { _id: null, avgRating: { $avg: "$starRating" } } }
  ]);

  const propertyTypeStats = await HotelModel.aggregate([
    { $group: { _id: "$propertyType", count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    totalHotels,
    topCities,
    topCountries,
    propertyTypeStats,
    averagePrice: avgPrice[0]?.avgPrice?.toFixed(2) || 0,
    averageRating: avgRating[0]?.avgRating?.toFixed(2) || 0
  });
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
    getHotelsByHostById,
    getHotelStats 
};