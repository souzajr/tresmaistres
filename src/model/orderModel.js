const mongoose = require('mongoose')

const ProductOrderSchema = new mongoose.Schema({
    _idProduct: { type: String, required: true },
    _idOwner: { type: String, required: true },
    _idModel: { type: String, required: true },
    _idEvent: String,
    start: String,
    schedule: { type: Boolean, required: true },
    name: { type: String, required: true }, 
    clinicValue: { type: Number, required: true },
    percentage: { type: Number, required: true },
    value: { type: Number, required: true }
})

const OrderSchema = new mongoose.Schema({
    _pagarmeReport: { type: String, required: true },
    _secondPagarmeReport: String,
    _idTransactionPagarme: { type: Number, required: true },
    _idUser: { type: String, required: true },
    product: [ProductOrderSchema],
    total: { type: Number, required: true }, 
    cost: Number,
    paymentConfig: {
        method: { type: String, require: true },
        boleto_url: String
    },
    buyer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true },
        birthday: { type: String, required: true },
        address: {
            street: { type: String, required: true },
            neighborhood: { type: String, required: true },
            number: { type: String, required: true },
            complement: String,
            zipCode: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true }
        },
        documents: {
            typeDoc: { type: String, required: true },
            cpfOrCnpj: { type: String, required: true }
        }
    },
    hasPatient: { type: Boolean, required: true },
    patient: {
        name: String,
        phone: String,
        email: String,
        birthday: String,
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
        }
    },
    status: { type: String, required: true },
    createdAt: { type: String, required: true },
})

mongoose.model('Order', OrderSchema)