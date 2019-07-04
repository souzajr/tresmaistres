const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
    _pagarmeReport: { type: String, required: true },
    _idTransactionPagarme: { type: Number, required: true },
    _idUser: String,
    product: {
        _id: { type: String, required: true }, 
        name: { type: String, required: true },
        value: { type: Number, required: true }
    },
    coupon: {
        _id: String,
        percentage: Number,
        name: String
    },
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
    status: { type: String, required: true },
    createdAt: { type: String, required: true }
})

mongoose.model('Order', OrderSchema)