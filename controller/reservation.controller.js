import Reservation from "../models/reservation_model.js";
import HotelModel from "../models/hotel_model.js";
import ExperienceModel from "../models/experiance_model.js";
import { asyncHandler } from "../middlewares/errorHandler.js";


export const createReservation = asyncHandler(async (req, res) => {
  const { hotelId, roomId,roomCount, experienceId, checkIn, checkOut, guestsCount, guestData } = req.body;
  const guestId = req.user._id;

  if (!hotelId && !experienceId) {
    return res.status(400).json({ message: "Hotel or Experience ID is required" });
  }

  // ============================
  //  EXPERIENCE RESERVATION
  // ============================
  if (experienceId) {
    const experience = await ExperienceModel.findById(experienceId);
    if (!experience) return res.status(404).json({ message: "Experience not found" });
    const reservations = await Reservation.find({
      experienceId,
      guestId,
      checkIn
    });

    if (reservations.length > 0) {
      return res.status(400).json({ message: "You already have a reservation for this experience" });
    }
    

    const totalPrice = guestsCount * experience.price;

    const reservation = new Reservation({
      guestId,
      experienceId,
      totalPrice,
      checkIn,
      checkOut,
      guestsCount,
    });

    const saved = await reservation.save();
    return res.status(201).json(saved);
  }

  // ============================
  //      HOTEL RESERVATION
  // ============================

  const hotel = await HotelModel.findById(hotelId);
  if (!hotel) return res.status(404).json({ message: "Hotel not found" });

  const hotelHasRooms = hotel.rooms && hotel.rooms.length > 0;

  // ============================================================
// CASE 1: Hotel HAS Rooms → room-level booking
// ============================
if (hotelHasRooms) {
  if (!roomId) {
    return res.status(400).json({ message: "roomId is required for this hotel" });
  }

  const selectedRoom = hotel.rooms.id(roomId);
  if (!selectedRoom) {
    return res.status(404).json({ message: "Room not found in this hotel" });
  }

  // Count overlapping reservations for this room
  const overlappingCount = await Reservation.aggregate([
    {
      $match: {
        hotelId: hotel._id,
        roomId,
        status: { $ne: "cancelled" },
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) }
      }
    },
    {
      $group: {
        _id: null,
        totalReserved: { $sum: "$roomCount" }
      }
    }
  ]);

  const alreadyReserved = overlappingCount.length ? overlappingCount[0].totalReserved : 0;

  // Check if enough rooms are available
  if (alreadyReserved + roomCount > selectedRoom.quantity) {
    return res.status(400).json({
      message: `Not enough rooms available. Only ${selectedRoom.quantity - alreadyReserved} left`
    });
  }

  const nights =
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);

  const totalPrice = nights * selectedRoom.price * roomCount;

  const reservation = new Reservation({
    guestId,
    guestData,
    hotelId,
    roomId,
    roomCount,
    totalPrice,
    checkIn,
    checkOut,
    guestsCount,
  });

  const saved = await reservation.save();
  return res.status(201).json(saved);
}


  // ============================================================
  // CASE 2: Hotel does NOT have rooms → full-hotel booking
  // ============================================================

  // Check if dates overlap with any ACTIVE reservation
  const conflict = await Reservation.findOne({
    hotelId,
    status: { $ne: "cancelled" },
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
  });

  if (conflict) {
    return res.status(400).json({
      message: "This hotel is not available in this period of time",
    });
  }

  const nights =
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);

  const totalPrice = nights * hotel.price;

  const reservation = new Reservation({
    guestId,
    guestData,
    hotelId,
    totalPrice,
    checkIn,
    checkOut,
    guestsCount,
  });

  const saved = await reservation.save();
  return res.status(201).json(saved);
});


