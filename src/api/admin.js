"use strict";

const bcrypt = require('bcrypt-nodejs')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Order = mongoose.model('Order')
const Product = mongoose.model('Product')
const Segmentation = mongoose.model('Segmentation')
const Coupon = mongoose.model('Coupon')
const mail = require('../config/mail')
const generator = require('generate-password')
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
        if(!req.session.user.permissions.orderDetail) {
            return res.status(401).render('500')
        }

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
        if(!req.session.user.permissions.orderDetail) {
            return res.status(401).json(failMessage)
        }

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

                order.save().then(_ => {
                    mail.sendInvoice(order.buyer.email, order.buyer.name, order._id)
                    res.status(200).json(successMessage)
                })
            }).catch(_ => res.status(500).json(failMessage))
        })
    }

    const changeSegmentation = (req, res) => {
        if(!req.session.user.permissions.orderDetail) {
            return res.status(401).json(failMessage)
        }

        const segmentation = { ...req.body }

        try {
            existOrError(segmentation.segmentationId, failMessage)
            existOrError(segmentation.instagramProfile, 'Digite o login do perfil no Instagram')
            existOrError(segmentation.instagramPassword, 'Digite a senha do perfil no Instagram')
            existOrError(segmentation.profiles, 'Digite os perfis de interesse')
            existOrError(segmentation.subjects, 'Digite os assuntos de interesse')
            existOrError(segmentation.locations, 'Digite as cidades de interesse')
            existOrError(segmentation.genre, 'Escolha o gênero do público')
            existOrError(segmentation.status, 'Escolha o status da segmentação')
        } catch(msg) {
            return res.status(400).json(msg)
        }

        Segmentation.findOne({ _id: segmentation.segmentationId }).then(getSegmentation => {
            if(segmentation.status === 'pendente') getSegmentation.status = segmentation.status

            getSegmentation.instagramProfile = segmentation.instagramProfile
            getSegmentation.instagramPassword = segmentation.instagramPassword
            getSegmentation.interest = {
                profiles: segmentation.profiles,
                subjects: segmentation.subjects,
                locations: segmentation.locations,
                genre: segmentation.genre
            }
            
            getSegmentation.save().then(res.status(200).json(successMessage))
        }).catch(_ => res.status(500).json(failMessage))
    }

    const viewCoupons = (req, res) => { 
        if(!req.session.user.permissions.coupons) {
            return res.status(401).render('500')
        }

        Coupon.find().then(coupons => {
            res.status(200).render('./admin/index', {
                user: req.session.user,
                page: 'Cupons',
                coupons,
                moment,
                csrf: req.csrfToken(),
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const addCoupon = async (req, res) => {        
        if(!req.session.user.permissions.coupons) {
            return res.status(401).json(failMessage)
        }
        
        const coupon = { ...req.body }

        try {
            existOrError(coupon.name, 'Digite o nome do cupom')
            coupon.name = coupon.name.toLowerCase()
            const checkName = await Coupon.findOne({ name: coupon.name })
            .catch(err => new Error(err))
            if(checkName instanceof Error)
                return res.status(500).json(failMessage)
            notExistOrError(checkName, 'Esse nome já está sendo utilizado por outro cupom, escolha outro nome')
            existOrError(coupon.percentage, 'Digite a porcentagem do cupom')
            coupon.percentage = Number(Number(coupon.percentage).toFixed(2))
            if(coupon.percentage.toString() === 'NaN')
                return res.status(400).json(failMessage)
            if(coupon.percentage < 1 || coupon.percentage > 99)
                return res.status(400).json('O valor do cupom deve ser maior que 1 e menor que 99')
            existOrError(coupon.validity, 'Escolha a data de validade do cupom')
            coupon.validity = moment(coupon.validity, 'YYYY-MM-DD').format('DD/MM/YYYY')
            if(coupon.validity === 'Invalid date')
                return res.status(400).json(failMessage)
            if(coupon.validity < moment().format('L'))
                return res.status(400).json('A validade do cupom precisa ser maior ou igual do que a data atual')
        } catch(msg) {
            return res.status(400).json(msg)
        }

        coupon.createdAt = moment().format('L - LTS')
        Coupon.create(coupon).then(res.status(200).json(successMessage))
        .catch(_ => res.status(500).json(failMessage))
    }

    const editCoupon = async (req, res) => {
        if(!req.session.user.permissions.coupons) {
            return res.status(401).json(failMessage)
        }

        const coupon = { ...req.body }

        try {
            existOrError(coupon.couponId, failMessage)
            existOrError(coupon.name, 'Digite o nome do cupom')
            coupon.name = coupon.name.toLowerCase()
            const checkName = await Coupon.findOne({ name: coupon.name })
            .catch(err => new Error(err))
            if(checkName instanceof Error)
                return res.status(500).json(failMessage)
            if(checkName && checkName._id != coupon.couponId)
                notExistOrError(checkName, 'Esse nome já está sendo utilizado por outro cupom, escolha outro nome')
            existOrError(coupon.percentage, 'Digite a porcentagem do cupom')
            coupon.percentage = Number(Number(coupon.percentage).toFixed(2))
            if(coupon.percentage.toString() === 'NaN')
                return res.status(400).json(failMessage)
            if(coupon.percentage < 1 || coupon.percentage > 99)
                return res.status(400).json('O valor do cupom deve ser maior que 1 e menor que 99')
            existOrError(coupon.validity, 'Escolha a data de validade do cupom')
            coupon.validity = moment(coupon.validity, 'YYYY-MM-DD').format('DD/MM/YYYY')
            if(coupon.validity === 'Invalid date')
                return res.status(400).json(failMessage)
            if(coupon.validity < moment().format('L'))
                return res.status(400).json('A validade do cupom precisa ser maior ou igual do que a data atual')
        } catch(msg) {
            return res.status(400).json(msg)
        }

        Coupon.findOne({ _id: coupon.couponId }).then(getCoupon => {
            if(coupon.name !== getCoupon.name)
                getCoupon.name = coupon.name
            
            if(coupon.percentage !== getCoupon.percentage)
                getCoupon.percentage = coupon.percentage

            if(coupon.validity !== getCoupon.validity)
                getCoupon.validity = coupon.validity

            getCoupon.save().then(res.status(200).json(successMessage))
        }).catch(_ => res.status(500).json(failMessage))
    }

    const removeCoupon = (req, res) => {
        if(!req.session.user.permissions.coupons) {
            return res.status(401).json(failMessage)
        }

        if(!req.body.couponId) return res.status(400).json(failMessage)

        Coupon.deleteOne({ _id: req.body.couponId })
        .then(res.status(200).json(successMessage))
        .catch(_ => res.status(500).json(failMessage))
    }

    const viewPlans = (req, res) => {
        if(!req.session.user.permissions.product) {
            return res.status(401).render('500')
        }

        Product.find().then(products => {
            res.status(200).render('./admin/index', {
                user: req.session.user,
                page: 'Planos',
                products,
                csrf: req.csrfToken(),
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const addPlan = async (req, res) => {
        if(!req.session.user.permissions.product) {
            return res.status(401).json(failMessage)
        }

        const product = { ...req.body }

        try {
            existOrError(product.name, 'Digite o nome do plano')
            product.name = product.name.toLowerCase()
            const checkName = await Product.findOne({ name: product.name })
            .catch(err => new Error(err))
            if(checkName instanceof Error)
                return res.status(500).json(failMessage)
            notExistOrError(checkName, 'Esse nome já está sendo utilizado, escolha outro')
            existOrError(product.value, 'Digite o preço do plano')
            product.value = Number((Number(Number(product.value).toFixed(2)) * 100).toFixed(0))
            if(product.value.toString() === 'NaN')
                return res.status(400).json(failMessage)
            if(product.value < 1000)
                return res.status(400).json('O valor do plano deve ser maior ou igual a 10 reais')
            if(product.validity && product.validity !== 'Selecione') {
                product.validity = Number(Number(product.validity).toFixed(0))
                if(product.validity.toString() === 'NaN')
                    return res.status(400).json(failMessage)
            } else product.validity = null
            existOrError(product.productPublic, 'Escolha se o produto ficará ou não visível na Home')
        } catch(msg) {
            return res.status(400).json(msg)
        }

        const options = []
        if(product.description) {
            if(typeof(product.description) === 'string') {
                options.push({
                    description: product.description,
                    hasCheck: product.hasCheck === 'true' ? true : false
                })
            } else {
                if(product.description.length !== product.hasCheck.length)
                    return res.status(400).json(failMessage)

                for(let i = 0; i < product.description.length; i++) {
                    if(product.description[i] !== '') {
                        options.push({
                            description: product.description[i],
                            hasCheck: product.hasCheck[i] === 'true' ? true : false
                        })
                    }
                }
            }
        }

        new Product({
            name: product.name,
            value: product.value,
            productPublic: product.productPublic === 'true' ? true : false,
            validity: product.validity,
            options,
            createdAt: moment().format('L - LTS')
        }).save()
        .then(res.status(200).json(successMessage))
        .catch(_ => res.status(500).json(failMessage))
    }

    const editPlan = async (req, res) => {
        if(!req.session.user.permissions.product) {
            return res.status(401).json(failMessage)
        }

        const product = { ...req.body }

        try {
            existOrError(product.productId, failMessage)
            existOrError(product.name, 'Digite o nome do plano')
            product.name = product.name.toLowerCase()
            const checkName = await Product.findOne({ name: product.name })
            .catch(err => new Error(err))
            if(checkName instanceof Error)
                return res.status(500).json(failMessage)
            if(checkName && checkName._id != product.productId)
                notExistOrError(checkName, 'Esse nome já está sendo utilizado, escolha outro')
            existOrError(product.value, 'Digite o preço do plano')
            product.value = Number((Number(Number(product.value).toFixed(2)) * 100).toFixed(0))
            if(product.value.toString() === 'NaN')
                return res.status(400).json(failMessage)
            if(product.value < 1000)
                return res.status(400).json('O valor do plano deve ser maior ou igual a 10 reais')
            if(product.validity && product.validity !== 'Selecione') {
                product.validity = Number(Number(product.validity).toFixed(0))
                if(product.validity.toString() === 'NaN')
                    return res.status(400).json(failMessage)
            } else product.validity = null
            existOrError(product.productPublic, 'Escolha se o produto ficará ou não visível na Home')
        } catch(msg) {
            return res.status(400).json(msg)
        }

        const options = []
        if(product.description) {
            if(typeof(product.description) === 'string') {
                options.push({
                    description: product.description,
                    hasCheck: product.hasCheck === 'true' ? true : false
                })
            } else {
                if(product.description.length !== product.hasCheck.length)
                    return res.status(400).json(failMessage)

                for(let i = 0; i < product.description.length; i++) {
                    if(product.description[i] !== '') {
                        options.push({
                            description: product.description[i],
                            hasCheck: product.hasCheck[i] === 'true' ? true : false
                        })
                    }
                }
            }
        }

        Product.findOne({ _id: product.productId }).then(getProduct => {
            getProduct.name = product.name
            getProduct.value = product.value
            getProduct.productPublic = product.productPublic === 'true' ? true : false
            getProduct.validity = product.validity,
            getProduct.options = options

            getProduct.save().then(res.status(200).json(successMessage))
        }).catch(_ => res.status(500).json(failMessage))
    }

    const removePlan = (req, res) => {
        if(!req.session.user.permissions.product) {
            return res.status(401).json(failMessage)
        }

        if(!req.body.productId) return res.status(400).json(failMessage)

        Product.deleteOne({ _id: req.body.productId })
        .then(res.status(200).json(successMessage))
        .catch(_ => res.status(500).json(failMessage))
    }

    const viewOrigin = (req, res) => {
        if(!req.session.user.permissions.origin) {
            return res.status(401).render('500')
        }

        Order.find().then(orders => {
            res.status(200).render('./admin/index', {
                user: req.session.user,
                page: 'Origem',
                orders,
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const viewAutomation = (req, res) => {
        if(!req.session.user.permissions.automation) {
            return res.status(401).render('500')
        }

        Order.find().sort({ 'createdAt' : -1 }).then(getOrders => {
            Segmentation.find({ status: 'enviado' }).then(segmentations => {
                const orders = []
                for(let i = 0; i < getOrders.length; i++) {
                    for(let j = 0; j < segmentations.length; j++) {
                        if(getOrders[i]._id == segmentations[j]._idOrder) {
                            orders.push(getOrders[i])
                        }
                    }
                }

                res.status(200).render('./admin/index', {
                    user: req.session.user,
                    page: 'Automações',
                    orders,
                    segmentations,
                    message: null
                })
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const viewReport = (req, res) => {
        if(!req.session.user.permissions.report) {
            return res.status(401).render('500')
        }

        Order.find().sort({ 'createdAt' : -1 }).then(orders => {
            res.status(200).render('./admin/index', {
                user: req.session.user,
                page: 'Relatórios',
                orders,
                moment,
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }
    
    const viewAfterSales = (req, res) => {
        if(!req.session.user.permissions.afterSales) {
            return res.status(401).render('500')
        }

        Order.find({ status: 'paid' }).sort({ 'createdAt' : -1 }).then(orders => {
            res.status(200).render('./admin/index', {
                user: req.session.user,
                page: 'Pós venda',
                orders,
                moment,
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const viewUsers = (req, res) => {
        if(!req.session.user.permissions.users) {
            return res.status(401).render('500')
        }

        User.find().then(users => {
            res.status(200).render('./admin/index', {
                user: req.session.user,
                page: 'Usuários',
                users,
                csrf: req.csrfToken(),
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const addNewUser = async (req, res) => {
        if(!req.session.user.permissions.users) {
            return res.status(401).json('Você não tem autorização')
        }
        
        const user = { ...req.body }

        try {
            existOrError(user.name, 'Digite o nome')
            tooSmall(user.name, 'Nome muito curto, digite um nome maior')
            tooBig(user.name, 'Nome muito longo, digite um nome menor')
            existOrError(user.email, 'Digite o Email')
            tooBigEmail(user.email, 'Email é muito longo')
            validEmailOrError(user.email, 'Email inválido')
            const userFromDB = await User.findOne({ email: user.email })
            .catch(err => new Error(err))
            if(userFromDB instanceof Error) return res.status(500).json(failMessage)
            notExistOrError(userFromDB, 'Esse Email já está registrado')
            if(user.admin) {
                if(user.admin === 'Sim' && req.session.user.admin) user.admin = true
                else user.admin = false
            } else user.admin = false
        } catch (msg) {
            return res.status(400).json(msg)
        }
        
        const password = generator.generate({ uppercase: false, excludeSimilarCharacters: true }) 
        user.password = encryptPassword(password)
        user.firstAccess = false
        user.newUserByAdmin = true 
        user.createdAt = moment().format('L - LTS')  

        User.create(user).then(_ => {
            mail.newAccountByAdmin(user.email, user.name, password)
            res.status(200).json(successMessage)
        }).catch(_ => res.status(500).json(failMessage))
    }

    const viewUserDetails = (req, res) => {
        if(!req.session.user.permissions.users) {
            return res.status(401).render('500')
        }

        User.findOne({ _id: req.params.id }).then(getUser => {
            res.status(200).render('./admin/index', {
                user: req.session.user,
                page: 'Detalhes do usuário',
                getUser,
                moment,
                csrf: req.csrfToken(),
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const changeUser = (req, res) => {
        if(!req.session.user.permissions.users) {
            return res.status(401).json(failMessage)
        }

        const changeUser = { ...req.body }

        User.findOne({ _id: req.params.id }).then(async user => {
            if(changeUser.type === 'permission') {
                if(!req.session.user.permissions.changePermission) {
                    return res.status(401).json(failMessage)
                }
    
                if(changeUser.changePermission) user.permissions.changePermission = true
                else user.permissions.changePermission = false
    
                if(changeUser.report) user.permissions.report = true
                else user.permissions.report = false
    
                if(changeUser.users) user.permissions.users = true
                else user.permissions.users = false
    
                if(changeUser.home) user.permissions.home = true
                else user.permissions.home = false
    
                if(changeUser.origin) user.permissions.origin = true
                else user.permissions.origin = false
    
                if(changeUser.orderDetail) user.permissions.orderDetail = true
                else user.permissions.orderDetail = false
    
                if(changeUser.coupons) user.permissions.coupons = true
                else user.permissions.coupons = false
    
                if(changeUser.product) user.permissions.product = true
                else user.permissions.product = false
    
                if(changeUser.automation) user.permissions.automation = true
                else user.permissions.automation = false
    
                if(changeUser.afterSales) user.permissions.afterSales = true
                else user.permissions.afterSales = false
            } else {
                if(!changeUser.name && !changeUser.email && !changeUser.admin)
                    return res.status(400).json(failMessage)

                if(changeUser.name) {
                    try {
                        tooSmall(changeUser.name, 'Nome muito curto, digite um nome maior')
                        tooBig(changeUser.name, 'Nome muito longo, digite um nome menor')
                    } catch(msg) {
                        return res.status(400).json(msg)
                    }

                    user.name = changeUser.name
                }

                if(changeUser.email) {
                    try {
                        tooBigEmail(changeUser.email, 'Email é muito longo')
                        validEmailOrError(changeUser.email, 'Email inválido')
                        const userFromDB = await User.findOne({ email: changeUser.email })
                        .catch(err => new Error(err))
                        if(userFromDB instanceof Error) return res.status(500).json(failMessage)
                        notExistOrError(userFromDB, 'Esse Email já está registrado')
                    } catch(msg) {
                        return res.status(400).json(msg)
                    }

                    user.email = changeUser.email
                }

                if(changeUser.admin && changeUser.admin === 'Sim' && req.session.user.admin) {
                    user.admin = true
                }
            }

            user.save().then(res.status(200).json(successMessage))
        }).catch(_ => res.status(500).json(failMessage))
    }

    const removeUser = (req, res) => {
        if(!req.session.user.permissions.users) {
            return res.status(401).json(failMessage)
        }

        User.findOne({ _id: req.params.id }).then(user => {
            if(user.deletedAt) user.deletedAt = undefined
            else user.deletedAt = moment().format('L - LTS')

            user.save().then(res.status(200).json(successMessage))
        }).catch(_ => res.status(500).json(failMessage))
    }

    return {
        viewHome,
        viewProfile,
        changeProfile,
        viewOrderDetails,
        changeOrderDetails,
        changeSegmentation,
        viewCoupons,
        addCoupon,
        editCoupon,
        removeCoupon,
        viewPlans,
        addPlan,
        editPlan,
        removePlan,
        viewOrigin,
        viewAutomation,
        viewReport,
        viewAfterSales,
        viewUsers,
        addNewUser,
        viewUserDetails,
        changeUser,
        removeUser
    }
}