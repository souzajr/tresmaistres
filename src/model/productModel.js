const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    value: { type: Number, required: true },
    createdAt: { type: String, required: true }
})

mongoose.model('Product', ProductSchema)