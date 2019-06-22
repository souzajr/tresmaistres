"use strict";

const bcrypt = require('bcrypt-nodejs')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Order = mongoose.model('Order')
const Product = mongoose.model('Product')
const mail = require('../config/mail')
const path = require('path')
const multer = require('multer')
const crypto = require('crypto')
const fs = require('fs')
const sharp = require('sharp')
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

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, './public/files')
        },
        filename: (req, file, cb) => {
            cb(null, crypto.randomBytes(10).toString('hex') + Date.now() + path.extname(file.originalname).toLowerCase())
        }
    })
    
    const upload = multer({ storage, fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname).toLowerCase()
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.bmp') {
            return callback(new Error())
        }

        callback(null, true)
    },
    limits: {
        limits: 1,
        fileSize: 1024 * 2048
    }}).single('file')

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(password, salt)
    }

    const viewAdmin = async (req, res) => {
        await Commission.find().then(async commission => {
            await Order.find().then(order => {
                res.status(200).render('./dashboard/index', {
                    user: req.session.user,
                    page: 'index',
                    commission,
                    order,
                    moment,
                    message: null
                })
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

    const changeAdminProfile = async (req, res) => {
        const changeInfoProfile = { ...req.body }

        if (!changeInfoProfile.newName && !changeInfoProfile.newEmail && !changeInfoProfile.currentPassword && !changeInfoProfile.newPassword && !changeInfoProfile.confirmNewPassword) {
            return res.status(400).json(failMessage)
        }

        await User.findOne({ _id: req.session.user._id }).then(async user => {
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
                    const userFromDB = await User.findOne({ email: changeInfoProfile.newEmail })
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
                    const checkUser = await User.findOne({
                        _id: req.session.user._id
                    })
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

            await user.save().then(user => {
                user.password = undefined
                req.session.user = user
                return res.status(200).json(successMessage)
            })
        }).catch(_ => res.status(500).json(failMessage))
    }

    const viewAdminFinancial = async (req, res) => { 
        await Order.find().then(async order => {
            await Commission.find().then(async commission => {

                const getUser = [], commissionedUser = []                
                const cleanResult = a => [ ...new Set(a.map(o => JSON.stringify(o)))].map(s => JSON.parse(s))

                for(let i = 0; i < commission.length; i++) {
                    getUser.push(commission[i]._idUser)
                }

                for(let i = 0; i < cleanResult(getUser).length; i++) {
                    for(let j = 0; j < commission.length; j++) {
                        if(commission[j]._idUser == cleanResult(getUser)[i]) {
                            if(!commissionedUser.length) {
                                await User.findOne({ _id: commission[j]._idUser }).then(user => {
                                    commissionedUser.push({
                                        _idUser: commission[j]._idUser,
                                        name: user.name,
                                        status: commission[j].status,
                                        phone: user.phone,
                                        email: user.email,
                                        document: user.documents.cpfOrCnpj,
                                        value: commission[j].value,
                                        payment: user.clinic.accounting ? { ...user.clinic.accounting } : ''
                                    })
                                })
                            } else {
                                let count = 0
                                for(let k = 0; k < commissionedUser.length; k++) {
                                    if(commission[j]._idUser == commissionedUser[k]._idUser) {
                                        commissionedUser[k].value += commission[j].value
                                        count++
                                        break
                                    }
                                }
    
                                if(count === 0) {
                                    await User.findOne({ _id: commission[j]._idUser }).then(user => {
                                        commissionedUser.push({
                                            _idUser: commission[j]._idUser,
                                            name: user.name,
                                            status: commission[j].status,
                                            phone: user.phone,
                                            email: user.email,
                                            document: user.documents.cpfOrCnpj,
                                            value: commission[j].value,
                                            payment: user.clinic.accounting ? { ...user.clinic.accounting } : ''
                                        })
                                    })
                                }
                            }
                        }
                    }
                }
                
                res.status(200).render('./dashboard/index', {
                    user: req.session.user,
                    page: 'financeiro',
                    commission,
                    commissionedUser,
                    order,
                    message: null
                })
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const sendTransaction = async (req, res) => {
        const transaction = { ...req.body }

        try {
            existOrError(transaction.bankAccountNumber, failMessage)
            existOrError(transaction.bankAccountAgency, failMessage)
            existOrError(transaction.bankName, failMessage)
            existOrError(transaction.bankAccountType, failMessage)
            existOrError(transaction.document, failMessage)
            existOrError(transaction.value, failMessage)
            existOrError(transaction.email, failMessage)
            existOrError(transaction.idUser, failMessage)
        } catch(msg) {
            return res.status(400).json(msg)
        }

        Commission.find({ _idUser: transaction.idUser, status: 'pendente' }).then(async commission => {
            for(let i = 0; i < commission.length; i++) {
                commission[i].status = 'pago'
                commission[i].paidFor = {
                    bankAccountNumber: transaction.bankAccountNumber,
                    bankAccountAgency: transaction.bankAccountAgency,
                    bankName: transaction.bankName,
                    bankAccountType: transaction.bankAccountType,
                    document: transaction.document,
                    paidAt: moment().format('L - LTS')
                }

                await commission[i].save()
            }
        }).then(_ => {
            mail.sendTransaction(transaction.email, transaction.name, transaction.value)
            res.status(200).json(successMessage)
        }).catch(_ => res.status(500).json(failMessage))
    }

    const removeCommission = async (req, res) => {
        Commission.find({ _idUser: req.body.userId, status: 'pendente' }).then(async commission => {
            for(let i = 0; i < commission.length; i++) {
                commission[i].status = 'cancelado'
                await commission[i].save()
            }
        }).then(_ => res.status(200).json(successMessage))
        .catch(_ => res.status(500).json(failMessage))
    }

    const changeCommissionStatus = (req, res) => {
        Commission.find({ _idUser: req.body.userId, status: req.body.status }).then(async commission => {
            for(let i = 0; i < commission.length; i++) {
                commission[i].status = 'pendente'
                await commission[i].save()
            }
        }).then(_ => res.status(200).json(successMessage))
        .catch(_ => res.status(500).json(failMessage))
    }

    const viewAdminFinancialDetails = async (req, res) => {
        await Order.findOne({ _id: req.params.id }).then(async order => {
            const commission = []
            for(let i = 0; i < order.product.length; i++) {
                await Commission.findOne({ _idOrder: order._id }).then(getCommission => commission.push(getCommission))
            }

            res.status(200).render('./dashboard/index', {
                user: req.session.user,
                page: 'detalhes do financeiro',
                commission,
                order,
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const viewUsers = (req, res) => {
        User.find().then(users => {
            res.status(200).render('./dashboard/index', {
                user: req.session.user,
                page: 'usuarios',
                users,
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const viewUserDetails = (req, res) => {
        User.findOne({ _id: req.params.id }).then(getUser => {
            Order.find({ _idUser: getUser._id }).then(orders => {
                Commission.find({ _idUser: getUser._id }).then(commissions => {
                    res.status(200).render('./dashboard/index', {
                        user: req.session.user,
                        page: 'detalhes do usuario',
                        getUser,
                        orders,
                        commissions,
                        message: null
                    })
                })
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const viewClinicsOnHold = (req, res) => {
        User.find({ role: 'clinic', 'clinic.registerStatus': 'pendente' }).then(clinics => {
            res.status(200).render('./dashboard/index', {
                user: req.session.user,
                page: 'clinicas',
                clinics,
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const releaseClinicsOnHold = (req, res) => {
        User.findOne({ _id: req.body.userId }).then(user => {
            user.clinic.registerStatus = 'ativo'
            if(req.body.percentage) {
                const percentage = Number((Number(req.body.percentage)).toFixed(0))
                if(percentage.toString() === 'NaN') return res.status(400).json(failMessage)
                if(percentage < 1 || percentage > 99) return res.status(400).json('A porcentagem deve ser de 1 a 99')

                user.clinic.commissionPercentage = percentage
            }

            return user
        }).then(user => user.save()).then(user => {
            mail.clinicApproval(user.email, user.name) 
            res.status(200).json(successMessage)
        })
        .catch(_ => res.status(500).json(failMessage))
    }

    const viewSystem = (req, res) => {
        System.find().then(system => {
            Category.find().then(category => {
                res.status(200).render('./dashboard/index', {
                    user: req.session.user,
                    page: 'sistema',
                    system: system[0],
                    category,
                    message: null
                })
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const viewProduct = (req, res) => {        
        System.find().then(system => {
            Product.find().then(async getProduct => {
                const product = []
                if(getProduct.length) {
                    for(let i = 0; i < system[0].product.length; i++) {
                        for(let j = 0; j < getProduct.length; j++) {
                            if(getProduct[j]._idModel == system[0].product[i]._id) {
                                await User.findOne({ _id: getProduct[j]._idOwner }).then(clinic => {
                                    product.push({
                                        _idOwner: getProduct[j]._idOwner,
                                        _idModel: system[0].product[i]._id,
                                        clinicName: clinic.name,
                                        url: clinic.clinic.url,
                                        name: system[0].product[i].name,
                                        percentage: system[0].product[i].percentage,
                                        value: getProduct[j].value,
                                        createdAt: getProduct[j].createdAt
                                    })
                                })
                            }
                        }
                    }
                }

                res.status(200).render('./dashboard/index', {
                    user: req.session.user,
                    page: 'produtos',
                    product,
                    system: system[0],
                    message: null
                })
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const addProduct = (req, res) => {
        System.find().then(system => {
            upload(req, res, function(err) {
                if (err instanceof multer.MulterError) {
                    return res.status(400).json(failMessage)
                } else if (err) {
                    return res.status(400).json(failMessage)
                } else if (!req.file) {
                    return res.status(400).json('Você deve selecionar uma imagem')
                }

                const newProduct = { ...req.body }

                try {
                    existOrError(newProduct.name, 'Digite o nome do produto')
                    if(system.length && system[0].product.length) {
                        for(let i = 0; i < system[0].product.length; i++) {
                            if(system[0].product[i].name == newProduct.name) {
                                return res.status(400).json('Nome de produto repetido, escolha outro nome')
                            }
                        }
                    }
                    existOrError(newProduct.percentage, 'Digite a taxa do produto')
                    newProduct.percentage = Number(Number(newProduct.percentage).toFixed(2))
                    if(newProduct.percentage.toString() === 'NaN') return res.status(400).json(failMessage)
                    if(newProduct.percentage < 1 || newProduct.percentage > 99) return res.status(400).json('A porcentagem deve ser maior que 1 e menor que 99')
                    existOrError(newProduct.description, 'Digite a descrição do produto')
                } catch(msg) {
                    fs.unlinkSync('./public/files/' + req.file.filename)
                    return res.status(400).json(msg)
                }
    
                sharp.cache(false)
                sharp('./public/files/' + req.file.filename)
                .resize({
                    width: 750,
                    height: 750,
                    fit: sharp.fit.cover,
                    position: sharp.strategy.entropy
                })
                .toFile('./public/files/product/' + req.file.filename)
                .then(_ => {
                    if(!system.length) {
                        new System({
                            product: {
                                name: newProduct.name,
                                percentage: newProduct.percentage, 
                                photo: req.file.filename,
                                description: newProduct.description,
                                category: newProduct.category ? newProduct.category : 'Sem categoria',
                                subCategory: newProduct.subCategory ? newProduct.subCategory : 'Sem subcategoria',
                                createdAt: moment().format('L - LTS')
                            }
                        }).save().then(_ => {
                            fs.unlinkSync('./public/files/' + req.file.filename)
                            res.status(200).json(successMessage)
                        })
                    } else {
                        system[0].product.push({
                            name: newProduct.name,
                            percentage: newProduct.percentage, 
                            photo: req.file.filename,
                            description: newProduct.description,
                            category: newProduct.category ? newProduct.category : 'Sem categoria',
                            subCategory: newProduct.subCategory ? newProduct.subCategory : 'Sem subcategoria',
                            createdAt: moment().format('L - LTS')
                        })                        

                        system[0].save().then(_ => {
                            fs.unlinkSync('./public/files/' + req.file.filename)
                            res.status(200).json(successMessage)
                        })
                    }
                })
            })
        }).catch(_ => res.status(500).json(failMessage))
    }
    
    const removeProduct = (req, res) => {
        System.find().then(async system => {
            for(let i = 0; i < system[0].product.length; i++) {
                if(system[0].product[i]._id == req.body.productId) {
                    await Product.deleteMany({ _idModel: system[0].product[i]._id })
                    system[0].product.splice(i, 1)
                    break
                }
            }

            system[0].save().then(_ => res.status(200).json(successMessage))
        }).catch(_ => res.status(500).json(failMessage))
    }

    const addCategory = (req, res) => {
        const newCategory = { ...req.body }

        if(!newCategory.name) return res.status(400).json('Digite o nome da categoria')
        if(!newCategory.type || (newCategory.type !== 'category' && newCategory.type !== 'subCategory')) return res.status(400).json('Escolha o tipo da categoria')

        new Category({ 
            name: newCategory.name,
            type: newCategory.type
        }).save().then(res.status(200).json(successMessage))
        .catch(_ => res.status(500).json(failMessage))
    }

    const removeCategory = (req, res) => {
        Category.findOne({ _id: req.body.categoryId })
        .then(category => {
            System.find().then(async system => {
                if(system[0].product.length) {
                    for(let i = 0; i < system[0].product.length; i++) {
                        if(category.type === 'category') {
                            if(system[0].product[i].category === category.name) system[0].product[i].category = 'Sem categoria'
                        } else {
                            if(system[0].product[i].subCategory === category.name) system[0].product[i].subCategory = 'Sem subcategoria'
                        }
                    }

                    system[0].save().then(Category.findOneAndRemove({ _id: category._id }).then(res.status(200).json(successMessage)))
                } else Category.findOneAndRemove({ _id: category._id }).then(res.status(200).json(successMessage))
            })
        }).catch(_ => res.status(500).json(failMessage))
    }

    const changeCategory = (req, res) => {
        const newCategory = { ...req.body }

        if(!newCategory.name) return res.status(400).json('Digite o nome da categoria')
        if(!newCategory.type || (newCategory.type !== 'category' && newCategory.type !== 'subCategory')) return res.status(400).json('Escolha o tipo da categoria')

        Category.findOne({ _id: newCategory.categoryId }).then(async category => {
            System.find().then(system => {
                if(category.name !== newCategory.name) {
                    for(let i = 0; i < system[0].product.length; i++) {
                        if(category.type === 'category') {
                            if(system[0].product[i].category === category.name) system[0].product[i].category = newCategory.name
                        } else {
                            if(system[0].product[i].subCategory === category.name) system[0].product[i].subCategory = newCategory.name
                        }
                    }      

                    category.name = newCategory.name
                } 

                if(category.type !== newCategory.type) {
                    for(let i = 0; i < system[0].product.length; i++) {
                        if(category.type === 'category') {
                            if(!system[0].product[i].category || system[0].product[i].category !== 'Sem categoria') {
                                system[0].product[i].category = 'Sem categoria'
                            }
                        } else {
                            if(!system[0].product[i].subCategory || system[0].product[i].subCategory !== 'Sem subcategoria') {
                                system[0].product[i].subCategory = 'Sem subcategoria'
                            }
                        }
                    }      

                    category.type = newCategory.type
                } 

                system[0].save().then(category.save().then(res.status(200).json(successMessage)))
            })
        }).catch(_ => res.status(500).json(failMessage))
    }

    const changeProduct = (req, res) => {
        System.find().then(system => {
            upload(req, res, function(err) {
                if (err instanceof multer.MulterError) {
                    return res.status(400).json(failMessage)
                } else if (err) {
                    return res.status(400).json(failMessage)
                } else if (!req.file) {
                    const changeProduct = { ...req.body }
                    for(let i = 0; i < system[0].product.length; i++) {
                        if(system[0].product[i]._id == req.params.id) {
                            if(changeProduct.percentage) {
                                changeProduct.percentage = Number(Number(changeProduct.percentage).toFixed(2))
                                if(changeProduct.percentage.toString() === 'NaN') return res.status(400).json(failMessage)
                                if(changeProduct.percentage < 1 || changeProduct.percentage > 99) return res.status(400).json('A porcentagem deve ser maior que 1 e menor que 99')
                                system[0].product[i].percentage = changeProduct.percentage
                            }

                            if(changeProduct.name && system[0].product[i].name !== changeProduct.name) {
                                let nameIsEqual = false
                                for(let j = 0; j < system[0].product.length; j++) {
                                    if(system[0].product[j].name === changeProduct.name) {
                                        nameIsEqual = true
                                        break
                                    }
                                }

                                if(nameIsEqual) return res.status(400).json('Nome de produto repetido, escolha outro nome')
                                system[0].product[i].name = changeProduct.name
                            }

                            if(changeProduct.description) system[0].product[i].description = changeProduct.description
                            if(changeProduct.category) system[0].product[i].category = changeProduct.category
                            if(changeProduct.subCategory) system[0].product[i].subCategory = changeProduct.subCategory

                            return system[0].save().then(_ => res.status(200).json(successMessage))
                        }
                    }
                }

                const changeProduct = { ...req.body }
                for(let i = 0; i < system[0].product.length; i++) {
                    if(system[0].product[i]._id == req.params.id) {
                        if(changeProduct.percentage) {
                            changeProduct.percentage = Number(Number(changeProduct.percentage).toFixed(2))
                            if(changeProduct.percentage.toString() === 'NaN') return res.status(400).json(failMessage)
                            if(changeProduct.percentage < 1 || changeProduct.percentage > 99) return res.status(400).json('A porcentagem deve ser maior que 1 e menor que 99')
                            system[0].product[i].percentage = changeProduct.percentage
                        }

                        if(changeProduct.name && system[0].product[i].name !== changeProduct.name) {
                            let nameIsEqual = false
                            for(let j = 0; j < system[0].product.length; j++) {
                                if(system[0].product[j].name === changeProduct.name) {
                                    nameIsEqual = true
                                    break
                                }
                            }

                            if(nameIsEqual) return res.status(400).json('Nome de produto repetido, escolha outro nome')
                            system[0].product[i].name = changeProduct.name
                        }

                        if(changeProduct.description) system[0].product[i].description = changeProduct.description
                        if(changeProduct.category) system[0].product[i].category = changeProduct.category
                        if(changeProduct.subCategory) system[0].product[i].subCategory = changeProduct.subCategory
                    
                        sharp.cache(false)
                        sharp('./public/files/' + req.file.filename)
                        .resize({
                            width: 750,
                            height: 750,
                            fit: sharp.fit.cover,
                            position: sharp.strategy.entropy
                        })
                        .toFile('./public/files/product/' + req.file.filename)
                        .then(_ => {
                            fs.unlinkSync('./public/files/product/' + system[0].product[i].photo)
                            system[0].product[i].photo = req.file.filename

                            system[0].save().then(_ => {
                                fs.unlinkSync('./public/files/' + req.file.filename)
                                res.status(200).json(successMessage)
                            })
                        })
                    }
                }
            })
        }).catch(_ => res.status(500).json(failMessage))
    }

    return {
        viewAdmin,
        viewAdminProfile,
        changeAdminProfile,
        viewAdminFinancial,
        sendTransaction,
        removeCommission,
        changeCommissionStatus,
        viewAdminFinancialDetails,
        viewUsers,
        viewUserDetails,
        viewClinicsOnHold,
        releaseClinicsOnHold,
        viewSystem,
        viewProduct,
        addProduct,
        removeProduct,
        addCategory,
        removeCategory,
        changeCategory,
        changeProduct
    }
}