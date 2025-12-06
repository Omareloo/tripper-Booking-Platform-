import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  placeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Place", 
    required: true 
  },
  
  name: { 
    type: String, 
    required: true 
  }, // e.g., "Giza Adventure Trip"
  
  description: { 
    type: String 
  },
  
  startDate: { 
    type: Date, 
    required: true 
  },
  
  endDate: { 
    type: Date, 
    required: true 
  },
  
  // Hotels in this plan
  hotels: [{
    hotelId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Hotel", 
      required: true 
    },
    rooms: [{
      roomId: { type: mongoose.Schema.Types.ObjectId, required: true },
      roomCount: { type: Number, required: true, min: 1 },
      guestsData: [{
        name: { type: String, required: true },
        email: { type: String },
        phone: { type: String, required: true },
      }]
    }],
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
  }],
  
  // Experiences in this plan
  experiences: [{
    experienceId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Experiance", 
      required: true 
    },
    date: { type: Date, required: true },
    guestsCount: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  }],
  
  totalGuests: { 
    type: Number, 
    default: 1 
  },
  
  totalPrice: { 
    type: Number, 
    required: true 
  },
  
  status: {
    type: String,
    enum: ["draft", "booked", "cancelled", "completed"],
    default: "draft"
  },
  
  paymentStatus: {
    type: String,
    enum: ["unpaid", "pending", "succeeded", "failed"],
    default: "unpaid"
  },
  
  reservationIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Reservation" 
  }], // Array of reservation IDs created when booking the plan
  
}, { timestamps: true });

export default mongoose.model("Plan", planSchema);