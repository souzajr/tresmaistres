"use strict";

const bcrypt = require('bcrypt-nodejs')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Order = mongoose.model('Order')
const Product = mongoose.model('Product')
const mail = require('../config/mail')
const moment = require('moment')
moment.locale('pt-br')
const failMessage = 'Algo deu errado'
const successMessage = 'Sucesso!'

module.exports = app => {
    const {
        existOrError,
        notExistOrError,
        tooSmall,
        tooBig,
        tooBigEmail,
        equalsOrError,
        strongOrError,
        hasDigitOrError,
        hasUpperOrError,
        hasLowerOrError,
        notSpaceOrError,
        hasSpecialOrError,
        validEmailOrError
    } = app.src.api.validation

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(password, salt)
    }

    const viewDashboard = (req, res) => {
        Order.find().then(orders => {
            res.status(200).render('./admin/index', {
                user: req.session.user,
                page: 'Home',
                orders,
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }
    
    const viewAdminProfile = async (req, res) => {
        await User.findOne({ _id: req.session.user._id }).then(user => {
            res.status(200).render('./dashboard/index', {
                user,
                page: 'perfil',
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    return {
        viewDashboard,
        viewAdminProfile
    }
}