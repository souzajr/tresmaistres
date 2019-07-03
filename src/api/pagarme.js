'use strict';

const pagarme = require('pagarme')
const mongoose = require('mongoose')
const Order = mongoose.model('Order')
const Product = mongoose.model('Product')
const PagarmeReport = mongoose.model('PagarmeReport')
const User = mongoose.model('User')
const Coupon = mongoose.model('Coupon')
const cepValidator = require('cep-promise')
const cpf = require('@fnando/cpf/dist/node')
const cnpj = require('@fnando/cnpj/dist/node')
const bcrypt = require('bcrypt-nodejs')
const mail = require('../config/mail')
const qs = require('qs')
const moment = require('moment')
moment.locale('pt-br')
const failMessage = 'Algo deu errado'

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
                if(order.buyer.password) {
                    hasDigitOrError(order.buyer.password, 'A senha deve ter pelo menos um número')
                    //hasLowerOrError(order.buyer.password, 'A senha deve ter pelo menos uma letra minúscula')
                    //hasUpperOrError(order.buyer.password, 'A senha deve ter pelo menos uma letra maiúscula')
                    notSpaceOrError(order.buyer.password, 'A senha não deve ter espaços em branco')
                    //hasSpecialOrError(order.buyer.password, 'A senha deve ter pelo menos um caractere especial')
                    strongOrError(order.buyer.password, 'A senha deve conter pelo menos 8 caracteres')
                    existOrError(order.buyer.confirmPassword, 'Digite a confirmação da senha')
                    equalsOrError(order.buyer.password, order.buyer.confirmPassword, 'A senha e confirmação da senha não são iguais')
                }
            }   
            existOrError(order.product, failMessage)
            order.product = await Product.findOne({ _id: order.product })   
            .catch(err => new Error(err))
            if(!order.product || order.product instanceof Error) return res.status(500).json(failMessage)
            if(order.coupon) {
                order.coupon = await Coupon.findOne({ _id: order.coupon })
                .catch(err => new Error(err))
                if(order.coupon instanceof Error) return res.status(500).json(failMessage)
                if(!order.coupon || order.coupon.validity < moment().format('L')) return res.status(500).json('Cupom inválido')
            }
        } catch(msg) {
            return res.status(400).json(msg)
        }

        order.total = order.product.value
        if(order.coupon) {
            order.total = Number((order.product.value - (order.coupon.percentage * order.product.value / 100)).toFixed(0))
            if(order.total.toString() === 'NaN') return res.status(500).json(failMessage)
        }

        let user = await User.findOne({ email: order.buyer.email })
        .catch(err => new Error(err))
        if(user instanceof Error) return res.status(500).json(failMessage)
        if(user) {
            if(!req.session.user) return res.status(400).json('Email já cadastrado, faça login na sua conta para continuar ou digite outro Email')
            if(req.session.user._id != user._id) return res.status(400).json(failMessage)

            if(order.buyer.phone) user.phone = order.buyer.phone
            if(order.buyer.birthday) user.birthday = order.buyer.birthday
            if(order.buyer.documents.typeDoc) user.documents.typeDoc = order.buyer.documents.typeDoc
            if(order.buyer.documents.cpfOrCnpj) user.documents.cpfOrCnpj = order.buyer.documents.cpfOrCnpj
            if(order.buyer.address.street) user.address.street = order.buyer.address.street
            if(order.buyer.address.number) user.address.number = order.buyer.address.number
            if(order.buyer.address.complement) user.address.complement = order.buyer.address.complement
            if(order.buyer.address.city) user.address.city = order.buyer.address.city
            if(order.buyer.address.state) user.address.state = order.buyer.address.state
            if(order.buyer.address.zipCode) user.address.zipCode = order.buyer.address.zipCode
            if(order.buyer.address.neighborhood) user.address.neighborhood = order.buyer.address.neighborhood
            await user.save().then(user => {
                user.password = undefined
                req.session.user = user
            })
        } else if(!user && !order.buyer.hasAccount && order.buyer.password) {
            delete order.buyer.confirmPassword

            user = await new User({
                name: order.buyer.name,
                email: order.buyer.email,
                password: encryptPassword(order.buyer.password),
                phone: order.buyer.phone,
                admin: false,
                createdAt: moment().format('L - LTS'),
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
                firstAccess: false
            }).save().then(user => {
                mail.sendWelcome(user.email, user.name)
                delete order.buyer.password 
                return user
            }).catch(err => new Error(err))
            if(user instanceof Error) return res.status(500).json(failMessage)
        } else if(!user && !order.buyer.hasAccount && !order.buyer.password) { 
            user = null
        }

        if(order.paymentConfig.method === 'credit_card') {
            if(!order.paymentConfig.card_hash) return res.status(400).json(failMessage)

            pagarme.client.connect({ api_key: process.env.PAGARME_API_KEY })
            .then(client => client.transactions.create({
                'amount': order.total,
                'card_hash': order.paymentConfig.card_hash,
                'postback_url': process.env.DOMAIN_NAME + process.env.PAGARME_POSTBACK,
                'async': false,
                'installments': 1,
                'capture': true,
                'payment_method': order.paymentConfig.method,
                'customer': {
                    'external_id': user ? user._id : 'NaN',
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
                'items': [{
                    'id': order.product._id,
                    'title': 'plano ' + order.product.name,
                    'unit_price': order.total,
                    'quantity': 1,
                    'tangible': false
                }]
            })).then(transaction => {
                if(transaction.status === 'paid') {
                    if(transaction.amount === transaction.paid_amount) {
                        new PagarmeReport(transaction).save().then(report => {
                            order._pagarmeReport = report._id
                            order._idTransactionPagarme = transaction.id
                            order.status = transaction.status
                            order.cost = transaction.cost
                            order._idUser = user ? user._id : null
                            order.createdAt = moment().format('L - LTS')
    
                            // TODO
                            Order.create(order).then(async order => {   
                                if(order.coupon) {
                                    await Coupon.findOne({ _id: order.coupon._idCoupon }).then(async coupon => {
                                        console.log(coupon.countUse)
                                        if(coupon.countUse) coupon.countUse++
                                        else coupon.countUse = 1
                                        await coupon.save()
                                    })
                                }
                                
                                mail.paymentReceived(order)
                                res.status(200).json('/detalhes-do-pedido/' + order._id)
                            })
                        })
                    } else {
                        pagarme.client.connect({ api_key: process.env.PAGARME_API_KEY })
                        .then(client => client.transactions.refund({ id: transaction.id }))
                        .then(transaction => {
                            new PagarmeReport(transaction).save().then(report => {
                                order._pagarmeReport = report._id
                                order._idTransactionPagarme = transaction.id
                                order.status = transaction.status
                                order._idUser = user ? user._id : null
                                order.createdAt = moment().format('L - LTS')
        
                                Order.create(order).then(order => {     
                                    mail.orderFailed(order)
                                    res.status(200).json('/detalhes-do-pedido/' + order._id)
                                })
                            })
                        })
                    }
                } else {
                    new PagarmeReport(transaction).save().then(report => {
                        order._pagarmeReport = report._id
                        order._idTransactionPagarme = transaction.id
                        order.status = transaction.status
                        order._idUser = user ? user._id : null
                        order.createdAt = moment().format('L - LTS')

                        Order.create(order).then(order => {
                            mail.orderFailed(order)
                            res.status(400).json(failMessage)
                        })
                    })
                }
            }).catch(err => console.log(err.response.errors))
        } else if(order.paymentConfig.method === 'boleto') {
            if(order.paymentConfig.card_hash || order.product.value >= 200000) return res.status(400).json(failMessage)

            pagarme.client.connect({ api_key: process.env.PAGARME_API_KEY })
            .then(client => client.transactions.create({
                'amount': order.total,
                'payment_method': order.paymentConfig.method,
                'postback_url': process.env.DOMAIN_NAME + process.env.PAGARME_POSTBACK,
                'boleto_instructions': 'Não receber após o vencimento. Não aceitar pagamentos com cheque.',
                'boleto_expiration_date': moment().add(3, 'days').format('YYYY-MM-DD'),
                'capture': true,
                'async': false,
                'customer': {
                    'external_id': user ? user._id : null,
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
                'items': [{
                    'id': order.product._id,
                    'title': 'plano ' + order.product.name,
                    'unit_price': order.total,
                    'quantity': 1,
                    'tangible': false
                }]
            })).then(transaction => {
                new PagarmeReport(transaction).save().then(report => {    
                    if(transaction.status === 'waiting_payment') {
                        order._pagarmeReport = report._id
                        order._idTransactionPagarme = transaction.id
                        order.status = transaction.status
                        order.paymentConfig.boleto_url = transaction.boleto_url
                        order._idUser = user ? user._id : null
                        order.createdAt = moment().format('L - LTS')

                        Order.create(order).then(async order => {  
                            if(order.coupon) {
                                await Coupon.findOne({ _id: order.coupon._idCoupon }).then(async coupon => {
                                    if(coupon.countUse) coupon.countUse++
                                    else coupon.countUse = 1
                                    await coupon.save()
                                })
                            }

                            mail.orderCreated(order)
                            res.status(200).json('/detalhes-do-pedido/' + order._id)
                        })
                    } else {
                        order._pagarmeReport = report._id
                        order._idTransactionPagarme = transaction.id
                        order.status = transaction.status
                        order.paymentConfig.boleto_url = transaction.boleto_url
                        order._idUser = user ? user._id : null
                        order.createdAt = moment().format('L - LTS')

                        Order.create(order).then(order => {
                            mail.orderFailed(order)
                            res.status(400).json(failMessage)
                        })
                    }
                })
            }).catch(_ => res.status(500).json(failMessage))
        } else return res.status(400).json(failMessage)
    }

    const orderDetails = (req, res) => {
        Order.findOne({ _id: req.params.id }).then(order => {
            if(!order) return res.status(404).render('404')

            Product.findOne({ _id: order.product._idProduct }).then(product => {
                res.status(200).render('index', {
                    page: 'Detalhes do pedido',
                    user: req.session.user,
                    order,
                    product,
                    message: null
                })
            })
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