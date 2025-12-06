import ExperienceModel from "../models/experiance_model.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import mongoose from "mongoose";


// Get experience by ID
const getExperienceById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid experience ID" });
    }

    const experience = await ExperienceModel.findById(id).populate('hostId', 'name email image');

    if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
    }

    res.status(200).json(experience);
});


// Update experience
const updateExperience = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid experience ID" });
    }

    // Prevent updating hostId if provided
    if (updateData.hostId) {
        delete updateData.hostId;
    }

    // Validate activities structure if provided in update
    if (updateData.activities && Array.isArray(updateData.activities)) {
        for (let activity of updateData.activities) {
            if (!activity.title) {
                return res.status(400).json({
                    message: "Each activity must have a title"
                });
            }
        }
    }

    const updatedExperience = await ExperienceModel.findOneAndUpdate(
        { _id: id, hostId: req.user._id },
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate('hostId', 'name email');

    if (!updatedExperience) {
        return res.status(404).json({ message: "Experience not found" });
    }

    res.status(200).json(updatedExperience);
});

// Delete experience
const deleteExperience = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid experience ID" });
    }

    const deletedExperience = await ExperienceModel.findByIdAndDelete(id).populate('hostId', 'name email');

    if (!deletedExperience) {
        return res.status(404).json({ message: "Experience not found" });
    }

    res.status(200).json({
        message: "Experience deleted successfully",
        deletedExperience
    });
});

// Get experiences by host
const getExperiencesByHost = asyncHandler(async (req, res) => {
    const hostId = req.user._id;

    console.log("ffffffffffffff");

    if (!mongoose.Types.ObjectId.isValid(hostId)) {
        return res.status(400).json({ message: "Invalid host ID" });
    }

    const experiences = await ExperienceModel.find({ hostId });
    res.status(200).json(experiences);
});


// Add activity to experience
const addActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid experience ID" });
    }

    if (!title) {
        return res.status(400).json({ message: "Activity title is required" });
    }
    const image = req.file ? req.file.path : null;

    const experience = await ExperienceModel.findByIdAndUpdate(
        { _id: id, hostId: req.user._id },
        {
            $push: {
                activities: { title, description, image }
            }
        },
        { new: true, runValidators: true }
    ).populate('hostId', 'name email');

    if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
    }

    res.status(200).json(experience);
});

// Remove activity from experience
const removeActivity = asyncHandler(async (req, res) => {
    const { id, activityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid experience ID" });
    }

    const experience = await ExperienceModel.findByIdAndUpdate(
        id,
        {
            $pull: {
                activities: { _id: activityId }
            }
        },
        { new: true, runValidators: true }
    ).populate('hostId', 'name email');

    if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
    }

    res.status(200).json(experience);
});

// Add date to experience
const addDate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid experience ID" });
    }

    if (!date) {
        return res.status(400).json({ message: "Date is required" });
    }

    const experience = await ExperienceModel.findByIdAndUpdate(
        { _id: id, hostId: req.user._id },
        {
            $addToSet: {
                dates: new Date(date)
            }
        },
        { new: true, runValidators: true }
    ).populate('hostId', 'name email');

    if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
    }

    res.status(200).json(experience);
});

// Remove date from experience
const removeDate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid experience ID" });
    }

    if (!date) {
        return res.status(400).json({ message: "Date is required" });
    }

    const experience = await ExperienceModel.findByIdAndUpdate(
        id,
        {
            $pull: {
                dates: new Date(date)
            }
        },
        { new: true, runValidators: true }
    ).populate('hostId', 'name email');

    if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
    }

    res.status(200).json(experience);
});

// Add images to experience
const addExperienceImages = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid experience ID" });
    }
    const experience = await ExperienceModel.findOne({
        _id: id,
        hostId: req.user._id
    });

    if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No images uploaded" });
    }
    const newImages = req.files.map((file) => file.path);

    experience.images = [...experience.images, ...newImages];
    await experience.save();

    res.status(200).json({
        message: "Images added successfully",
        images: experience.images
    });
});

const getExperiencesByHostById = asyncHandler(async (req, res) => {
    const { hostId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(hostId)) {
        return res.status(400).json({ message: "Invalid host ID" });
    }

    const experiences = await ExperienceModel.find({ hostId });
    res.status(200).json(experiences);
});



