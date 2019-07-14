"use strict";

const admin = require('./admin')
const csrf = require('csurf')
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
        app.get('/', csrf(), app.src.api.user.viewIndex)
        app.post('/enviar-mensagem', csrf(), app.src.api.user.sendMessage)

        /* ============= VIEW LOGIN  ============= */
        app.get('/login', csrf(), app.src.api.user.viewLogin)

        /* ============= LOCAL LOGIN  ============= */
        app.post('/login', csrf(), app.src.api.auth.login)

        /* ============= REGISTER NEW USER  ============= */
        app.post('/cadastro', csrf(), app.src.api.user.registerNewUser)

        /* ============= FORGOT PASSWORD ============= */
        app.get('/esqueci-minha-senha', csrf(), app.src.api.user.viewRecoverPassword)
        app.post('/esqueci-minha-senha', csrf(), app.src.api.user.recoverPassword)
        app.get('/alterar-senha/:token', csrf(), app.src.api.user.checkToken)
        app.post('/alterar-senha/:token', csrf(), app.src.api.user.resetPassword)

        /* ============= SOCIAL LOGIN INSTAGRAM ============= */
        app.get(process.env.INSTAGRAM_CALLBACK_URL + '/login', app.src.api.auth.instagram)
        app.get('/instagram', passport.authenticate('instagram', { scope: ['basic'] }))
        app.get(process.env.INSTAGRAM_CALLBACK_URL, passport.authenticate('instagram', { 
            successRedirect: process.env.INSTAGRAM_CALLBACK_URL + '/login',
            failureRedirect: process.env.INSTAGRAM_CALLBACK_URL + '/login'
        }))
        
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
        app.get('/finalizar-compra', csrf(), app.src.api.user.viewCheckout)        
        
        /* ============= VIEW ORDERS DETAILS  ============= */
        app.get('/detalhes-do-pedido/:id', app.src.api.user.orderDetails)       
        
        /* ============= VIEW SEGMENTATION  ============= */
        app.get('/briefing', csrf(), app.src.api.user.viewSegmentation) 
        app.post('/briefing', csrf(), app.src.api.user.getSegmentation)   

        /* ============= DOWNLOAD INVOICE  ============= */
        app.get('/nota-fiscal', app.src.api.user.downloadInvoice)     
        
        /* ============= VIEW SITEMAP.XML  ============= */
        app.get('/sitemap.xml', app.src.api.user.viewSiteMap)
    //#endregion

    //#region USER
        app.route('/primeiro-acesso')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), app.src.api.user.viewFirstAccess)  
            .post(csrf(), app.src.api.user.changeFirstAccess)

        app.route('/minha-conta')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), app.src.api.user.viewUserProfile) 
            .post(csrf(), app.src.api.user.changeUserProfile) 

        app.route('/minha-conta/alterar-senha')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), app.src.api.user.viewEditPassword) 
            .post(csrf(), app.src.api.user.editPassword)  

        app.route('/minha-conta/pedidos')
            .all(app.src.config.passport.authenticate())
            .get(app.src.api.user.viewOrders) 
    //#endregion

    //#region ADMIN 
        app.route('/admin')
            .all(app.src.config.passport.authenticate())
            .get(admin(app.src.api.admin.viewHome)) 

        app.route('/admin/perfil')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), admin(app.src.api.admin.viewProfile))  
            .put(csrf(), admin(app.src.api.admin.changeProfile))

        app.route('/admin/detalhes-da-compra')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), admin(app.src.api.admin.viewOrderDetails))
            .post(csrf(), admin(app.src.api.admin.changeOrderDetails))         

        app.route('/admin/briefing')
            .all(app.src.config.passport.authenticate())
            .put(csrf(), admin(app.src.api.admin.changeSegmentation))  
    //#endregion

    //#region PAGARME
        /* ============= CHECKOUT PROCESS  ============= */
        app.post('/finalizar-compra', csrf(), app.src.api.pagarme.checkout)

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