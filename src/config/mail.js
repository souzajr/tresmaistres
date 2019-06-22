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
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
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
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
            to: email,
            subject: 'Alteração de senha - NÃO RESPONDA',
            text: 'Uma alteração de senha acabou de ser feita no site ' + process.env.DOMAIN_NAME + '\n\n' +
            'Se você não fez essa alteração, por favor entre em contato com o suporte.' + '\n' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        } 
        transporter.sendMail(mailOptions)
    },

    newAccountByAdmin(email, name, password) {
        const mailOptions = {
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
            to: email,
            subject: 'Uma conta foi criada para você - NÃO RESPONDA',
            html: '<b>Olá, ' + name + '. Uma conta em nossa plataforma foi criada para você.</b><br/>' +
            'Para acessar a plataforma, utilize as informações abaixo:<br/>' +
            '<b>' + process.env.DOMAIN_NAME + '<br/>' +
            'Email: ' + email +
            '<br/>Senha: ' + password + '</b><br/><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },

    sendWelcome(email, name) {
        const mailOptions = {
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
            to: email,
            subject: 'Seja bem-vindo(a) ao portal AgoraMed - NÃO RESPONDA',
            html: '<b>Olá, ' + name + '. Sua conta foi criada com sucesso!</b><br/><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },

    sendWelcomeClinic(email, name) {
        const mailOptions = {
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
            to: email,
            subject: 'Seja bem-vindo(a) ao portal AgoraMed - NÃO RESPONDA',
            html: '<b>Olá, ' + name + '. Sua conta foi criada com sucesso!</b><br/>' +
            'Os documentos enviados serão análisados e, em até dois dias úteis, entraremos em contato para liberarmos sua conta.<br/><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },

    orderCreated(order) {
        const mailOptions = {
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
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
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
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
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
            to: order.buyer.email,
            subject: 'Não foi possível concluir sua compra - NÃO RESPONDA',
            html: '<b>Olá, ' + order.buyer.name + '. Infelizmente, nã foi possível concluir sua compra.</b><br/>' +
            'Para conferir seu pedido, <a target="_blank" href="' + process.env.DOMAIN_NAME + '/detalhes-do-pedido/' + order._id + '">clique aqui</a>.<br/><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },

    sendTransaction(email, name, value) {
        const mailOptions = {
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
            to: email,
            subject: 'Depósito efetuado - NÃO RESPONDA',
            html: '<b>Olá, ' + name + '. Realizamos um depósito no valor de R$' + (value / 100).toFixed(2).replace('.', ',') + '</b><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    },

    clinicApproval(email, name) {
        const mailOptions = {
            from: 'AgoraMed <'+process.env.MAIL_AUTH_USER+'>',
            to: email,
            subject: 'Sua conta foi aprovada! - NÃO RESPONDA',
            html: '<b>Olá, ' + name + '. Sua conta em nosso portal foi aprovada e você já pode começar a vender!</b><br/>' +
            'Não responda este Email. Em caso de dúvidas, entre em contato através do Email contato@agoramed.com.br'
        }

        transporter.sendMail(mailOptions)
    }
}