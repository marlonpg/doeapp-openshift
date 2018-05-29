var express = require("express");
var app = express();
var fileUpload = require("express-fileupload");
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var jwt    = require('jsonwebtoken');
var config = require('./config');
var User   = require('./models/user');
var Product   = require('./models/product');
var DesiredProduct   = require('./models/desiredproduct');

///////////////////
//CONFIGURATION
var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
mongoose.connect(mongoURL);
app.set('secret', config.secret);

//ACCESS POST body information and URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//UPLOADFILE
app.use(fileUpload());

//LOGS
app.use(morgan('dev'));

//Cross-Origin Resource Sharing (CORS) is a mechanism that uses additional HTTP headers to let a user agent gain permission to access selected resources from a server on a different origin (domain) than the site currently in use. 
app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.get("/products", function(req, res) {
  console.log("Get all products");
  
	Product.find(function(err, products) {
		if (err){
			res.send(err);
		}
		res.json(products);
	});
});

//TODO
app.get("/logout", function(req, res) {
  console.log("Logout");
  res.send("You have been logged out of the system!");
});

///////////////////
//API ROUTES
var routes = express.Router(); 

routes.post('/wishlist/:id', function(req, res) {
	console.log("addProductToWishList "+ req.params.id);
	DesiredProduct.count({productid: req.params.id},function(err, counter) {
		if (err){
			return res.status(500).send(err);
		}
		if(counter >= 2){
			return res.json({ success: false, message: 'Not available! There are '+ counter+' users interested.' });
		} else {
			getUserFromSession(req).then(
				function(userSession) {
					console.log(userSession);
					var desiredProduct = new DesiredProduct({ 
						productid: req.params.id,
						useremail: userSession.userEmail
					});

					DesiredProduct.count({productid: req.params.id, useremail: userSession.userEmail}, function(err, counter) {
						if (err){
							return res.status(500).send(err);
						}
						if(counter > 0){
							console.log(counter);
							return res.json({ success: false, message: 'You have already added this product.' });
						} else {
							desiredProduct.save(function(err){
								if(err){
									console.log(err);
									res.json({ success: false, message: 'Invalid information!' });
								} else {
									res.json({ message: 'Your product has been added successfully!' });
								}
							});
						}
					});
				},
				function(err) {
					console.log(err);
					sendAllowedResponse(res, err);
				}
			);
		}
	});
});

routes.get('/wishlist/:id', function(req, res) {
	console.log("getProductWishList "+ req.params.id);
	DesiredProduct.count({productid: req.params.id},function(err, counter) {
		if (err){
			return res.status(500).send(err);
		}
			return res.json({ success: true, counter: counter, userlist: [], message: 'Not available! There are ' + counter + ' users interested.' });
	});
});

routes.get("/product/:id", function(req, res){
	console.log("getProduct: "+ req.params.id);
	var ObjectId = require('mongoose').Types.ObjectId; 
	var query = { "_id" : new ObjectId(req.params.id)};

	Product.find(query, function (err, product) {
		if (err){
			return res.status(500).send(err);
		}
		return res.status(200).send(product);	
	});
});

routes.get("/user-from-product/:id", function(req, res){
	console.log("getUserFromProduct: "+ req.params.id);
	var ObjectId = require('mongoose').Types.ObjectId; 
	var query = { "_id" : new ObjectId(req.params.id)};

	Product.findOne(query, function (err, product) {
		if (err){
			return res.status(500).send(err);
		}
		User.findOne({email: product.userEmail}, function(err, user) {
			if (user) {
				return res.status(200).send({userEmail:product.userEmail, userName: user.name, userCellphone: user.cellphone });
			}
		});
	});
});

routes.get("/products", function(req, res){
	console.log("searchProducts: "+ req.query.name);
	var ObjectId = require('mongoose').Types.ObjectId; 
	var query = {"name" :{  $regex: new RegExp(req.query.name, "i") }};
	console.log("searchProducts: query:"+ JSON.stringify(query));
	Product.find(query, function (err, products) {
		if (err){
			return res.status(500).send(err);
		}
		return res.status(200).send(products);	
	});
});

//AUTHENTICATE USER
routes.post('/authenticate', function(req, res) {
	User.findOne({email: req.body.email}, function(err, user) {
		if (err) throw err;
	
		if (!user) {
			res.json({ success: false, message: 'Invalid credentials!' });
		} else if (user) {
			if (user.password != req.body.password) {
				res.json({ success: false, message: 'Wrong credentials!' });
			} else {
				const payload = {
					userEmail: user.email,
					isAdmin: user.admin 
				};
				var token = jwt.sign(payload, app.get('secret'), {
					expiresInMinutes: 20
				});
				res.json({
					success: true,
					email:req.body.email,
					name:user.name,
					isAdmin:user.admin,
					cellphone:user.cellphone,
					message: 'authenticated!',
					token: token
				});
			}   
		}
	});
});

