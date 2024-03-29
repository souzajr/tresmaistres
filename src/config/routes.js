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
        
        /* ============= VIEW ROBOTS.TXT  ============= */
        app.get('/robots.txt', function (req, res) {
            res.status(200).type('text/plain').send('User-agent: *\nDisallow: /admin/')
        })
    //#endregion

    //#region USER
        app.route('/primeiro-acesso')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), app.src.api.user.viewFirstAccess)  
            .post(csrf(), app.src.api.user.changeFirstAccess)

        app.route('/trocar-senha')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), app.src.api.user.viewChangeFirstPassword)  
            .post(csrf(), app.src.api.user.changeFirstPassword)
            
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
            .get(csrf(), admin(app.src.api.admin.viewHome)) 
            .post(csrf(), admin(app.src.api.admin.addNewOrder))

        app.route('/admin/comprovante')
            .all(app.src.config.passport.authenticate())
            .get(admin(app.src.api.admin.viewReceipt))            

        app.route('/admin/perfil')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), admin(app.src.api.admin.viewProfile))  
            .put(csrf(), admin(app.src.api.admin.changeProfile))

        app.route('/admin/detalhes-da-compra')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), admin(app.src.api.admin.viewOrderDetails))
            .post(csrf(), admin(app.src.api.admin.changeOrderDetails))  

        app.route('/admin/detalhes-da-compra/observacao')
            .all(app.src.config.passport.authenticate())
            .get(admin(app.src.api.admin.viewObservationFile))
            .post(csrf(), admin(app.src.api.admin.addObservation))        

        app.route('/admin/briefing')
            .all(app.src.config.passport.authenticate())
            .put(csrf(), admin(app.src.api.admin.changeSegmentation))  

        app.route('/admin/cupons')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), admin(app.src.api.admin.viewCoupons))
            .post(csrf(), admin(app.src.api.admin.addCoupon)) 
            .put(csrf(), admin(app.src.api.admin.editCoupon))  
            .delete(csrf(), admin(app.src.api.admin.removeCoupon))   

        app.route('/admin/planos')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), admin(app.src.api.admin.viewPlans))
            .post(csrf(), admin(app.src.api.admin.addPlan)) 
            .put(csrf(), admin(app.src.api.admin.editPlan))  
            .delete(csrf(), admin(app.src.api.admin.removePlan))    

        app.route('/admin/origem')
            .all(app.src.config.passport.authenticate())
            .get(admin(app.src.api.admin.viewOrigin))       

        app.route('/admin/automacoes')
            .all(app.src.config.passport.authenticate())
            .get(admin(app.src.api.admin.viewAutomation)) 

        app.route('/admin/relatorios')
            .all(app.src.config.passport.authenticate())
            .get(admin(app.src.api.admin.viewReport))

        app.route('/admin/pos-venda')
            .all(app.src.config.passport.authenticate())
            .get(admin(app.src.api.admin.viewAfterSales))   

        app.route('/admin/usuarios')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), admin(app.src.api.admin.viewUsers))  
            .post(csrf(), admin(app.src.api.admin.addNewUser))     

        app.route('/admin/usuarios/:id')
            .all(app.src.config.passport.authenticate())
            .get(csrf(), admin(app.src.api.admin.viewUserDetails))  
            .put(csrf(), admin(app.src.api.admin.changeUser))  
            .delete(csrf(), admin(app.src.api.admin.removeUser))          
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
                if(err.code === 'EBADCSRFTOKEN')
                    return res.status(403).json('Forbidden')
                    
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