"use strict";

const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SECURE,
    auth: {
        user: process.env.MAIL_AUTH_USER,
        pass: process.env.MAIL_AUTH_PASS
    }
})

module.exports = { 
    recoveryMail(email, token) {
        const mailOptions = {
            from: 'AgoraMed <' + process.env.MAIL_AUTH_USER + '>',
            to: email,
            subject: 'Recuperação de senha - NÃO RESPONDA',
            text: 'Você está recebendo este Email pois solicitou a redefinição da senha da sua conta.\n' +
            'Por favor, clique no link abaixo ou cole no seu navegador para completar o processo:\n\n' +
            process.env.DOMAIN_NAME + '/alterar-senha/' + token + '\n\n' +
            'Se você não solicitou isso, ignore este Email e sua senha permanecerá inalterada.' + '\n' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        } 

        transporter.sendMail(mailOptions)
    },

    alertOfChange(email) {
        const mailOptions = {
            from: 'AgoraMed <' + process.env.MAIL_AUTH_USER + '>',
            to: email,
            subject: 'Alteração de senha - NÃO RESPONDA',
            text: 'Uma alteração de senha acabou de ser feita no site ' + process.env.DOMAIN_NAME + '\n\n' +
            'Se você não fez essa alteração, por favor entre em contato com o suporte.' + '\n' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        } 
        transporter.sendMail(mailOptions)
    },

    sendWelcome(email, name) {
        const mailOptions = {
            from: 'AgoraMed <' + process.env.MAIL_AUTH_USER + '>',
            to: email,
            subject: 'Seja bem-vindo(a) ao portal AgoraMed - NÃO RESPONDA',
            html: '<b>Olá, ' + name + '. Sua conta foi criada com sucesso!</b><br/><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },

    sendMessage(message) {
        const mailOptions = {
            from: message.name + ' <' + message.email + '>',
            to: 'contato@tresmaistres.com.br',
            subject: message.subject,
            html: 'Recebemos um uma nova mensagem!<br/><br/>' +
            'Enviada por: ' + message.name + '<br/>' +
            'Email: ' + message.email + '<br/>' +
            'Assunto: ' + message.subject + '<br/>' +
            'Mensagem: ' + message.message
        }

        transporter.sendMail(mailOptions)
    },

    orderCreated(order) {
        const mailOptions = {
            from: 'AgoraMed <' + process.env.MAIL_AUTH_USER + '>',
            to: order.buyer.email,
            subject: 'Recebemos seu pedido - NÃO RESPONDA',
            html: '<b>Olá, ' + order.buyer.name + '. Recebemos seu pedido!</b><br/>' +
            'Para conferir seu pedido, <a target="_blank" href="' + process.env.DOMAIN_NAME + '/detalhes-do-pedido/' + order._id + '">clique aqui</a>.<br/><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },

    paymentReceived(order) {
        const mailOptions = {
            from: 'AgoraMed <' + process.env.MAIL_AUTH_USER + '>',
            to: order.buyer.email,
            subject: 'Recebemos seu pagamento - NÃO RESPONDA',
            html: '<b>Olá, ' + order.buyer.name + '. Sucesso, seu pagamento foi aprovado!</b><br/>' +
            'Para conferir seu pedido, <a target="_blank" href="' + process.env.DOMAIN_NAME + '/detalhes-do-pedido/' + order._id + '">clique aqui</a>.<br/><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },

    orderFailed(order) {
        const mailOptions = {
            from: 'AgoraMed <' + process.env.MAIL_AUTH_USER + '>',
            to: order.buyer.email,
            subject: 'Não foi possível concluir sua compra - NÃO RESPONDA',
            html: '<b>Olá, ' + order.buyer.name + '. Infelizmente, nã foi possível concluir sua compra.</b><br/>' +
            'Para conferir seu pedido, <a target="_blank" href="' + process.env.DOMAIN_NAME + '/detalhes-do-pedido/' + order._id + '">clique aqui</a>.<br/><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },
}