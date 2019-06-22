'use strict';

const pagarme = require('pagarme')
const mongoose = require('mongoose')
const Order = mongoose.model('Order')
const Product = mongoose.model('Product')
const PagarmeReport = mongoose.model('PagarmeReport')
const User = mongoose.model('User')
const cepValidator = require('cep-promise')
const cpf = require('@fnando/cpf/dist/node')
const cnpj = require('@fnando/cnpj/dist/node')
const bcrypt = require('bcrypt-nodejs')
const mail = require('../config/mail')
const qs = require('qs')
const moment = require('moment')
moment.locale('pt-br')
const failMessage = 'Algo deu errado'
const api_key = process.env.PAGARME_API_KEY 

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
        notSpaceOrError,
        validEmailOrError
    } = app.src.api.validation

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(password, salt)
    }

    const checkout = async (req, res) => {
        const order = { ...req.body }

        try {
            existOrError(order.buyer.name, 'Digite seu nome')
            tooSmall(order.buyer.name, 'Nome muito curto, digite um nome maior')
            tooBig(order.buyer.name, 'Nome muito longo, digite um nome menor')
            existOrError(order.buyer.phone, 'Digite seu telefone')
            order.buyer.phone = order.buyer.phone.split('(').join('').split(')').join('').split('-').join('').split(' ').join('')
            existOrError(order.buyer.email, 'Digite seu Email')
            tooBigEmail(order.buyer.email, 'Email muito longo, digite um Email menor')
            validEmailOrError(order.buyer.email, 'Email inválido')
            existOrError(order.buyer.documents.typeDoc, 'Escolha entre pessoa física ou pessoa jurídica')
            existOrError(order.buyer.documents.cpfOrCnpj, 'Digite seu CPF ou seu CNPJ')
            if(order.buyer.documents.typeDoc === 'pf') {
                if(!cpf.isValid(order.buyer.documents.cpfOrCnpj)) return res.status(400).json('CPF inválido')
                order.buyer.documents.cpfOrCnpj = cpf.strip(order.buyer.documents.cpfOrCnpj)
            } else if(order.buyer.documents.typeDoc === 'pj') {
                if(!cnpj.isValid(order.buyer.documents.cpfOrCnpj)) return res.status(400).json('CNPJ inválido')
                order.buyer.documents.cpfOrCnpj = cnpj.strip(order.buyer.documents.cpfOrCnpj)
            } else return res.status(400).json(failMessage)
            existOrError(order.buyer.birthday, 'Digite a data de nascimento do titular da cobrança')  
            if(moment().diff(moment(order.buyer.birthday, 'YYYY-MM-DD'), 'years') < 18) return res.status(400).json('O titular da cobrança deve ter mais de 18 anos de idade')
            existOrError(order.buyer.address.street, 'Digite a rua ou avenida do endereço de cobrança')
            existOrError(order.buyer.address.number, 'Digite a número do endereço de cobrança')
            existOrError(order.buyer.address.city, 'Digite a cidade do endereço de cobrança')
            existOrError(order.buyer.address.state, 'Escolha o estado do endereço de cobrança')
            existOrError(order.buyer.address.zipCode, 'Digite o CEP do endereço de cobrança')
            order.buyer.address.zipCode = order.buyer.address.zipCode.split('.').join('').split('-').join('')
            const validateZipCode = await cepValidator(order.buyer.address.zipCode).catch(err => err)
            notExistOrError(validateZipCode.errors, 'CEP inválido') 
            existOrError(order.buyer.address.neighborhood, 'Digite o bairro do endereço de cobrança')   
            if(!order.buyer.hasAccount) {
                existOrError(order.buyer.password, 'Digite sua senha')
                hasDigitOrError(order.buyer.password, 'A senha deve ter pelo menos um número')
                //hasLowerOrError(order.buyer.password, 'A senha deve ter pelo menos uma letra minúscula')
                //hasUpperOrError(order.buyer.password, 'A senha deve ter pelo menos uma letra maiúscula')
                notSpaceOrError(order.buyer.password, 'A senha não deve ter espaços em branco')
                //hasSpecialOrError(order.buyer.password, 'A senha deve ter pelo menos um caractere especial')
                strongOrError(order.buyer.password, 'A senha deve conter pelo menos 8 caracteres')
                existOrError(order.buyer.confirmPassword, 'Digite a confirmação da senha')
                equalsOrError(order.buyer.password, order.buyer.confirmPassword, 'A senha e confirmação da senha não são iguais')
            }      
            if(order.hasPatient) {
                existOrError(order.patient.name, 'Digite o nome do paciente')
                tooSmall(order.patient.name, 'Nome do paciente muito curto, digite um nome maior')
                tooBig(order.patient.name, 'Nome do paciente muito longo, digite um nome menor')
                existOrError(order.patient.phone, 'Digite o telefone do paciente')
                order.patient.phone = order.patient.phone.split('(').join('').split(')').join('').split('-').join('').split(' ').join('')
                existOrError(order.patient.email, 'Digite o Email do paciente')
                tooBigEmail(order.patient.email, 'Email do paciente muito longo, digite um Email menor')
                validEmailOrError(order.patient.email, 'Email do paciente inválido')
                existOrError(order.patient.documents.typeDoc, 'Escolha entre pessoa física ou pessoa jurídica para o paciente')
                existOrError(order.patient.documents.cpfOrCnpj, 'Digite o CPF ou o CNPJ do paciente')
                if(order.patient.documents.typeDoc === 'pf') {
                    if(!cpf.isValid(order.patient.documents.cpfOrCnpj)) return res.status(400).json('CPF inválido')
                    order.patient.documents.cpfOrCnpj = cpf.strip(order.patient.documents.cpfOrCnpj)
                } else if(order.patient.documents.typeDoc === 'pj') {
                    if(!cnpj.isValid(order.patient.documents.cpfOrCnpj)) return res.status(400).json('CNPJ inválido')
                    order.patient.documents.cpfOrCnpj = cnpj.strip(order.patient.documents.cpfOrCnpj)
                } else return res.status(400).json(failMessage)
                existOrError(order.patient.birthday, 'Digite a data de nascimento do paciente')  
                existOrError(order.patient.address.street, 'Digite a rua ou avenida do endereço do paciente')
                existOrError(order.patient.address.number, 'Digite a número do endereço do paciente')
                existOrError(order.patient.address.city, 'Digite a cidade do endereço do paciente')
                existOrError(order.patient.address.state, 'Escolha o estado do endereço do paciente')
                existOrError(order.patient.address.zipCode, 'Digite o CEP do endereço do paciente')
                order.patient.address.zipCode = order.patient.address.zipCode.split('.').join('').split('-').join('')
                const validateZipCode = await cepValidator(order.patient.address.zipCode).catch(err => err)
                notExistOrError(validateZipCode.errors, 'CEP do paciente inválido') 
                existOrError(order.patient.address.neighborhood, 'Digite o bairro do endereço do paciente')
            }
            if(!order.product || !order.product.length) return res.status(400).json(failMessage)
        } catch(msg) {
            return res.status(400).json(msg)
        }

        order.total = 0
        const items = []
        await System.find().then(async system => {
            for(let i = 0; i < order.product.length; i++) {
                if(order.product[i].type === 'event') {
                    await Event.findOne({ _id: order.product[i].id }).then(async event => {
                        if(event.status !== 'disponivel') return res.status(500).json(failMessage)
                        await Product.findOne({ _id: event._idProduct }).then(getProduct => {
                            for(let j = 0; j < system[0].product.length; j++) {
                                if(system[0].product[j]._id == getProduct._idModel) {
                                    const value = Number((getProduct.value / (1 - (system[0].product[j].percentage / 100))).toFixed(0))
                                    if(value.toString() === 'NaN' || value < 1000) return res.status(400).json(failMessage)

                                    order.product[i] = {
                                        _idProduct: getProduct._id,
                                        _idOwner: getProduct._idOwner,
                                        _idModel: getProduct._idModel,
                                        _idEvent: event._id,
                                        start: event.start,
                                        schedule: getProduct.schedule,
                                        name: system[0].product[j].name,
                                        clinicValue: getProduct.value,
                                        percentage: system[0].product[j].percentage,
                                        value
                                    }

                                    items.push({
                                        'id': getProduct._id,
                                        'title': system[0].product[j].name,
                                        'unit_price': value,
                                        'quantity': 1,
                                        'tangible': false
                                    })

                                    order.total += value
                                    break
                                }
                            }
                        })
                    })
                } else if(order.product[i].type === 'product') {
                    await Product.findOne({ _id: order.product[i].id }).then(getProduct => {
                        for(let j = 0; j < system[0].product.length; j++) {
                            if(system[0].product[j]._id == getProduct._idModel) {
                                const value = Number((getProduct.value / (1 - (system[0].product[j].percentage / 100))).toFixed(0))
                                if(value.toString() === 'NaN' || value < 1000) return res.status(400).json(failMessage)

                                order.product[i] = {
                                    _idProduct: getProduct._id,
                                    _idOwner: getProduct._idOwner,
                                    _idModel: getProduct._idModel,
                                    schedule: getProduct.schedule,
                                    name: system[0].product[j].name,
                                    clinicValue: getProduct.value,
                                    percentage: system[0].product[j].percentage,
                                    value
                                }

                                items.push({
                                    'id': getProduct._id,
                                    'title': system[0].product[j].name,
                                    'unit_price': value,
                                    'quantity': 1,
                                    'tangible': false
                                })

                                order.total += value
                                break
                            }
                        }
                    })
                } else return res.status(400).json(failMessage)
            } 
        }).catch(_ => res.status(500).json(failMessage))
        
        if(order.paymentConfig.method === 'credit_card') {
            if(!order.paymentConfig.card_hash || !order.paymentConfig.card_hash.length) return res.status(400).json(failMessage)

            if(order.paymentConfig.card_hash.length === 1) {

                let user = await User.findOne({ email: order.buyer.email })
                .catch(err => new Error(err))
                if(user instanceof Error) return res.status(500).json(failMessage)
                if(!user) {
                    delete order.buyer.confirmPassword
        
                    user = await new User({
                        name: order.buyer.name,
                        email: order.buyer.email,
                        password: encryptPassword(order.buyer.password),
                        phone: order.buyer.phone,
                        admin: false,
                        createdAt: moment().format('L - LTS'),
                        role: 'user',
                        address: {
                            street: order.buyer.address.street,
                            neighborhood: order.buyer.address.neighborhood,
                            number: order.buyer.address.number,
                            complement: order.buyer.address.complement,
                            zipCode: order.buyer.address.zipCode,
                            city: order.buyer.address.city,
                            state: order.buyer.address.state
                        },
                        documents: {
                            typeDoc: order.buyer.documents.typeDoc,
                            cpfOrCnpj: order.buyer.documents.cpfOrCnpj
                        },
                        firstAccess: false,
                    }).save().then(user => {
                        mail.sendWelcome(user.email, user.name)
                        delete order.buyer.password 
                        return user
                    }).catch(err => new Error(err))
        
                    if(user instanceof Error) return res.status(500).json(failMessage)
                } else {
                    if(!req.session.user) return res.status(400).json('Email já cadastrado, faça login na sua conta para continuar ou digite outro Email')
                    if(req.session.user._id != user._id) return res.status(400).json(failMessage)
        
                    if(!user.phone) user.phone = order.buyer.phone
                    if(!user.birthday) user.birthday = order.buyer.birthday
                    if(!user.documents.typeDoc) user.documents.typeDoc = order.buyer.documents.typeDoc
                    if(!user.documents.cpfOrCnpj) user.documents.cpfOrCnpj = order.buyer.documents.cpfOrCnpj
                    if(!user.address.street) user.address.street = order.buyer.address.street
                    if(!user.address.number) user.address.number = order.buyer.address.number
                    if(!user.address.complement) user.address.complement = order.buyer.address.complement
                    if(!user.address.city) user.address.city = order.buyer.address.city
                    if(!user.address.state) user.address.state = order.buyer.address.state
                    if(!user.address.zipCode) user.address.zipCode = order.buyer.address.zipCode
                    if(!user.address.neighborhood) user.address.neighborhood = order.buyer.address.neighborhood
                    await user.save()
                }

                pagarme.client.connect({ api_key })
                .then(client => client.transactions.create({
                    'amount': order.total,
                    'card_hash': order.paymentConfig.card_hash[0],
                    'postback_url': process.env.DOMAIN_NAME + process.env.PAGARME_POSTBACK,
                    'async': false,
                    'installments': 1,
                    'capture': true,
                    'payment_method': order.paymentConfig.method,
                    'customer': {
                        'external_id': user._id,
                        'name': order.buyer.name,
                        'type': order.buyer.documents.typeDoc === 'pf' ? 'individual' : 'corporation',
                        'country': 'br',
                        'email': order.buyer.email,
                        'documents': [{
                            'type': order.buyer.documents.typeDoc === 'pf' ? 'cpf' : 'cnpj',
                            'number': order.buyer.documents.cpfOrCnpj
                        }],
                        'phone_numbers': [ '+55' + order.buyer.phone ],
                        'birthday': order.buyer.birthday
                    },
                    'billing': {
                        'name': order.buyer.name,
                        'address': {
                            'country': 'br',
                            'state': order.buyer.address.state,
                            'city': order.buyer.address.city,
                            'neighborhood': order.buyer.address.neighborhood,
                            'complementary': order.buyer.address.complement ? order.buyer.address.complement : 'Sem complemento',
                            'street': order.buyer.address.street,
                            'street_number': order.buyer.address.number,
                            'zipcode': order.buyer.address.zipCode
                        }
                    },
                    'items': items
                })).then(async transaction => {
                    if(transaction.status === 'paid') {
                        if(transaction.amount === transaction.paid_amount) {
                            await new PagarmeReport(transaction).save().then(async report => {
                                order._pagarmeReport = report._id
                                order._idTransactionPagarme = transaction.id
                                order.status = transaction.status
                                order.cost = transaction.cost
                                order._idUser = user._id
                                order.createdAt = moment().format('L - LTS')
        
                                await Order.create(order).then(async order => { 
                                    for(let i = 0; i < order.product.length; i++) {
                                        if(order.product[i].schedule) {
                                            await new Commission({
                                                _idUser: order.product[i]._idOwner,
                                                _idOrder: order._id,
                                                _idProduct: order.product[i]._idProduct,
                                                _idEvent: order.product[i]._idEvent,
                                                name: order.product[i].name,
                                                value: order.product[i].clinicValue,
                                                status: 'pendente',
                                                createdAt: order.createdAt
                                            }).save().then(async _ => {
                                                await Event.findOne({ _id: order.product[i]._idEvent }).then(async event => {
                                                    event._idOrder = order._id
                                                    event._idClient = user._id
                                                    event.status = 'pendente'
                                                    event.color = '#dc7d35'
                                                    
                                                    if(order.hasPatient) {
                                                        event.title = order.patient.name
                                                        event.patientInfo = {
                                                            name: order.patient.name,
                                                            phone: order.patient.phone,
                                                            email: order.patient.email,
                                                            birthDate: order.patient.birthday,
                                                            document: order.patient.documents.cpfOrCnpj
                                                        }
                                                    } else {
                                                        event.title = order.buyer.name
                                                        event.patientInfo = {
                                                            name: order.buyer.name,
                                                            phone: order.buyer.phone,
                                                            email: order.buyer.email,
                                                            birthDate: order.buyer.birthday,
                                                            document: order.buyer.documents.cpfOrCnpj
                                                        }
                                                    }
            
                                                    await event.save()
                                                })
                                            })
                                        } else {
                                            await new Commission({
                                                _idUser: order.product[i]._idOwner,
                                                _idOrder: order._id,
                                                _idProduct: order.product[i]._idProduct,
                                                name: order.product[i].name,
                                                value: order.product[i].clinicValue,
                                                status: 'pendente',
                                                createdAt: order.createdAt
                                            }).save()
                                        }
                                    }
                                    
                                    req.session.cart = []                                    
                                    mail.paymentReceived(order)
                                    res.status(200).json('/detalhes-do-pedido/' + order._id)
                                })
                            })
                        } else {
                            pagarme.client.connect({ api_key })
                            .then(client => client.transactions.refund({ id: transaction.id }))
                            .then(async transaction => {
                                await new PagarmeReport(transaction).save().then(async report => {
                                    order._pagarmeReport = report._id
                                    order._idTransactionPagarme = transaction.id
                                    order.status = transaction.status
                                    order._idUser = user._id
                                    order.createdAt = moment().format('L - LTS')
            
                                    await Order.create(order).then(order => {        
                                        req.session.cart = []
                                        mail.orderFailed(order)
                                        res.status(200).json('/detalhes-do-pedido/' + order._id)
                                    })
                                })
                            })
                        }
                    } else {
                        await new PagarmeReport(transaction).save().then(async report => {
                            order._pagarmeReport = report._id
                            order._idTransactionPagarme = transaction.id
                            order.status = transaction.status
                            order._idUser = user._id
                            order.createdAt = moment().format('L - LTS')

                            await Order.create(order).then(order => {
                                mail.orderFailed(order)
                                res.status(400).json(failMessage)
                            })
                        })
                    }
                }).catch(_ => res.status(500).json(failMessage))
            } else if(order.paymentConfig.card_hash.length === 2) {
                if(!(order.total >= 10000)) return res.status(400).json(failMessage)
                const halfTotalOrder = Number((order.total / 2).toFixed(0))
                if(halfTotalOrder.toString() === 'NaN') return res.status(400).json(failMessage)

                let user = await User.findOne({ email: order.buyer.email })
                .catch(err => new Error(err))
                if(user instanceof Error) return res.status(500).json(failMessage)
                if(!user) {
                    delete order.buyer.confirmPassword
        
                    user = await new User({
                        name: order.buyer.name,
                        email: order.buyer.email,
                        password: encryptPassword(order.buyer.password),
                        phone: order.buyer.phone,
                        admin: false,
                        createdAt: moment().format('L - LTS'),
                        role: 'user',
                        address: {
                            street: order.buyer.address.street,
                            neighborhood: order.buyer.address.neighborhood,
                            number: order.buyer.address.number,
                            complement: order.buyer.address.complement,
                            zipCode: order.buyer.address.zipCode,
                            city: order.buyer.address.city,
                            state: order.buyer.address.state
                        },
                        documents: {
                            typeDoc: order.buyer.documents.typeDoc,
                            cpfOrCnpj: order.buyer.documents.cpfOrCnpj
                        },
                        firstAccess: false,
                    }).save().then(user => {
                        mail.sendWelcome(user.email, user.name)
                        delete order.buyer.password 
                        return user
                    }).catch(err => new Error(err))
        
                    if(user instanceof Error) return res.status(500).json(failMessage)
                } else {
                    if(!req.session.user) return res.status(400).json('Email já cadastrado, faça login na sua conta para continuar ou digite outro Email')
                    if(req.session.user._id != user._id) return res.status(400).json(failMessage)
        
                    if(!user.phone) user.phone = order.buyer.phone
                    if(!user.birthday) user.birthday = order.buyer.birthday
                    if(!user.documents.typeDoc) user.documents.typeDoc = order.buyer.documents.typeDoc
                    if(!user.documents.cpfOrCnpj) user.documents.cpfOrCnpj = order.buyer.documents.cpfOrCnpj
                    if(!user.address.street) user.address.street = order.buyer.address.street
                    if(!user.address.number) user.address.number = order.buyer.address.number
                    if(!user.address.complement) user.address.complement = order.buyer.address.complement
                    if(!user.address.city) user.address.city = order.buyer.address.city
                    if(!user.address.state) user.address.state = order.buyer.address.state
                    if(!user.address.zipCode) user.address.zipCode = order.buyer.address.zipCode
                    if(!user.address.neighborhood) user.address.neighborhood = order.buyer.address.neighborhood
                    await user.save()
                }

                pagarme.client.connect({ api_key })
                .then(client => client.transactions.create({
                    'amount': halfTotalOrder,
                    'card_hash': order.paymentConfig.card_hash[0],
                    'postback_url': process.env.DOMAIN_NAME + process.env.PAGARME_POSTBACK,
                    'async': false,
                    'installments': 1,
                    'capture': true,
                    'payment_method': order.paymentConfig.method,
                    'customer': {
                        'external_id': user._id,
                        'name': order.buyer.name,
                        'type': order.buyer.documents.typeDoc === 'pf' ? 'individual' : 'corporation',
                        'country': 'br',
                        'email': order.buyer.email,
                        'documents': [{
                            'type': order.buyer.documents.typeDoc === 'pf' ? 'cpf' : 'cnpj',
                            'number': order.buyer.documents.cpfOrCnpj
                        }],
                        'phone_numbers': [ '+55' + order.buyer.phone ],
                        'birthday': order.buyer.birthday
                    },
                    'billing': {
                        'name': order.buyer.name,
                        'address': {
                            'country': 'br',
                            'state': order.buyer.address.state,
                            'city': order.buyer.address.city,
                            'neighborhood': order.buyer.address.neighborhood,
                            'complementary': order.buyer.address.complement ? order.buyer.address.complement : 'Sem complemento',
                            'street': order.buyer.address.street,
                            'street_number': order.buyer.address.number,
                            'zipcode': order.buyer.address.zipCode
                        }
                    },
                    'items': items
                })).then(async firstTransaction => {
                    if(firstTransaction.status === 'paid') {
                        if(firstTransaction.amount === firstTransaction.paid_amount) {
                            pagarme.client.connect({ api_key })
                            .then(client => client.transactions.create({
                                'amount': halfTotalOrder,
                                'card_hash': order.paymentConfig.card_hash[1],
                                'postback_url': process.env.DOMAIN_NAME + process.env.PAGARME_POSTBACK,
                                'async': false,
                                'installments': 1,
                                'capture': true,
                                'payment_method': order.paymentConfig.method,
                                'customer': {
                                    'external_id': user._id,
                                    'name': order.buyer.name,
                                    'type': order.buyer.documents.typeDoc === 'pf' ? 'individual' : 'corporation',
                                    'country': 'br',
                                    'email': order.buyer.email,
                                    'documents': [{
                                        'type': order.buyer.documents.typeDoc === 'pf' ? 'cpf' : 'cnpj',
                                        'number': order.buyer.documents.cpfOrCnpj
                                    }],
                                    'phone_numbers': [ '+55' + order.buyer.phone ],
                                    'birthday': order.buyer.birthday
                                },
                                'billing': {
                                    'name': order.buyer.name,
                                    'address': {
                                        'country': 'br',
                                        'state': order.buyer.address.state,
                                        'city': order.buyer.address.city,
                                        'neighborhood': order.buyer.address.neighborhood,
                                        'complementary': order.buyer.address.complement ? order.buyer.address.complement : 'Sem complemento',
                                        'street': order.buyer.address.street,
                                        'street_number': order.buyer.address.number,
                                        'zipcode': order.buyer.address.zipCode
                                    }
                                },
                                'items': items
                            })).then(async secondTransaction => {
                                if(secondTransaction.status === 'paid') {
                                    if(secondTransaction.amount === secondTransaction.paid_amount) {
                                        await new PagarmeReport(secondTransaction).save().then(async report => {
                                            order._pagarmeReport = report._id
                                            order._idTransactionPagarme = secondTransaction.id
                                            order.status = secondTransaction.status
                                            order.cost = secondTransaction.cost
                                            order._idUser = user._id
                                            order.createdAt = moment().format('L - LTS')
                    
                                            await Order.create(order).then(async order => {      
                                                for(let i = 0; i < order.product.length; i++) {
                                                    if(order.product[i].schedule) {
                                                        await new Commission({
                                                            _idUser: order.product[i]._idOwner,
                                                            _idOrder: order._id,
                                                            _idProduct: order.product[i]._idProduct,
                                                            _idEvent: order.product[i]._idEvent,
                                                            name: order.product[i].name,
                                                            value: order.product[i].clinicValue,
                                                            status: 'pendente',
                                                            createdAt: order.createdAt
                                                        }).save().then(async _ => {
                                                            await Event.findOne({ _id: order.product[i]._idEvent }).then(async event => {
                                                                event._idOrder = order._id
                                                                event._idClient = user._id
                                                                event.status = 'pendente'
                                                                event.color = '#dc7d35'
                                                                
                                                                if(order.hasPatient) {
                                                                    event.title = order.patient.name
                                                                    event.patientInfo = {
                                                                        name: order.patient.name,
                                                                        phone: order.patient.phone,
                                                                        email: order.patient.email,
                                                                        birthDate: order.patient.birthday,
                                                                        document: order.patient.documents.cpfOrCnpj
                                                                    }
                                                                } else {
                                                                    event.title = order.buyer.name
                                                                    event.patientInfo = {
                                                                        name: order.buyer.name,
                                                                        phone: order.buyer.phone,
                                                                        email: order.buyer.email,
                                                                        birthDate: order.buyer.birthday,
                                                                        document: order.buyer.documents.cpfOrCnpj
                                                                    }
                                                                }
                        
                                                                await event.save()
                                                            })
                                                        })
                                                    } else {
                                                        await new Commission({
                                                            _idUser: order.product[i]._idOwner,
                                                            _idOrder: order._id,
                                                            _idProduct: order.product[i]._idProduct,
                                                            name: order.product[i].name,
                                                            value: order.product[i].clinicValue,
                                                            status: 'pendente',
                                                            createdAt: order.createdAt
                                                        }).save()
                                                    }
                                                }

                                                req.session.cart = []
                                                mail.paymentReceived(order)
                                                res.status(200).json('/detalhes-do-pedido/' + order._id)
                                            })
                                        })
                                    } else {
                                        pagarme.client.connect({ api_key })
                                        .then(client => client.transactions.refund({ id: firstTransaction.id }))
                                        .then(_ => {
                                            pagarme.client.connect({ api_key })
                                            .then(client => client.transactions.refund({ id: secondTransaction.id }))
                                            .then(async transaction => {
                                                await new PagarmeReport(transaction).save().then(async report => {
                                                    order._pagarmeReport = report._id
                                                    order._idTransactionPagarme = transaction.id
                                                    order.status = transaction.status
                                                    order._idUser = user._id
                                                    order.createdAt = moment().format('L - LTS')
                            
                                                    await Order.create(order).then(order => {        
                                                        req.session.cart = []
                                                        mail.orderFailed(order)
                                                        res.status(200).json('/detalhes-do-pedido/' + order._id)
                                                    })
                                                })
                                            })
                                        })
                                    }
                                } else {
                                    pagarme.client.connect({ api_key })
                                    .then(client => client.transactions.refund({ id: firstTransaction.id }))
                                    .then(async transaction => {
                                        await new PagarmeReport(transaction).save().then(async report => {
                                            order._pagarmeReport = report._id
                                            order._idTransactionPagarme = transaction.id
                                            order.status = transaction.status
                                            order._idUser = user._id
                                            order.createdAt = moment().format('L - LTS')
                    
                                            await Order.create(order).then(order => {        
                                                req.session.cart = []
                                                mail.orderFailed(order)
                                                res.status(200).json('/detalhes-do-pedido/' + order._id)
                                            })
                                        })
                                    })
                                }
                            })
                        } else {
                            pagarme.client.connect({ api_key })
                            .then(client => client.transactions.refund({ id: firstTransaction.id }))
                            .then(async transaction => {
                                await new PagarmeReport(transaction).save().then(async report => {
                                    order._pagarmeReport = report._id
                                    order._idTransactionPagarme = transaction.id
                                    order.status = transaction.status
                                    order._idUser = user._id
                                    order.createdAt = moment().format('L - LTS')
            
                                    await Order.create(order).then(order => {        
                                        req.session.cart = []
                                        mail.orderFailed(order)
                                        res.status(200).json('/detalhes-do-pedido/' + order._id)
                                    })
                                })
                            })
                        }
                    } else {
                        await new PagarmeReport(firstTransaction).save().then(async report => {
                            order._pagarmeReport = report._id
                            order._idTransactionPagarme = firstTransaction.id
                            order.status = firstTransaction.status
                            order._idUser = user._id
                            order.createdAt = moment().format('L - LTS')

                            await Order.create(order).then(order => {
                                mail.orderFailed(order)
                                res.status(400).json(failMessage)
                            })
                        })
                    }
                }).catch(_ => res.status(500).json(failMessage))
            } else return res.status(400).json(failMessage)
        } else if(order.paymentConfig.method === 'boleto') {
            if(order.paymentConfig.card_hash.length) return res.status(400).json(failMessage)
            if(order.total >= 200000) return res.status(400).json(failMessage)

            for(let i = 0; i < order.product.length; i++) {
                if(order.product[i].start) {
                    if(moment().add(7, 'days').format('L') > moment(order.product[i].start, 'YYYY-MM-DD').format('L')) {
                        return res.status(400).json(failMessage)
                    }
                }
            }

            let user = await User.findOne({ email: order.buyer.email })
            .catch(err => new Error(err))
            if(user instanceof Error) return res.status(500).json(failMessage)
            if(!user) {
                delete order.buyer.confirmPassword
    
                user = await new User({
                    name: order.buyer.name,
                    email: order.buyer.email,
                    password: encryptPassword(order.buyer.password),
                    phone: order.buyer.phone,
                    admin: false,
                    createdAt: moment().format('L - LTS'),
                    role: 'user',
                    address: {
                        street: order.buyer.address.street,
                        neighborhood: order.buyer.address.neighborhood,
                        number: order.buyer.address.number,
                        complement: order.buyer.address.complement,
                        zipCode: order.buyer.address.zipCode,
                        city: order.buyer.address.city,
                        state: order.buyer.address.state
                    },
                    documents: {
                        typeDoc: order.buyer.documents.typeDoc,
                        cpfOrCnpj: order.buyer.documents.cpfOrCnpj
                    },
                    firstAccess: false,
                }).save().then(user => {
                    mail.sendWelcome(user.email, user.name)
                    delete order.buyer.password 
                    return user
                }).catch(err => new Error(err))
    
                if(user instanceof Error) return res.status(500).json(failMessage)
            } else {
                if(!req.session.user) return res.status(400).json('Email já cadastrado, faça login na sua conta para continuar ou digite outro Email')
                if(req.session.user._id != user._id) return res.status(400).json(failMessage)
    
                if(!user.phone) user.phone = order.buyer.phone
                if(!user.birthday) user.birthday = order.buyer.birthday
                if(!user.documents.typeDoc) user.documents.typeDoc = order.buyer.documents.typeDoc
                if(!user.documents.cpfOrCnpj) user.documents.cpfOrCnpj = order.buyer.documents.cpfOrCnpj
                if(!user.address.street) user.address.street = order.buyer.address.street
                if(!user.address.number) user.address.number = order.buyer.address.number
                if(!user.address.complement) user.address.complement = order.buyer.address.complement
                if(!user.address.city) user.address.city = order.buyer.address.city
                if(!user.address.state) user.address.state = order.buyer.address.state
                if(!user.address.zipCode) user.address.zipCode = order.buyer.address.zipCode
                if(!user.address.neighborhood) user.address.neighborhood = order.buyer.address.neighborhood
                await user.save()
            }

            pagarme.client.connect({ api_key })
            .then(client => client.transactions.create({
                'amount': order.total,
                'payment_method': order.paymentConfig.method,
                'postback_url': process.env.DOMAIN_NAME + process.env.PAGARME_POSTBACK,
                'boleto_instructions': 'Não receber após o vencimento. Não aceitar pagamentos com cheque.',
                'boleto_expiration_date': moment().add(3, 'days').format('YYYY-MM-DD'),
                'capture': true,
                'async': false,
                'customer': {
                    'external_id': user._id,
                    'name': order.buyer.name,
                    'type': order.buyer.documents.typeDoc === 'pf' ? 'individual' : 'corporation',
                    'country': 'br',
                    'email': order.buyer.email,
                    'documents': [{
                        'type': order.buyer.documents.typeDoc === 'pf' ? 'cpf' : 'cnpj',
                        'number': order.buyer.documents.cpfOrCnpj
                    }],
                    'phone_numbers': [ '+55' + order.buyer.phone ],
                    'birthday': order.buyer.birthday
                },
                'billing': {
                    'name': order.buyer.name,
                    'address': {
                        'country': 'br',
                        'state': order.buyer.address.state,
                        'city': order.buyer.address.city,
                        'neighborhood': order.buyer.address.neighborhood,
                        'complementary': order.buyer.address.complement ? order.buyer.address.complement : 'Sem complemento',
                        'street': order.buyer.address.street,
                        'street_number': order.buyer.address.number,
                        'zipcode': order.buyer.address.zipCode
                    }
                },
                'items': items
            })).then(async transaction => {
                await new PagarmeReport(transaction).save().then(async report => {    
                    if(transaction.status === 'waiting_payment') {
                        order._pagarmeReport = report._id
                        order._idTransactionPagarme = transaction.id
                        order.status = transaction.status
                        order.paymentConfig.boleto_url = transaction.boleto_url
                        order._idUser = user._id
                        order.createdAt = moment().format('L - LTS')

                        await Order.create(order).then(async order => {   
                            for(let i = 0; i < order.product.length; i++) {
                                if(order.product[i].schedule) {
                                    await new Commission({
                                        _idUser: order.product[i]._idOwner,
                                        _idOrder: order._id,
                                        _idProduct: order.product[i]._idProduct,
                                        _idEvent: order.product[i]._idEvent,
                                        name: order.product[i].name,
                                        value: order.product[i].clinicValue,
                                        status: 'pagamento pendente',
                                        createdAt: order.createdAt
                                    }).save().then(async _ => {
                                        await Event.findOne({ _id: order.product[i]._idEvent }).then(async event => {
                                            event._idOrder = order._id
                                            event._idClient = user._id
                                            event.status = 'pagamento pendente'
                                            event.color = '#75716e'
                                            
                                            if(order.hasPatient) {
                                                event.title = order.patient.name
                                                event.patientInfo = {
                                                    name: order.patient.name,
                                                    phone: order.patient.phone,
                                                    email: order.patient.email,
                                                    birthDate: order.patient.birthday,
                                                    document: order.patient.documents.cpfOrCnpj
                                                }
                                            } else {
                                                event.title = order.buyer.name
                                                event.patientInfo = {
                                                    name: order.buyer.name,
                                                    phone: order.buyer.phone,
                                                    email: order.buyer.email,
                                                    birthDate: order.buyer.birthday,
                                                    document: order.buyer.documents.cpfOrCnpj
                                                }
                                            }
    
                                            await event.save()
                                        })
                                    })
                                } else {
                                    await new Commission({
                                        _idUser: order.product[i]._idOwner,
                                        _idOrder: order._id,
                                        _idProduct: order.product[i]._idProduct,
                                        name: order.product[i].name,
                                        value: order.product[i].clinicValue,
                                        status: 'pagamento pendente',
                                        createdAt: order.createdAt
                                    }).save()
                                }
                            }

                            req.session.cart = []
                            mail.orderCreated(order)
                            res.status(200).json('/detalhes-do-pedido/' + order._id)
                        })
                    } else {
                        order._pagarmeReport = report._id
                        order._idTransactionPagarme = transaction.id
                        order.status = transaction.status
                        order.paymentConfig.boleto_url = transaction.boleto_url
                        order._idUser = user._id
                        order.createdAt = moment().format('L - LTS')

                        await Order.create(order).then(order => {
                            mail.orderFailed(order)
                            res.status(400).json(failMessage)
                        })
                    }
                })
            }).catch(_ => res.status(500).json(failMessage))
        } else return res.status(400).json(failMessage)
    }

    const orderDetails = async (req, res) => {
        await Order.findOne({ _id: req.params.id }).then(async order => {
            if(req.session.user._id == order._idUser) {
                const product = [], clinic = []
                for(let i = 0; i < order.product.length; i++) {
                    await System.find().then(async system => {
                        for(let j = 0; j < system[0].product.length; j++) {
                            if(system[0].product[j]._id == order.product[i]._idModel) {
                                await User.findOne({ _id: order.product[i]._idOwner }).then(getClinic => {
                                    product.push(system[0].product[j])
                                    clinic.push(getClinic)
                                })
                            }
                        }
                    })
                }
                
                res.status(200).render('index', {
                    page: 'Detalhes do pedido',
                    user: req.session.user,
                    order,
                    product,
                    clinic,
                    moment,
                    message: null
                })
            } else {
                res.status(400).render('500')
            }
        }).catch(_ => res.status(500).render('500'))
    }

    const postbackUrl = (req, res) => {
        if(pagarme.postback.verifySignature(api_key, qs.stringify(req.body), req.headers['x-hub-signature'].replace('sha1=', ''))) {
            Order.findOne({ _idTransactionPagarme: Number(req.body.transaction.id) }).then(async order => {
                if(!order) return res.status(401).end()

                pagarme.client.connect({ api_key })
                .then(client => client.transactions.find({ id: order._idTransactionPagarme }))
                .then(async transaction => {
                    await PagarmeReport.deleteOne({ _id: order._pagarmeReport }).then(async _ => {
                        await new PagarmeReport(transaction).save().then(async report => {
                            order._pagarmeReport = report._id
                            order.status = transaction.status
                            order.cost = transaction.cost

                            await order.save().then(async _ => {
                                if(transaction.status === 'paid' && transaction.amount === transaction.paid_amount) {
                                    mail.paymentReceived(order)

                                    await Commission.find({ _idOrder: order._id, status: 'pagamento pendente' }).then(async commission => {
                                        if(commission.length) {
                                            for(let i = 0; i < commission.length; i++) {
                                                commission[i].status = 'pendente'
                                                
                                                await commission[i].save().then(async _ => {
                                                    await Event.findOne({ _id: commission[i]._idEvent }).then(async event => {
                                                        event.status = 'pendente'
                                                        event.color = '#dc7d35'
                                                        await event.save()
                                                    })
                                                })

                                                
                                            }
                                        }
                                    })
                                }

                                res.status(200).end()
                            })
                        })
                    })
                })    
            }).catch(_ => res.status(500).end())
        } else {
            res.status(401).end()
        }
    }

    return {
        checkout,
        orderDetails,
        postbackUrl
    }
}