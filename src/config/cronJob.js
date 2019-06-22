"use strict";

const mongoose = require('mongoose')
const CronJob = require('cron').CronJob
const moment = require('moment')
moment.locale('pt-br')

module.exports = {
    startCronJobServer() {
        const checkBoletoJob = new CronJob('0 0 0 * * *', _ => {
            Commission.find({ status: 'pagamento pendente' }).then(async commission => {
                if(!commission.length) return

                for(let i = 0; i < commission.length; i++) {
                    if(moment.duration(((moment(commission[i].createdAt, 'DD/MM/YYYY').add(7, 'day'))).diff(moment().startOf('day'))).asDays() <= 0) {    
                        await Event.findOne({ _id: commission[i]._idEvent }).then(async event => {
                            if(event) {
                                event._idOrder = ''
                                event._idClient = ''
                                event.status = 'disponivel'
                                event.title = 'Horário Livre'
                                event.color = '#007bff'
                                delete event.patientInfo
    
                                await event.save().then(Commission.deleteOne({ _id: commission[i]._id }))
                            }
                        })
                    }
                }
            }).catch(err => console.log(new Error(err)))
        })

        checkBoletoJob.start()
    }
}