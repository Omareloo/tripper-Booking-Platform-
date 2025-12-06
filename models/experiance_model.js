import mongoose from "mongoose";

const experianceSchema = mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: {type: String,required: true},
    description: String,
    images: [String],
    price: {type: Number,required: true},
    dates: [Date],
    notes:{ type: String , default: ''},
    activities:[
        {
            title: String,
            description: String,
            image: String
        }
    ],
    address: {
        country: {type: String,required: true},
        city: {type:String, required: true},
    },
    starRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
        },
        
    
}, {timestamps: true});
const Experiance = mongoose.model("Experiance", experianceSchema);
export default Experiance