//USER REGISTER
routes.post('/signup', function(req, res) {
	var name = req.body.name;
	var cellphone = req.body.cellphone;
	var email = req.body.email;
	var password = req.body.password;
	
	console.log("Creating new User - NAME: %s - CELLPHONE: %s - EMAIL: %s - PASSWORD: %s", name, cellphone, email, password);
	var newUser = new User({ 
		name: name,
		cellphone: cellphone,
		email: email, 
		password: password,
		admin: false 
	});

	newUser.save(function(err){
		if(err){
			console.log(err);
			res.json({ success: false, message: 'Invalid information!' });
		} else {
			res.json({ message: 'Your account has been created successfully!' });
		}
	});
});

//ROUTE MIDDLEWARE - All below will have restricted access
routes.use(function(req, res, next) {
	var token = req.body.token || req.query.token || req.headers['x-access-token'];
	if (token) {
		jwt.verify(token, app.get('secret'), function(err, decoded) {      
			if (err) {
				return res.json({ success: false, message: 'Failed to authenticate token.' });    
			} else {
				req.decoded = decoded;    
				next();
			}
		});
	} else {
		return res.status(403).send({ 
			success: false, 
			loggedIn: false,
			message: 'Not Authorized!' 
		});
	}
});

function getUserFromSession(request) {
	var token = request.body.token || request.query.token || request.headers['x-access-token'];
	return new Promise(function(resolve, reject) {
		if (token) {
			jwt.verify(token, app.get('secret'), function(err, decoded) {      
				if (err) {
					console.log("getUserFromSession - Failed to authenticate token."); 
					reject(err);
				} else {
					var user = JSON.parse(JSON.stringify(decoded));
					resolve({'userEmail' :user.userEmail, 'isAdmin': user.isAdmin});
				}
			});
		}
	})
}

function hasPermission(productId, userEmail) {
	console.log("hasPermission: "+ productId + ' '+userEmail);
	return new Promise(function(resolve, reject) {
		var ObjectId = require('mongoose').Types.ObjectId; 
		var query = { "_id" : new ObjectId(productId)};
	
		Product.find(query, function (err, product) {
			if (err){
				resolve('false');
			}
			resolve(product);
			/*if(product.userEmail === userEmail){
				resolve(true);
			} else {
				resolve(false);
			}*/
		});
	})
}

//createProduct
routes.post("/product", function(req, res) {
	//console.log(req);
	var name = req.body.productName;
	var description = req.body.productDescription;
	var category = req.body.category;
	var expirationDate = req.body.expirationDate;
	var fileName;
	var filePath;
	var fileUIPath;
	console.log("Got a POST request to create a new product");

	if (!req.files.filetoupload) {
		console.log("No files were uploaded.");
	}
	else {
		var timestamp = (new Date()).getTime();
		
		fileName = timestamp +req.files.filetoupload.name;
	
		console.log('Uploading file ' + fileName + '...');

		let filetoupload = req.files.filetoupload;

		fileUIPath = "/uploads/" + fileName;
		filePath = "public/app/images/uploads/" + fileName;
		filetoupload.mv(filePath, function(err) {
			if (err) return res.status(500).send(err);
		});
	}

	var newProduct = new Product({ 
		userEmail: 	req.decoded.userEmail,
		name: name,
		description: description,
		city: req.body.city,
		state: req.body.state,
		zipCode: req.body.zipCode,
		category: category,
		expirationDate: expirationDate,
		filePath: fileUIPath 
	});

	newProduct.save(function(err){
		if(err){
			console.log(err);
			return;
		}

		res.json({ product: newProduct });
	});
});

//deleteProduct
routes.delete("/product/:id", function(req, res) {
	var productId = req.params.id;
	console.log("deleteProduct "+ productId);
	getUserFromSession(req).then(
		function(userSession) {
			hasPermission(productId, userSession.userEmail).then(
				function(response){
					var user = JSON.parse(JSON.stringify(response[0]));
					if(userSession.isAdmin || user.userEmail == userSession.userEmail){
						console.log("Response -getProduct "+ user);
						Product.remove({ _id: productId }, function(err) {
							if(err){
								console.log(err);
								return;
							}
							res.json({ success: true, message: 'Product has been deleted successfully!' });
						});
					} else {
						return res.status(403).send({ 
							success: false, 
							loggedIn: false,
							message: 'Not Authorized!' 
						});
					}
					
				},
				function(err) {
					console.log("ERROR hasPermissions ",err);
					return;
				}
			);
		},
		function(err) {
			console.log(err);
			return;
		}
	);
});


//ALL REGISTERED USERS
routes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});   

function sendAllowedResponse(res, message){
	console.log("Error message: "+ message);
	res.status(200).send({ 
		success: false, 
		message: message 
	});
}

//APPLYING ROUTES
app.use('/api', routes);

//STATIC CONTENT
app.use("/", express.static("public/"));

app.listen(port, ip);
console.log("App listening at http://%s:%s", ip, port);