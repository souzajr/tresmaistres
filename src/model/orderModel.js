const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
    _pagarmeReport: String,
    _idTransactionPagarme: Number,
    _idUser: String,
    status: { type: String, required: true },
    total: { type: Number, required: true }, 
    origin: { type: String, required: true },
    product: {
        _id: { type: String, required: true }, 
        name: { type: String, required: true },
        value: { type: Number, required: true },
        dateValidity: String
    },
    coupon: {
        _id: String,
        percentage: Number,
        name: String
    },
    paymentConfig: {
        method: { type: String, require: true },
        installments: Number,
        installmentValue: Number,
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
    options: {
        _idSeller: String,
        _idSegmentation: String,
        invoice: String,
        receipt: String,
        observations: [{
            _idUser: String,
            comment: String,
            attachment: String,
            createdAt: String
        }],
        automation: {
            _idResponsible: String,
            createdAt: String
        }
    },
    createdAt: { type: String, required: true }
})

mongoose.model('Order', OrderSchema)