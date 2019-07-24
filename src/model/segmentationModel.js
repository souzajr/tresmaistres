const mongoose = require('mongoose')

const SegmentationSchema = new mongoose.Schema({
    _idUser: String,
    _idOrder: { type: String, required: true },
    status: { type: String, required: true },
    instagramProfile: String,
    instagramPassword: String,
    interest: {
        profiles: String,
        subjects: String,
        locations: String,
        genre: String
    },
    createdAt: { type: String, required: true },
    sendByUserAt: String 
})

mongoose.model('Segmentation', SegmentationSchema)