"use strict";

module.exports = middleware => {
    return (req, res, next) => {
        if(req.session.user.admin) {
            middleware(req, res, next)
        } else {
            req.session.reset()
            req.logout()
            res.status(401).render('index', {
                user: req.session.user,
                page: 'Acesso',
                message: JSON.stringify('Por favor, faça login para continuar')
            })
        }
    }
}