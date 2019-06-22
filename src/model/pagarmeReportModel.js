const mongoose = require('mongoose')
const PagarmeReportSchema = new mongoose.Schema({}, { strict: false })
mongoose.model('PagarmeReport', PagarmeReportSchema)