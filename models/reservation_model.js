import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
  guestId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
  
  // ✅ تغيير من roomId واحد لـ array من الغرف
  rooms: [{
    roomId: { type: mongoose.Schema.Types.ObjectId, required: true },
    roomCount: { type: Number, required: true, min: 1 },
    guestsData: [{
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String, required: true },
    }]
  }],
  
  experienceId: { type: mongoose.Schema.Types.ObjectId, ref: "Experiance" },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "pending", "succeeded", "failed"],
    default: "unpaid",
  },
  checkIn: { type: Date },
  checkOut: { type: Date },
  totalGuests: { type: Number, default: 1 },
}, { timestamps: true });


export default mongoose.model("Reservation", reservationSchema);
