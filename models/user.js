var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

module.exports = mongoose.model('User', new Schema({ 
    name: String, 
    cellphone: String, 
    email: { 
        type: String, 
        unique: true,
        index: true
    },
    password: String, 
    admin: Boolean 
}));