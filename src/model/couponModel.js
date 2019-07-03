const mongoose = require('mongoose')

const CouponSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    percentage: { type: Number, required: true },
    countUse: { type: Number, required: true, default: 0 }, 
    validity: { type: String, required: true },
    createdAt: { type: String, required: true }
})

mongoose.model('Coupon', CouponSchema)