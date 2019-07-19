"use strict";

const mongoose = require('mongoose')
const User = mongoose.model('User')
const jwt = require('jwt-simple')
const bcrypt = require('bcrypt-nodejs')

module.exports = app => {    
    const {
        existOrError,
        tooBigEmail,
        validEmailOrError
    } = app.src.api.validation

    const login = async (req, res) => {
        const login = { ...req.body }

        try {
            existOrError(login.email, 'Digite seu Email')
            tooBigEmail(login.email, 'Seu Email é muito longo')
            validEmailOrError(login.email, 'Email inválido')
            existOrError(login.password, 'Digite sua senha')
        } catch(msg) {
            return res.status(400).json(msg)
        }
        
        const user = await User.findOne({ email: login.email })
        .catch(err => new Error(err))
        if(user instanceof Error) return res.status(500).json('Algo deu errado')

        if(!user || user.deletedAt) return res.status(401).json('Email ou senha inválidos')
        const isMatch = bcrypt.compareSync(login.password, user.password)
        if(!isMatch) return res.status(401).json('Email ou senha inválidos')

        const now = Math.floor(Date.now() / 1000)
        const payload = {
            id: user._id,
            iss: process.env.DOMAIN_NAME, 
            iat: now,
            exp: now + 60 * 60 * 24
        }

        if(user.password) user.password = undefined
        if(req.session) req.session.reset()
        req.session.user = user
        req.session.token = jwt.encode(payload, process.env.AUTH_SECRET)

        if(user.newUserByAdmin) return res.status(200).json('/trocar-senha')
        if(user.firstAccess) return res.status(200).json('/primeiro-acesso')
        if(user.admin) return res.status(200).json('/admin')
        res.status(200).json('/minha-conta')        
    }

    const instagram = async (req, res) => {
        if(req.user) {
            User.findOne({ _id: req.user._id }).then(async user => {
                if(newUserByAdmin) return res.status(200).json('/trocar-senha')

                const now = Math.floor(Date.now() / 1000)
                const payload = {
                    id: user._id,
                    iss: process.env.DOMAIN_NAME, 
                    iat: now,
                    exp: now + 60 * 60 * 24
                }

                if(user.instagramUserName !== req.user.instagramUserName) {
                    user.instagramUserName = req.user.instagramUserName
                    await user.save()
                }

                if(user.password) user.password = undefined
                if(req.session) req.session.reset()
                req.session.user = user
                req.session.token = jwt.encode(payload, process.env.AUTH_SECRET)

                if(user.newUserByAdmin) return res.status(200).json('/trocar-senha')
                if(user.firstAccess) return res.redirect('/primeiro-acesso')
                if(user.admin) return res.redirect('/admin')
                res.redirect('/minha-conta')    
            }).catch(_ => res.status(500).render('500'))
        } else {
            return res.status(401).render('index', {
                user: req.session.user,
                page: 'Login',
                message: JSON.stringify('Algo deu errado')
            })
        }
    } 

    return {
        login,
        instagram
    }
}