export const getAllReservations = asyncHandler(async (req, res) => {

    // const hotelIds = hostHotels.map(h => h._id);
  // const experienceIds = hostExperiences.map(e => e._id);
  const reservations = await Reservation.find(
  //   {
  //   $or: [
  //     { hotelId: { $in: hotelIds } },
  //     { experienceId: { $in: experienceIds } },
  //   ],
  // }
)
    .populate("guestId", "name email")
    .populate("hotelId", "name price")
    .populate("experienceId", "name price");
  res.status(200).json(reservations);
});

export const getUserReservations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const reservations = await Reservation.find({ guestId: userId })
    .populate("hotelId", "name price images")
    .populate("experienceId", "name price images");
  res.status(200).json(reservations);
});

// export const getHostReservations = asyncHandler(async (req, res) => {
//   const hostId = req.user._id;
//   const hostHotels = await HotelModel.find({ hostId }).select("_id");
//   const hostExperiences = await ExperienceModel.find({ hostId }).select("_id");
  
//     const hotelIds = hostHotels.map(h => h._id);
//   const experienceIds = hostExperiences.map(e => e._id);
//   const reservations = await Reservation.find({
//     $or: [
//       { hotelId: { $in: hotelIds } },
//       { experienceId: { $in: experienceIds } },
//     ],
//   })
//     .populate("guestId", "name email")
//     .populate("hotelId", "name price")
//     .populate("experienceId", "name price");
//   res.status(200).json(reservations);
// });

export const getHostReservations = asyncHandler(async (req, res) => {
  const hostId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;
  const type = req.query.type;
  
  const skip = (page - 1) * limit;

  const hostHotels = await HotelModel.find({ hostId }).select("_id");
  const hostExperiences = await ExperienceModel.find({ hostId }).select("_id");
  
  const hotelIds = hostHotels.map(h => h._id);
  const experienceIds = hostExperiences.map(e => e._id);
  
  let filter = {
    $or: [
      { hotelId: { $in: hotelIds } },
      { experienceId: { $in: experienceIds } }
    ]
  };
  
  if (status && status !== 'all') filter.status = status;
  if (type === 'hotel') {
    filter = { hotelId: { $in: hotelIds } };
    if (status && status !== 'all') filter.status = status;
  }
  if (type === 'experience') {
    filter = { experienceId: { $in: experienceIds } };
    if (status && status !== 'all') filter.status = status;
  }

  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .populate("guestId", "name email")
      .populate("hotelId", "name price")
      .populate("experienceId", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Reservation.countDocuments(filter)
  ]);

  res.status(200).json({
    reservations,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  });
});


export const getReservationByhotelOrExperienceId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const reservations = await Reservation.find({
    $or: [{ hotelId: id }, { experienceId: id }],guestId: userId
  })
    .populate("guestId", "name email")
    .populate("hotelId", "name price")
    .populate("experienceId", "name price");
  res.status(200).json(reservations);
})
export const updateReservationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const updated = await Reservation.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Reservation not found" });

  res.status(200).json(updated);
});

export const filterReservationsByStatus = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const reservations = await Reservation.find(filter)
    .populate("guestId", "name email")
    .populate("hotelId", "name")
    .populate("experienceId", "name");
  res.status(200).json(reservations);
});

export const getReservationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reservation = await Reservation.findById(id)
    .populate("guestId")
    .populate("hotelId")
    .populate("experienceId");
  res.status(200).json(reservation);
});

