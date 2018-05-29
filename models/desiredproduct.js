var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

module.exports = mongoose.model('DesiredProduct', new Schema({ 
	productid: String,
	useremail: String
}));