// ✅ IMPROVED: Get all experiences with sorting
 const getAllExperiences = asyncHandler(async (req, res) => {
  try {
    const experiences = await ExperienceModel.find()
      .populate('hostId', 'name email image')
      .sort({ createdAt: -1 });

    res.status(200).json(experiences);
  } catch (error) {
    console.error("Error fetching experiences:", error);
    res.status(500).json({ message: "Failed to fetch experiences" });
  }
});

// ✅ IMPROVED: Create experience with better validation
 const createExperience = asyncHandler(async (req, res) => {
  let {
    name,
    description,
    price,
    dates,
    activities,
    address,
    notes
  } = req.body;

  // ✅ Enhanced validation
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Experience name is required" });
  }

  if (!price || price < 0) {
    return res.status(400).json({ message: "Valid price is required" });
  }

  if (!address?.country || !address?.city) {
    return res.status(400).json({
      message: "Country and city are required"
    });
  }

  // Parse dates if provided
  dates = dates ? JSON.parse(dates) : [];

  // Validate dates
  if (dates && dates.length > 0) {
    const invalidDates = dates.filter(d => isNaN(new Date(d).getTime()));
    if (invalidDates.length > 0) {
      return res.status(400).json({ message: "Invalid date format" });
    }
  }

  // Validate activities
  if (activities && Array.isArray(activities)) {
    for (let activity of activities) {
      if (!activity.title || !activity.title.trim()) {
        return res.status(400).json({
          message: "Each activity must have a title"
        });
      }
    }
  }

  // Handle image uploads
  const images = req.files?.map(file => file.path) || [];

  const newExperience = new ExperienceModel({
    hostId: req.user._id,
    name: name.trim(),
    description: description?.trim(),
    images,
    price: Number(price),
    dates: dates.map(d => new Date(d)),
    activities: activities || [],
    address,
    notes
  });

  const savedExperience = await newExperience.save();
  await savedExperience.populate('hostId', 'name email image');

  res.status(201).json({
    message: "Experience created successfully",
    data: savedExperience
  });
});

// ✅ IMPROVED: Search experiences with sorting
 const searchExperiences = asyncHandler(async (req, res) => {
  const {
    city,
    country,
    minPrice,
    maxPrice,
    minRating,
    date,
    activity,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  let filter = {};

  // Location filters
  if (city) filter['address.city'] = new RegExp(city, 'i');
  if (country) filter['address.country'] = new RegExp(country, 'i');

  // Price range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Rating filter
  if (minRating) {
    filter.starRating = { $gte: Number(minRating) };
  }

  // Date filter
  if (date) {
    const targetDate = new Date(date);
    if (!isNaN(targetDate.getTime())) {
      filter.dates = { $elemMatch: { $eq: targetDate } };
    }
  }

  // Activity filter
  if (activity) {
    filter['activities.title'] = new RegExp(activity, 'i');
  }

  // ✅ Sorting
  const sortOrder = order === 'asc' ? 1 : -1;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;

  const experiences = await ExperienceModel.find(filter)
    .populate('hostId', 'name email image')
    .sort(sortOptions);

  res.status(200).json(experiences);
});

// Get experience statistics (Admin only)
const getExperienceStats = asyncHandler(async (req, res) => {
  const totalExperiences = await ExperienceModel.countDocuments();
  
  const topCities = await ExperienceModel.aggregate([
    { $group: { _id: "$address.city", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const topCountries = await ExperienceModel.aggregate([
    { $group: { _id: "$address.country", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const avgPrice = await ExperienceModel.aggregate([
    { $group: { _id: null, avgPrice: { $avg: "$price" } } }
  ]);

  const avgRating = await ExperienceModel.aggregate([
    { $group: { _id: null, avgRating: { $avg: "$starRating" } } }
  ]);

  res.status(200).json({
    totalExperiences,
    topCities,
    topCountries,
    averagePrice: avgPrice[0]?.avgPrice?.toFixed(2) || 0,
    averageRating: avgRating[0]?.avgRating?.toFixed(2) || 0
  });
});





export {
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
    removeDate,
    addExperienceImages,
    getExperiencesByHostById,
    getExperienceStats
};