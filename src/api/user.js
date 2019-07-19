"use strict";

const bcrypt = require('bcrypt-nodejs')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Product = mongoose.model('Product')
const Order = mongoose.model('Order')
const Coupon = mongoose.model('Coupon')
const Segmentation = mongoose.model('Segmentation')
const mail = require('../config/mail')
const crypto = require('crypto')
const cepValidator = require('cep-promise')
const cpf = require('@fnando/cpf/dist/node')
const cnpj = require('@fnando/cnpj/dist/node')
const sm = require('sitemap')
const jwt = require('jwt-simple')
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
        notSpaceOrError,
        validEmailOrError
    } = app.src.api.validation

    const encryptPassword = password => {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(password, salt)
    }

    const viewIndex = (req, res) => {
        Product.find({ productPublic: true }).then(product => {
            res.status(200).render('index', {
                user: req.session.user,
                page: 'Home',
                product,
                csrf: req.csrfToken(),
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const sendMessage = (req, res) => {
        const message = { ...req.body }

        try {
            existOrError(message.name, 'Digite seu nome')
            existOrError(message.email, 'Digite seu Email')
            validEmailOrError(message.email, 'Email inválido')
            existOrError(message.subject, 'Digite o assunto')
            existOrError(message.message, 'Digite a mensagem')
        } catch(msg) {
            return res.status(400).json(msg)
        }

        mail.sendMessage(message)
        res.status(200).json(successMessage)
    }

    const viewLogin = (req, res) => {
        res.status(200).render('index', {
            user: req.session.user,
            page: 'Login',
            csrf: req.csrfToken(),
            message: null
        })
    }

    const viewFirstAccess = (req, res) => {
        if(!req.session.user.firstAccess) return res.redirect('/login')

        res.status(200).render('index', {
            user: req.session.user,
            page: 'Primeiro acesso',
            csrf: req.csrfToken(),
            message: null
        })
    }

    const changeFirstAccess = (req, res) => {
        User.findOne({ _id: req.session.user._id }).then(async getUser => {
            if(!getUser.firstAccess) return res.status(400).json(failMessage)

            const user = { ...req.body }

            try {
                existOrError(user.email, 'Digite o Email')
                tooBigEmail(user.email, 'Seu Email é muito longo')
                validEmailOrError(user.email, 'Email inválido')
                const userFromDB = await User.findOne({ email: user.email })
                .catch(err => new Error(err))
                if(userFromDB instanceof Error) return res.status(500).json(failMessage)
                notExistOrError(userFromDB, 'Esse Email já está registrado')
                existOrError(user.phone, 'Digite seu telefone')
                user.phone = user.phone.split('(').join('').split(')').join('').split('-').join('').split(' ').join('')
                existOrError(user.password, 'Digite sua senha')
                hasDigitOrError(user.password, 'A senha deve ter pelo menos um número')
                //hasLowerOrError(user.password, 'A senha deve ter pelo menos uma letra minúscula')
                //hasUpperOrError(user.password, 'A senha deve ter pelo menos uma letra maiúscula')
                notSpaceOrError(user.password, 'A senha não deve ter espaços em branco')
                //hasSpecialOrError(user.password, 'A senha deve ter pelo menos um caractere especial')
                strongOrError(user.password, 'A senha deve conter pelo menos 8 caracteres')
                existOrError(user.confirmPassword, 'Digite a confirmação da senha')
                equalsOrError(user.password, user.confirmPassword, 'A senha e confirmação da senha não são iguais')
            } catch(msg) {
                return res.status(400).json(msg)
            }

            delete user.confirmNewPassword
            getUser.email = user.email
            getUser.phone = user.phone
            getUser.password = encryptPassword(user.password)
            getUser.firstAccess = false
            mail.sendWelcome(user.email, getUser.name)

            getUser.save().then(getUser => {
                const now = Math.floor(Date.now() / 1000)
                const payload = {
                    id: getUser._id,
                    iss: process.env.DOMAIN_NAME, 
                    iat: now,
                    exp: now + 60 * 60 * 24
                }

                getUser.password = undefined
                if(req.session) req.session.reset()
                req.session.user = getUser
                req.session.token = jwt.encode(payload, process.env.AUTH_SECRET)

                res.status(200).end()
            })
        }).catch(_ => res.status(500).json(failMessage))
    }

    const viewTerms = (req, res) => {
        res.status(200).render('index', {
            user: req.session.user,
            page: 'Termos de uso',
            message: null
        })
    }

    const viewPrivacy = (req, res) => {
        res.status(200).render('index', {
            user: req.session.user,
            page: 'Política de privacidade',
            message: null
        })
    }

    const registerNewUser = async (req, res) => {
        const user = { ...req.body }

        try {
            existOrError(user.name, 'Digite seu nome')
            tooSmall(user.name, 'Nome muito curto, digite um nome maior')
            tooBig(user.name, 'Nome muito longo, digite um nome menor')
            existOrError(user.phone, 'Digite seu telefone')
            user.phone = user.phone.split('(').join('').split(')').join('').split('-').join('').split(' ').join('')
            existOrError(user.email, 'Digite o Email')
            tooBigEmail(user.email, 'Seu Email é muito longo')
            validEmailOrError(user.email, 'Email inválido')
            const userFromDB = await User.findOne({ email: user.email })
            .catch(err => new Error(err))
            if(userFromDB instanceof Error) return res.status(500).json(failMessage)
            notExistOrError(userFromDB, 'Esse Email já está registrado')
            existOrError(user.password, 'Digite sua senha')
            hasDigitOrError(user.password, 'A senha deve ter pelo menos um número')
            //hasLowerOrError(user.password, 'A senha deve ter pelo menos uma letra minúscula')
            //hasUpperOrError(user.password, 'A senha deve ter pelo menos uma letra maiúscula')
            notSpaceOrError(user.password, 'A senha não deve ter espaços em branco')
            //hasSpecialOrError(user.password, 'A senha deve ter pelo menos um caractere especial')
            strongOrError(user.password, 'A senha deve conter pelo menos 8 caracteres')
            existOrError(user.confirmPassword, 'Digite a confirmação da senha')
            equalsOrError(user.password, user.confirmPassword, 'A senha e confirmação da senha não são iguais')
        } catch (msg) {
            return res.status(400).json(msg)
        }

        delete user.confirmPassword
        user.password = encryptPassword(user.password)
        user.firstAccess = false
        user.createdAt = moment().format('L - LTS')
        user.admin = false

        User.create(user).then(user => {
            mail.sendWelcome(user.email, user.name)
            
            const now = Math.floor(Date.now() / 1000)
            const payload = {
                id: user._id,
                iss: process.env.DOMAIN_NAME, 
                iat: now,
                exp: now + 60 * 60 * 24
            }

            if(req.session) req.session.reset()
            user.password = undefined
            req.session.user = user
            req.session.token = jwt.encode(payload, process.env.AUTH_SECRET)

            res.status(200).json('/minha-conta')    
        }).catch(_ => res.status(500).json(failMessage))
    }

    const viewRecoverPassword = (req, res) => {
        res.status(200).render('index', {
            page: 'Esqueci minha senha',
            csrf: req.csrfToken(),
            user: req.session.user,
            message: null
        })
    }

    const recoverPassword = async (req, res) => {
        const email = req.body.email

        try {
            existOrError(email, 'Digite o Email')
            tooBigEmail(email, 'Seu Email é muito longo')
            validEmailOrError(email, 'Email inválido')
        } catch (msg) {
            return res.status(400).json(msg)
        }

        const user = await User.findOne({ email })
        .catch(err => new Error(err))
        if(user instanceof Error) return res.status(500).json(failMessage)

        if(!user || user.deletedAt) return res.status(400).json(failMessage)
        
        const token = crypto.randomBytes(64).toString('hex')
        user.resetPasswordToken = token
        user.resetPasswordExpires = Date.now() + 3600000
        await user.save().then(_ => {
            mail.recoveryMail(user.email, token)
            res.status(200).json(successMessage)
        }).catch(_ => res.status(500).json(failMessage))
    }

    const checkToken = async (req, res) => {
        await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        }).then(user => {
            if (!user || user.deletedAt) {
                res.status(401).render('index', {
                    page: 'Esqueci minha senha',
                    user,
                    csrf: req.csrfToken(),
                    message: JSON.stringify('O token de redefinição de senha é inválido ou expirou')
                })
            } else {
                res.status(200).render('index', {
                    page: 'Recuperar senha',
                    user,
                    csrf: req.csrfToken(),
                    message: null
                })
            }
        }).catch(_ => res.status(500).render('500'))
    }

    const resetPassword = async (req, res) => {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        }).catch(err => {
            return res.status(500).render('500')
        })

        if (!user || user.deletedAt) {
            return res.status(401).render('index', {
                page: 'Esqueci minha senha',
                user,
                csrf: req.csrfToken(),
                message: JSON.stringify('O token de redefinição de senha é inválido ou expirou')
            })
        }

        const newPassword = { ...req.body }
        
        try {
            existOrError(newPassword.password, 'Digite sua senha')
            hasDigitOrError(newPassword.password, 'A senha deve ter pelo menos um número')
            //hasLowerOrError(newPassword.password, 'A senha deve ter pelo menos uma letra minúscula')
            //hasUpperOrError(newPassword.password, 'A senha deve ter pelo menos uma letra maiúscula')
            notSpaceOrError(newPassword.password, 'A senha não deve ter espaços em branco')
            //hasSpecialOrError(newPassword.password, 'A senha deve ter pelo menos um caractere especial')
            strongOrError(newPassword.password, 'A senha deve conter pelo menos 8 caracteres')
            existOrError(newPassword.confirmPassword, 'Digite a confirmação da senha')
            equalsOrError(newPassword.password, newPassword.confirmPassword, 'A senha e confirmação da senha não são iguais')
        } catch (msg) {
            return res.status(400).render('index', {
                page: 'Recuperar senha',
                user,
                csrf: req.csrfToken(),
                message: JSON.stringify(msg)
            })
        }

        user.password = encryptPassword(req.body.password)
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined
        await user.save().then(_ => {
            mail.alertOfChange(user.email)
            res.redirect('/login')
        }).catch(_ => res.status(500).render('500'))
    }

    const viewUserProfile = async (req, res) => {
        res.status(200).render('index', {
            page: 'Minha conta',
            user: req.session.user, 
            csrf: req.csrfToken(),
            message: null
        })
    }

    const changeUserProfile = async (req, res) => {
        const changeInfoProfile = { ...req.body }

        if(
            !changeInfoProfile.name &&
            !changeInfoProfile.birthday &&
            !changeInfoProfile.street &&
            !changeInfoProfile.neighborhood &&
            !changeInfoProfile.number &&
            !changeInfoProfile.complement &&
            !changeInfoProfile.zipCode &&
            !changeInfoProfile.city &&
            !changeInfoProfile.state &&
            !changeInfoProfile.email &&
            !changeInfoProfile.phone &&
            !changeInfoProfile.typeDoc &&
            !changeInfoProfile.cpf &&
            !changeInfoProfile.cnpj
        ) return res.status(400).json(failMessage)
        
        await User.findOne({ _id: req.session.user._id }).then(async user => {
            if (changeInfoProfile.name && changeInfoProfile.name != user.name) {
                try {
                    tooSmall(changeInfoProfile.name, 'Nome muito curto, digite um nome maior')
                    tooBig(changeInfoProfile.name, 'Nome muito longo, digite um nome menor')
                } catch (msg) {
                    return res.status(400).json(msg)
                }

                user.name = changeInfoProfile.name
            } 

            if (changeInfoProfile.email && changeInfoProfile.email != user.email) {
                try {
                    tooBigEmail(changeInfoProfile.email, 'Seu Email é muito longo')
                    validEmailOrError(changeInfoProfile.email, 'Email inválido')
                    const userFromDB = await User.findOne({ email: changeInfoProfile.email })
                    .catch(err => new Error(err))
                    if(userFromDB instanceof Error) return res.status(500).json(failMessage)
                    notExistOrError(userFromDB, 'Esse Email já está registrado')
                } catch (msg) {
                    return res.status(400).json(msg)
                }

                user.email = changeInfoProfile.email
            } 

            if(changeInfoProfile.birthday && changeInfoProfile.birthday != user.birthday) {
                user.birthday = changeInfoProfile.birthday
            }

            if(changeInfoProfile.phone && changeInfoProfile.phone != user.phone) {
                user.phone = changeInfoProfile.phone.split('(').join('').split(')').join('').split('-').join('').split(' ').join('')
            } 

            if (changeInfoProfile.typeDoc) {
                if(changeInfoProfile.typeDoc === 'pf') {
                    if(changeInfoProfile.cpf != user.documents.cpfOrCnpj) {
                        if(!changeInfoProfile.cpf) return res.status(400).json('Você deve digitar seu CPF')
                        if(!cpf.isValid(changeInfoProfile.cpf)) return res.status(400).json('CPF inválido')
                        user.documents = {
                            typeDoc: changeInfoProfile.typeDoc,
                            cpfOrCnpj: cpf.strip(changeInfoProfile.cpf)
                        }
                    }
                } else if(changeInfoProfile.typeDoc === 'pj') {
                    if(changeInfoProfile.cpf != user.documents.cpfOrCnpj) {
                        if(!changeInfoProfile.cnpj) return res.status(400).json('Você deve digitar seu CNPJ')
                        if(!cnpj.isValid(changeInfoProfile.cnpj)) return res.status(400).json('CNPJ inválido')
                        user.documents = {
                            typeDoc: changeInfoProfile.typeDoc,
                            cpfOrCnpj: cnpj.strip(changeInfoProfile.cnpj)
                        }
                    }
                } else {
                    return res.status(400).json('Você deve escolher entre pessoa física ou pessoa jurídica')
                }
            }

            if (changeInfoProfile.street && changeInfoProfile.street != user.address.street) {
                user.address.street = changeInfoProfile.street
            }

            if (changeInfoProfile.neighborhood && changeInfoProfile.neighborhood != user.address.neighborhood) {
                user.address.neighborhood = changeInfoProfile.neighborhood
            }

            if (changeInfoProfile.number && changeInfoProfile.number != user.address.number) {
                user.address.number = changeInfoProfile.number
            }

            if (changeInfoProfile.complement && changeInfoProfile.complement != user.address.complement) {
                user.address.complement = changeInfoProfile.complement
            }

            if (changeInfoProfile.zipCode && changeInfoProfile.zipCode != user.address.zipCode) {
                try {
                    const validateZipCode = await cepValidator(changeInfoProfile.zipCode).catch(err => err)
                    notExistOrError(validateZipCode.errors, 'CEP inválido') 
                } catch (msg) {
                    return res.status(400).json(msg)
                }

                user.address.zipCode = changeInfoProfile.zipCode.split('.').join('').split('-').join('')
            }

            if (changeInfoProfile.city && changeInfoProfile.city != user.address.city) {
                user.address.city = changeInfoProfile.city
            }

            if (changeInfoProfile.state && changeInfoProfile.state != user.address.state) {
                user.address.state = changeInfoProfile.state
            }

            user.save().then(user => {
                user.password = undefined
                req.session.user = user
                res.status(200).json(successMessage)
            })
        }).catch(_ => res.status(400).json(failMessage))
    }

    const viewEditPassword = async (req, res) => {
        res.status(200).render('index', {
            page: 'Alterar senha',
            user: req.session.user, 
            csrf: req.csrfToken(),
            message: null
        })
    }

    const editPassword = (req, res) => {
        const changePassword = { ...req.body }

        User.findOne({ _id: req.session.user._id }).then(user => {
            if (changePassword.currentPassword || changePassword.newPassword || changePassword.confirmNewPassword) {
                try {
                    existOrError(changePassword.currentPassword, 'Digite sua senha atual')
                    existOrError(changePassword.newPassword, 'Digite sua nova senha')
                    existOrError(changePassword.confirmNewPassword, 'Digite a confirmação da sua nova senha')
                    const isMatch = bcrypt.compareSync(changePassword.currentPassword, user.password)
                    if (!isMatch) return res.status(401).json('Senha atual incorreta')
                    hasDigitOrError(changePassword.newPassword, 'A senha deve ter pelo menos um número')
                    //hasLowerOrError(changePassword.newPassword, 'A senha deve ter pelo menos uma letra minúscula')
                    //hasUpperOrError(changePassword.newPassword, 'A senha deve ter pelo menos uma letra maiúscula')
                    notSpaceOrError(changePassword.newPassword, 'A senha não deve ter espaços em branco')
                    //hasSpecialOrError(changePassword.newPassword, 'A senha deve ter pelo menos um caractere especial')
                    strongOrError(changePassword.newPassword, 'A senha deve conter pelo menos 8 caracteres')
                    equalsOrError(changePassword.newPassword, changePassword.confirmNewPassword, 'A senha e confirmação da senha não são iguais')
                } catch (msg) {
                    return res.status(400).json(msg)
                }

                user.password = encryptPassword(changePassword.newPassword)
                user.save().then(_ => res.status(200).json(successMessage))
            } else return res.status(400).json(failMessage)
        })
    }

    const viewCheckout = async (req, res) => {
        let getUser = null, getProduct = null, discountCoupon = null

        if(req.session.user) {
            getUser = await User.findOne({ _id: req.session.user._id })
            .catch(err => new Error(err))
            if(getUser instanceof Error) return res.status(500).render('500')
            if(getUser.firstAccess) return res.redirect('/primeiro-acesso')
            getUser.password = undefined
        }
        
        if(req.query.plano && typeof(req.query.plano) === 'string') {
            getProduct = await Product.findOne({ name: req.query.plano.toLowerCase() })
            .catch(err => new Error(err))
            if(getProduct instanceof Error) return res.status(500).render('500')
        }

        if(req.query.cupom) {
            if(typeof(req.query.cupom) === 'string') {
                discountCoupon = await Coupon.findOne({ name: req.query.cupom.toLowerCase() }).then(coupon => {
                    if(coupon && coupon.validity >= moment().format('L')) return coupon
                    return 'Invalid'
                }).catch(err => new Error(err))
                if(discountCoupon instanceof Error) return res.status(500).render('500')
            } else {
                discountCoupon = await Coupon.findOne({ name: req.query.cupom[0].toLowerCase() }).then(coupon => {
                    if(coupon && coupon.validity >= moment().format('L')) return coupon
                    return 'Invalid'
                }).catch(err => new Error(err))
                if(discountCoupon instanceof Error) return res.status(500).render('500')
            }            
        }

        res.status(200).render('index', {
            product: getProduct,
            page: 'Finalizar compra',
            user: getUser,
            coupon: discountCoupon,
            encryptionKey: process.env.PAGARME_ENCRYPTION_KEY,
            csrf: req.csrfToken(),
            message: null
        })
    }

    const viewOrders = (req, res) => {
        Order.find({ _idUser: req.session.user._id }).then(orders => {
            res.status(200).render('index', {
                orders,
                page: 'Pedidos',
                user: req.session.user,
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const orderDetails = (req, res) => {
        Order.findOne({ _id: req.params.id }).then(async order => {
            if(!order) return res.status(404).render('404')

            let segmentation = null
            if(order.options && order.options._idSegmentation) {
                segmentation = await Segmentation.findOne({ _id: order.options._idSegmentation })
                .catch(err => new Error(err))
                if(segmentation instanceof Error) return res.status(500).render('500')
            }

            Product.findOne({ _id: order.product._id }).then(product => {
                res.status(200).render('index', {
                    page: 'Detalhes do pedido',
                    user: req.session.user,
                    order,
                    segmentation,
                    product,
                    moment,
                    message: null
                })
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const viewSegmentation = (req, res) => {
        if(!req.query.id) return res.status(404).render('404')

        Segmentation.findOne({ _id: req.query.id }).then(async segmentation => {
            if(segmentation.status !== 'pendente') return res.status(404).render('404')

            let getUser = null
            if(segmentation._idUser) {
                if(req.session.user && !req.session.user.admin && segmentation._idUser != req.session.user._id)
                    return res.status(404).render('404')

                getUser = await User.findOne({ _id: segmentation._idUser })
                .catch(err => new Error(err))
                if(getUser instanceof Error) return res.status(500).render('500')
            }

            res.status(200).render('index', {
                page: 'Segmentação',
                user: req.session.user,
                segmentation,
                getUser,
                csrf: req.csrfToken(),
                message: null
            })
        }).catch(_ => res.status(500).render('500'))
    }

    const getSegmentation = (req, res) => {
        const segmentation = { ...req.body }

        try {
            existOrError(segmentation.segmentationId, failMessage)
            existOrError(segmentation.instagramProfile, 'Digite o login do seu perfil no Instagram')
            existOrError(segmentation.instagramPassword, 'Digite a senha do seu perfil no Instagram')
            existOrError(segmentation.profiles, 'Digite os perfis de interesse')
            existOrError(segmentation.subjects, 'Digite os assuntos de interesse')
            existOrError(segmentation.locations, 'Digite as cidades de interesse')
            existOrError(segmentation.genre, 'Escolha o gênero do seu público')
        } catch (msg) {
            return res.status(400).json(msg)
        }

        Segmentation.findOne({ _id: segmentation.segmentationId }).then(getSegmentation => {
            if(getSegmentation.status !== 'pendente') return res.status(400).json(failMessage)
            
            getSegmentation.status = 'enviado'
            getSegmentation.instagramProfile = segmentation.instagramProfile
            getSegmentation.instagramPassword = segmentation.instagramPassword
            getSegmentation.interest = {
                profiles: segmentation.profiles,
                subjects: segmentation.subjects,
                locations: segmentation.locations,
                genre: segmentation.genre
            }

            getSegmentation.save().then(res.status(200).end())
        }).catch(_ => res.status(500).json(failMessage))
    }

    const downloadInvoice = (req, res) => {
        if(!req.query.invoice) return res.status(404).render('404')
        res.status(200).download('./public/' + req.query.invoice)
    }

    const viewChangeFirstPassword = (req, res) => {
        if(!req.session.user.newUserByAdmin)
            return res.status(404).render('404')

        res.status(200).render('index', {
            user: req.session.user,
            page: 'Trocar senha',
            csrf: req.csrfToken(),
            message: null
        })
    }

    const changeFirstPassword = (req, res) => {
        if(!req.session.user.newUserByAdmin)
            return res.status(200).json(failMessage)

        const changePassword = { ...req.body }

        User.findOne({ _id: req.session.user._id }).then(user => {
            if(changePassword.password || changePassword.confirmPassword) {
                try {
                    existOrError(changePassword.password, 'Digite sua nova senha')
                    existOrError(changePassword.confirmPassword, 'Digite a confirmação da sua nova senha')
                    const isMatch = bcrypt.compareSync(changePassword.password, user.password)
                    if (isMatch) return res.status(401).json('Sua nova senha não pode ser igual a senha provisória')
                    hasDigitOrError(changePassword.password, 'A senha deve ter pelo menos um número')
                    //hasLowerOrError(changePassword.password, 'A senha deve ter pelo menos uma letra minúscula')
                    //hasUpperOrError(changePassword.password, 'A senha deve ter pelo menos uma letra maiúscula')
                    notSpaceOrError(changePassword.password, 'A senha não deve ter espaços em branco')
                    //hasSpecialOrError(changePassword.password, 'A senha deve ter pelo menos um caractere especial')
                    strongOrError(changePassword.password, 'A senha deve conter pelo menos 8 caracteres')
                    equalsOrError(changePassword.password, changePassword.confirmPassword, 'A senha e confirmação da senha não são iguais')
                } catch (msg) {
                    return res.status(400).json(msg)
                }

                user.newUserByAdmin = false
                user.password = encryptPassword(changePassword.password)
                user.save().then(_ => {
                    if(user.admin) return res.status(200).json('/admin')
                    res.status(200).json('/minha-conta')
                })
            } else return res.status(400).json(failMessage)
        }).catch(_ => res.status(500).json(failMessage))
    }

    const viewSiteMap = (req, res) => {
        const sitemap = sm.createSitemap({
            hostname: process.env.DOMAIN_NAME,
            cacheTime: 600000,
            urls: [
                { url: '/', img: process.env.DOMAIN_NAME + '/views/assets/img/parallax/parallax-2.jpg' },
                { url: '/minha-conta' },
                { url: '/minha-conta/alterar-senha' },
                { url: '/minha-conta/pedidos' },
                { url: '/briefing' },
                { url: '/nota-fiscal' },
                { url: '/sair' },                
                { url: '/finalizar-compra' },
                { url: '/politica-de-privacidade' },
                { url: '/termos-de-uso' }
            ]
        })

        sitemap.toXML(function(err, xml) {
            if(err) return res.status(500).end()

            res.status(200).header('Content-Type', 'application/xml').send(xml)
        })
    }

    return {
        viewIndex,
        sendMessage,
        viewLogin,
        viewFirstAccess,
        changeFirstAccess,
        viewTerms,
        viewPrivacy,
        registerNewUser,
        viewRecoverPassword,
        recoverPassword,
        checkToken,
        resetPassword,
        viewUserProfile,
        changeUserProfile,
        viewEditPassword,
        editPassword,
        viewFirstAccess,
        viewCheckout,
        viewOrders,
        orderDetails,
        viewSegmentation,
        getSegmentation,
        downloadInvoice,
        viewChangeFirstPassword,
        changeFirstPassword,
        viewSiteMap
    }
}