export const getRoomAvailability = asyncHandler(async (req, res) => {
  const { hotelId, roomId, date } = req.query;

  if (!hotelId || !roomId || !date) {
    return res.status(400).json({ message: "hotelId, roomId and date are required" });
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // احصل على كل الحجوزات اللي بتتداخل مع اليوم ده
  const overlappingReservations = await Reservation.find({
    hotelId,
    roomId,
    status: { $ne: "cancelled" },
    checkIn: { $lt: dayEnd },
    checkOut: { $gt: dayStart },
  });

  const hotel = await HotelModel.findById(hotelId);
  if (!hotel) {
    return res.status(404).json({ message: "Hotel not found" });
  }

  const room = hotel.rooms.id(roomId);
  if (!room) {
    return res.status(404).json({ message: "Room not found in hotel" });
  }

  const bookedCount = overlappingReservations.reduce((sum, r) => sum + (r.roomCount || 1), 0);
  const available = room.quantity - bookedCount;

  return res.status(200).json({
    date,
    available,
    totalRooms: room.quantity,
    booked: bookedCount
  });
});


export const getAvailableDates = asyncHandler(async (req, res) => {
  const { hotelId, roomId } = req.query;

  if (!hotelId) {
    return res.status(400).json({ message: "hotelId is required" });
  }

  const hotel = await HotelModel.findById(hotelId);
  if (!hotel) return res.status(404).json({ message: "Hotel not found" });

  // RANGE: next 6 months
  let start = new Date();
  start.setHours(0, 0, 0, 0);

  let end = new Date();
  end.setMonth(end.getMonth() + 6);
  end.setHours(23, 59, 59, 999);

  // Fetch all reservations overlapping the range
  const reservations = await Reservation.find({
    hotelId,
    status: { $ne: "cancelled" },
    checkIn: { $lt: end },
    checkOut: { $gt: start },
  });

  const hasRooms = hotel.rooms && hotel.rooms.length > 0;

  let cursor = new Date(start);
  let days = [];

  while (cursor <= end) {
    const day = new Date(cursor);
    // حول التاريخ لـ timestamp عشان المقارنة تكون دقيقة
    const dayTime = day.getTime();
    
    let isAvailable = false;

    if (hasRooms) {
      // Room-level check
      if (roomId) {
        const room = hotel.rooms.id(roomId);
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }
        const capacity = room.quantity;

        const bookedCount = reservations
          .filter(r => String(r.roomId) === String(roomId))
          .filter(r => {
            // حول كل التواريخ لـ timestamps وامسح الوقت
            const checkInTime = new Date(r.checkIn).setHours(0, 0, 0, 0);
            const checkOutTime = new Date(r.checkOut).setHours(0, 0, 0, 0);
            
            // اليوم محجوز لو كان >= checkIn و < checkOut
            // يعني يوم الـ checkout نفسه يكون available
            return dayTime >= checkInTime && dayTime < checkOutTime;
          })
          .reduce((sum, r) => sum + (r.roomCount ?? 1), 0);

        isAvailable = capacity - bookedCount > 0;
      } else {
        // Hotel-level availability (any room available)
        for (let room of hotel.rooms) {
          const capacity = room.quantity;
          const bookedCount = reservations
            .filter(r => String(r.roomId) === String(room._id))
            .filter(r => {
              const checkInTime = new Date(r.checkIn).setHours(0, 0, 0, 0);
              const checkOutTime = new Date(r.checkOut).setHours(0, 0, 0, 0);
              return dayTime >= checkInTime && dayTime < checkOutTime;
            })
            .reduce((sum, r) => sum + (r.roomCount ?? 1), 0);

          if (capacity - bookedCount > 0) {
            isAvailable = true;
            break;
          }
        }
      }
    } else {
      // Hotel has no rooms → check hotel-level availability
      const bookedCount = reservations.filter(r => {
        const checkInTime = new Date(r.checkIn).setHours(0, 0, 0, 0);
        const checkOutTime = new Date(r.checkOut).setHours(0, 0, 0, 0);
        return dayTime >= checkInTime && dayTime < checkOutTime;
      }).length;
      
      isAvailable = bookedCount === 0;
    }

    days.push({ date: day, available: isAvailable });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Convert available days into continuous ranges
  let ranges = [];
  let currentRange = null;

  days.forEach(d => {
    if (d.available) {
      if (!currentRange) currentRange = { start: d.date, end: d.date };
      else currentRange.end = d.date;
    } else {
      if (currentRange) {
        ranges.push(currentRange);
        currentRange = null;
      }
    }
  });

  if (currentRange) ranges.push(currentRange);

  return res.status(200).json(ranges);
});