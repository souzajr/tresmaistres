"use strict";

const mongoose = require('mongoose')
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)
mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)

module.exports = {
    openConn() {
        mongoose.connect(process.env.DB_HOST).catch(() => {
            console.log('\x1b[41m\x1b[37m', 'ERRO AO SE CONECTAR COM O BANCO DE DADOS!', '\x1b[0m')
        })
        require('../model/userModel')
        require('../model/orderModel')
        require('../model/productModel')
        require('../model/pagarmeReportModel')
        require('../model/couponModel')
        require('../model/segmentationModel')
    }
}