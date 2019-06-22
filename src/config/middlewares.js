"use strict";

const session = require('client-sessions')
const passport = require('passport')
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')

module.exports = app => {
    app.use(helmet())
    if(process.env.AMBIENT_MODE === 'PROD') {
        app.use(session({
            cookieName: 'session',
            encryptionAlgorithm: 'aes256',
            encryptionKey: new Buffer.from(process.env.SESSION_SECRET1),
            signatureAlgorithm: 'sha256-drop128',
            signatureKey: new Buffer.from(process.env.SESSION_SECRET2, 'base64'),
            duration: 3600000,
            cookie: {
                path: '/',
                httpOnly: true,
                secure: false,
                ephemeral: false
            }
        })) 
    } else {
        app.use(session({
            cookieName: 'session',
            secret: process.env.SESSION_SECRET1,
            duration: 3600000,
            cookie: {
                path: '/',
                httpOnly: true,
                secure: false,
                ephemeral: true
            }
        })) 
        
        app.use(morgan('dev'))
    }
    app.use(passport.initialize())
    app.use(passport.session())  
    app.set('view engine', 'ejs') 
    app.use(express.urlencoded({ extended: true }))    
    app.use(express.json())  
    app.use(cors())
    app.use([
        '/validate',
        '/nova-senha',
        '/minha-conta',
        '/primeiro-acesso'
    ], (req, res, next) => {
        if (!req.session.user) {
            res.status(401).render('index', {
                user: req.session.user,
                page: 'Login',
                message: JSON.stringify('Por favor, faça login para continuar')
            })
        } else {
            next()
        }
    })
}