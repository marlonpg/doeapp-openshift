var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

module.exports = mongoose.model('WishList', new Schema({ 
	productid: String,
	useremail: String
}));