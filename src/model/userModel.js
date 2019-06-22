const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true },
    password: String,
    phone: String,
    birthday: String,
    admin: { type: Boolean, required: true, default: false },
    createdAt: { type: String, required: true },
    address: {
        street: String,
        neighborhood: String,
        number: String,
        complement: String,
        zipCode: String,
        city: String,
        state: String
    },
    documents: {
        typeDoc: String,
        cpfOrCnpj: String
    },
    firstAccess: { type: Boolean, required: true },
    deletedAt: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    instagramId: String,
    instagramUserName: String
})

mongoose.model('User', UserSchema)