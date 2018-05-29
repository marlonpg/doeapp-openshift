var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

module.exports = mongoose.model('Product', new Schema({ 
	userEmail: String,
	name: String,
	description: String,
	city: String,
	state: String,
	zipCode: String,
	category: String,
	expirationDate: String,
	filePath: String
}));