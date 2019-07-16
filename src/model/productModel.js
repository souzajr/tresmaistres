const mongoose = require('mongoose')

const OptionSchema = new mongoose.Schema({
    description: String,
    hasCheck: Boolean
})

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    value: { type: Number, required: true },
    createdAt: { type: String, required: true },
    productPublic: { type: Boolean, required: true },
    validity: String,
    options: [OptionSchema]
})

mongoose.model('Product', ProductSchema)