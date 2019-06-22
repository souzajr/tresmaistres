"use strict";

const validator = require('email-validator')
const passwordValidator = require('password-validator')

module.exports = app => {
    function existOrError(value, msg) {
        if(!value) throw msg
        if(Array.isArray(value) && value.length === 0) throw msg
        if(typeof value === 'string' && !value.trim()) throw msg
    }

    function notExistOrError(value, msg) {
        try {
            existOrError(value, msg)
        } catch(msg) {
            return
        }
        throw msg
    }

    function tooSmall(value, msg) {
        if(value.length < 4) throw msg
    }

    function tooBig(value, msg) {
        if(value.length > 50) throw msg
    }

    function tooBigEmail(value, msg) {
        if(value.length > 100) throw msg
    }

    function equalsOrError(valueA, valueB, msg) {
        if(valueA !== valueB) throw msg
    }

    function strongOrError(value, msg) {
        const schema = new passwordValidator()
        if(!schema.is().min(8).validate(value)) throw msg
    }

    function hasDigitOrError(value, msg) {
        const schema = new passwordValidator()
        if(!schema.has().digits().validate(value)) throw msg
    }

    function hasUpperOrError(value, msg) {
        const schema = new passwordValidator()
        if(!schema.has().uppercase().validate(value)) throw msg
    }

    function hasLowerOrError(value, msg) {
        const schema = new passwordValidator()
        if(!schema.has().lowercase().validate(value)) throw msg
    }

    function notSpaceOrError(value, msg) {
        const schema = new passwordValidator()
        if(schema.has().spaces().validate(value)) throw msg
    }

    function hasSpecialOrError(value, msg) {
        const schema = new passwordValidator()
        if(!schema.has().symbols().validate(value)) throw msg
    }

    function validEmailOrError(value, msg) {
        if(!validator.validate(value)) throw msg
    }

    function notSpecialOrError(value, msg) {
        const schema = new passwordValidator()
        if(schema.has().symbols().validate(value)) throw msg
    }

    function notDigitOrError(value, msg) {
        const schema = new passwordValidator()
        if(schema.has().digits().validate(value)) throw msg
    }

    function notUpperOrError(value, msg) {
        const schema = new passwordValidator()
        if(schema.has().uppercase().validate(value)) throw msg
    }

    return { 
        existOrError, 
        notExistOrError,
        tooSmall,
        tooBig,
        tooBigEmail,
        equalsOrError, 
        strongOrError, 
        hasDigitOrError,
        hasUpperOrError,
        hasLowerOrError,
        notSpaceOrError,
        hasSpecialOrError,
        validEmailOrError,
        notSpecialOrError,
        notDigitOrError,
        notUpperOrError
    }
}