const mongoose = require('mongoose')

const ReviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    note: { type: Number, required: true },
    review: { type: String, required: true },
    createdAt: { type: String, required: true }
})

const ProductSchema = new mongoose.Schema({
    _idOwner: { type: String, required: true },
    _idModel: { type: String, required: true },
    value: { type: Number, required: true },
    reviews: [ReviewSchema],
    schedule: { type: Boolean, required: true },
    createdAt: { type: String, required: true }
})

mongoose.model('Product', ProductSchema)