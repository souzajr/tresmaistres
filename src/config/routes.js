"use strict";

const admin = require('./admin')
const csurf = require('csurf')
const passport = require('passport')
const InstagramStrategy = require('passport-instagram').Strategy
const mongoose = require('mongoose')
const User = mongoose.model('User')
const moment = require('moment')
moment.locale('pt-br')

passport.serializeUser(function(user, done) {
    done(null, user)
})
  
passport.deserializeUser(function(obj, done) {
    done(null, obj)
})

passport.use(new InstagramStrategy({
    clientID: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    callbackURL: process.env.DOMAIN_NAME + process.env.INSTAGRAM_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    await User.findOne({ instagramId: profile.id }, async function(err, user) {
        if(err) return done(err, user)

        if(!user) {
            return await new User({
                name: profile.displayName,
                admin: false,  
                firstAccess: true,
                createdAt: moment().format('L - LTS'),
                instagramId: profile.id,
                instagramUserName: profile.username
            }).save().then(user => done(err, user))
            .catch(err => done(err, user))   
        } else return done(err, user)
    })
}))

module.exports = app => {
    //#region MISCELLANEOUS
        /* ============= VIEW INDEX  ============= */
        app.get('/', csurf(), app.src.api.user.viewIndex)
        app.post('/enviar-mensagem', csurf(), app.src.api.user.sendMessage)

        /* ============= VIEW LOGIN  ============= */
        app.get('/login', csurf(), app.src.api.user.viewLogin)

        /* ============= LOCAL LOGIN  ============= */
        app.post('/login', csurf(), app.src.api.auth.login)

        /* ============= VIEW REGISTER  ============= */
        app.get('/cadastro', csurf(), app.src.api.user.viewRegister)

        /* ============= REGISTER NEW USER  ============= */
        app.post('/cadastro', csurf(), app.src.api.user.registerNewUser)

        /* ============= FORGOT PASSWORD ============= */
        app.get('/esqueci-minha-senha', csurf(), app.src.api.user.viewRecoverPassword)
        app.post('/esqueci-minha-senha', csurf(), app.src.api.user.recoverPassword)
        app.get('/alterar-senha/:token', csurf(), app.src.api.user.checkToken)
        app.post('/alterar-senha/:token', csurf(), app.src.api.user.resetPassword)

        /* ============= SOCIAL LOGIN INSTAGRAM ============= */
        app.get(process.env.INSTAGRAM_CALLBACK_URL + '/login', app.src.api.auth.instagram)
        app.get('/instagram', passport.authenticate('instagram', { scope: ['basic'] }))
        app.get(process.env.INSTAGRAM_CALLBACK_URL, passport.authenticate('instagram', { 
            successRedirect: process.env.INSTAGRAM_CALLBACK_URL + '/login',
            failureRedirect: process.env.INSTAGRAM_CALLBACK_URL + '/login'
        }))

        /* ============= VALIDATE LOGIN ============= */
        app.route('/validate')
            .all(app.src.config.passport.authenticate())
            .get(app.src.api.auth.validateToken)  
        
        /* ============= LOGOUT ============= */
        app.get('/sair', function(req, res) {
            req.session.reset()          
            req.logout()     
            res.redirect('/')
        })    
        
        /* ============= VIEW TERMS OF USE AND PRIVACY ============= */
        app.get('/termos-de-uso', app.src.api.user.viewTerms)
        app.get('/politica-de-privacidade', app.src.api.user.viewPrivacy)
        
        /* ============= BUY PLAN ============= */
        app.get('/finalizar-compra', csurf(), app.src.api.user.viewCheckout)
    //#endregion

    //#region USER
        app.route('/primeiro-acesso')
            .all(app.src.config.passport.authenticate())
            .get(csurf(), app.src.api.user.viewFirstAccess)  
            .post(csurf(), app.src.api.user.changeFirstAccess)

        app.route('/minha-conta')
            .all(app.src.config.passport.authenticate())
            .get(app.src.api.user.viewUserProfile)  
    //#endregion

    //#region ADMIN 

    //#endregion

    //#region PAGARME
        /* ============= START CHECKOUT PROCESS  ============= */
        app.post('/finalizar-compra', csurf(), app.src.api.pagarme.checkout)
        
        /* ============= END CHECKOUT PROCESS  ============= */
        app.route('/detalhes-do-pedido')
            .all(app.src.config.passport.authenticate())
            .get(app.src.api.pagarme.orderDetails)

        /* ============= POSTBACK URL  ============= */
        app.post(process.env.PAGARME_POSTBACK, app.src.api.pagarme.postbackUrl)
    //#endregion

    //#region HANDLE ERROR
        if(process.env.AMBIENT_MODE === 'PROD') {
            app.use(function (err, req, res, next) { 
                res.status(500).render('500')
            })

            app.get('*', function(req, res) {
                res.status(404).render('404')
            })
        } else {  
            app.use('*', function(req, res) {
                res.status(404).send('404')
            })
        }
    //#endregion
}