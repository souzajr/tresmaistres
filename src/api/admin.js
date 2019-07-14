"use strict";

const bcrypt = require('bcrypt-nodejs')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Order = mongoose.model('Order')
const Product = mongoose.model('Product')
const Segmentation = mongoose.model('Segmentation')
const mail = require('../config/mail')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
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

    const viewHome = (req, res) => {
        Order.find().sort({ 'createdAt' : -1 }).then(orders => {
            Segmentation.find().then(segmentations => {
                res.status(200).render('./admin/index', {
                    user: req.session.user,
                    page: 'Home',
                    orders,
                    segmentations,
                    message: null
                })
            })
        }).catch(_ => res.status(500).render('500'))
    }
    
    const viewProfile = (req, res) => {
        res.status(200).render('./admin/index', {
            user: req.session.user,
            csrf: req.csrfToken(),
            page: 'Perfil',
            message: null
        })
    }

    const changeProfile = (req, res) => {
        const changeInfoProfile = { ...req.body }

        if (!changeInfoProfile.newName && !changeInfoProfile.newEmail && !changeInfoProfile.currentPassword && !changeInfoProfile.newPassword && !changeInfoProfile.confirmNewPassword) {
            return res.status(400).json(failMessage)
        }

        User.findOne({ _id: req.session.user._id }).then(async user => {
            if (changeInfoProfile.newName) {
                try {
                    tooSmall(changeInfoProfile.newName, 'Nome muito curto, digite um nome maior')
                    tooBig(changeInfoProfile.newName, 'Nome muito longo, digite um nome menor')
                } catch (msg) {
                    return res.status(400).json(msg)
                }

                user.name = changeInfoProfile.newName
            }

            if (changeInfoProfile.newEmail) {
                if(changeInfoProfile.newEmail === req.session.user.email) 
                    return res.status(400).json('Você já está usando esse email')

                try {
                    tooBigEmail(changeInfoProfile.newEmail, 'Seu Email é muito longo')
                    validEmailOrError(changeInfoProfile.newEmail, 'Email inválido')
                    const userFromDB = await User.findOne({ email: changeInfoProfile.newEmail }).catch(err => new Error(err))
                    if(userFromDB instanceof Error) return res.status(500).json(failMessage)
                    notExistOrError(userFromDB, 'Esse Email já está registrado')
                } catch (msg) {
                    return res.status(400).json(msg)
                }

                user.email = changeInfoProfile.newEmail
            }

            if (changeInfoProfile.currentPassword || changeInfoProfile.newPassword || changeInfoProfile.confirmNewPassword) {
                try {
                    existOrError(changeInfoProfile.currentPassword, 'Digite sua senha atual')
                    existOrError(changeInfoProfile.newPassword, 'Digite sua nova senha')
                    existOrError(changeInfoProfile.confirmNewPassword, 'Digite a confirmação da sua nova senha')
                    const checkUser = await User.findOne({ _id: req.session.user._id }).catch(err => new Error(err))
                    if(checkUser instanceof Error) return res.status(500).json(failMessage)
                    const isMatch = bcrypt.compareSync(changeInfoProfile.currentPassword, checkUser.password)
                    if (!isMatch) return res.status(401).json('Senha inválida')
                    hasDigitOrError(changeInfoProfile.newPassword, 'A senha deve ter pelo menos um número')
                    hasLowerOrError(changeInfoProfile.newPassword, 'A senha deve ter pelo menos uma letra minúscula')
                    hasUpperOrError(changeInfoProfile.newPassword, 'A senha deve ter pelo menos uma letra maiúscula')
                    notSpaceOrError(changeInfoProfile.newPassword, 'A senha não deve ter espaços em branco')
                    hasSpecialOrError(changeInfoProfile.newPassword, 'A senha deve ter pelo menos um caractere especial')
                    strongOrError(changeInfoProfile.newPassword, 'A senha deve conter pelo menos 8 caracteres')
                    equalsOrError(changeInfoProfile.newPassword, changeInfoProfile.confirmNewPassword, 'A senha e confirmação da senha não são iguais')
                } catch (msg) {
                    return res.status(400).json(msg)
                }

                user.password = encryptPassword(changeInfoProfile.newPassword)
            }

            user.save().then(user => {
                user.password = undefined
                req.session.user = user
                res.status(200).json(successMessage)
            })
        }).catch(_ => res.status(500).json(failMessage))
    }

    const viewOrderDetails = (req, res) => {
        if(!req.query.id) return res.redirect('/admin')  
        
        Order.findOne({ _id: req.query.id }).then(async order => { 
            let segmentation = null    

            if(order.options && order.options._idSegmentation) {
                segmentation = await Segmentation.findOne({ _id: order.options._idSegmentation })
                .catch(err => new Error(err))
                if(segmentation instanceof Error) return res.status(500).render('500')
            }

            User.find({ admin: true }).then(users => {
                res.status(200).render('./admin/index', {
                    user: req.session.user,
                    page: 'Detalhes da compra',
                    order,
                    segmentation,
                    users,
                    moment,
                    csrf: req.csrfToken(),
                    message: null
                })
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const changeOrderDetails = (req, res) => {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, './public')
            },
            filename: (req, file, cb) => {
                cb(null, crypto.randomBytes(10).toString('hex') + Date.now() + path.extname(file.originalname).toLowerCase())
            }
        })
        
        const upload = multer({ storage, fileFilter: function (req, file, callback) {
            var ext = path.extname(file.originalname).toLowerCase()
            if(ext !== '.pdf' && ext !== '.csv' && ext !== '.doc' && ext !== '.docx') {
                return callback(new Error())
            }
    
            callback(null, true)
        },
        limits: {
            limits: 1,
            fileSize: 15 * 1024 * 1024 // 15MB
        }}).single('file')

        upload(req, res, function(err) {
            const orderUpdate = { ...req.body }

            if (err instanceof multer.MulterError) {
                return res.status(400).json(failMessage)
            } else if (err) {
                return res.status(400).json(failMessage)
            } else if (!req.file) {
                return Order.findOne({ _id: orderUpdate.orderId }).then(order => {
                    if(orderUpdate.seller && orderUpdate.seller !== 'Selecione') {
                        if(order.options) order.options._idSeller = orderUpdate.seller
                        else order.options = { _idSeller: orderUpdate.seller }
                    } else {
                        if(order.options) order.options._idSeller = null
                    }

                    if(orderUpdate.automation && orderUpdate.automation !== 'Selecione') {
                        if(order.options) {
                            order.options.automation = {
                                _idResponsible: orderUpdate.automation,
                                createdAt: moment().format('L - LTS')
                            }
                        } else { 
                            order.options = {
                                automation: {
                                    _idResponsible: orderUpdate.automation,
                                    createdAt: moment().format('L - LTS')
                                }
                            }
                        }
                    } else {
                        if(order.options && order.options.automation) order.options.automation = {}
                    }

                    if(orderUpdate.comment) {
                        if(order.options) {
                            order.options.interacion = {
                                comment: orderUpdate.comment,
                                createdAt: moment().format('L - LTS')
                            }
                        } else {
                            order.options = {
                                interacion: {
                                    comment: orderUpdate.comment,
                                    createdAt: moment().format('L - LTS')
                                }
                            }
                        }
                    } else {
                        if(order.options && order.options.interacion) order.options.interacion = {}
                    }

                    order.save().then(res.status(200).json(successMessage))
                }).catch(_ => res.status(500).json(failMessage))
            }

            Order.findOne({ _id: orderUpdate.orderId }).then(order => {
                if(orderUpdate.seller && orderUpdate.seller !== 'Selecione') {
                    if(order.options) order.options._idSeller = orderUpdate.seller
                    else order.options = { _idSeller: orderUpdate.seller }
                } else {
                    if(order.options) order.options._idSeller = null
                }

                if(orderUpdate.automation && orderUpdate.automation !== 'Selecione') {
                    if(order.options) {
                        order.options.automation = {
                            _idResponsible: orderUpdate.automation,
                            createdAt: moment().format('L - LTS')
                        }
                    } else { 
                        order.options = {
                            automation: {
                                _idResponsible: orderUpdate.automation,
                                createdAt: moment().format('L - LTS')
                            }
                        }
                    }
                } else {
                    if(order.options && order.options.automation) order.options.automation = {}
                }

                if(orderUpdate.comment) {
                    if(order.options) {
                        order.options.interacion = {
                            comment: orderUpdate.comment,
                            createdAt: moment().format('L - LTS')
                        }
                    } else {
                        order.options = {
                            interacion: {
                                comment: orderUpdate.comment,
                                createdAt: moment().format('L - LTS')
                            }
                        }
                    }
                } else {
                    if(order.options && order.options.interacion) order.options.interacion = {}
                }

                if(order.options) {
                    if(order.options.invoice) {
                        fs.unlinkSync('./public/' + order.options.invoice)
                        order.options.invoice = req.file.filename
                    } else {
                        order.options.invoice = req.file.filename
                    }
                } else {
                    order.options = {
                        invoice: req.file.filename
                    }
                }

                order.save().then(res.status(200).json(successMessage))
            }).catch(_ => res.status(500).json(failMessage))
        })
    }

    const changeSegmentation = (req, res) => {
        const segmentation = { ...req.body }

        try {
            existOrError(segmentation.segmentationId, failMessage)
            existOrError(segmentation.status, 'Escolha o status da segmentação')
        } catch(msg) {
            return res.status(400).json(msg)
        }

        Segmentation.findOne({ _id: segmentation.segmentationId }).then(getSegmentation => {
            if(segmentation.status === 'pendente') getSegmentation.status = segmentation.status
            else return res.status(400).json('Esse já é o status atual da segmentação')

            getSegmentation.save().then(res.status(200).json(successMessage))
        }).catch(_ => res.status(500).json(failMessage))
    }

    return {
        viewHome,
        viewProfile,
        changeProfile,
        viewOrderDetails,
        changeOrderDetails,
        changeSegmentation
    }
}