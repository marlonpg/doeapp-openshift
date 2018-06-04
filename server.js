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
var WishList   = require('./models/wishlist');

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

if (typeof mongoURL === "undefined") {
	mongoose.connect(config.database);
} else {
	mongoose.connect(mongoURL);
}

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

///////////////////
//API ROUTES
var routes = express.Router(); 

routes.get("/products", function(req, res) {
	console.log("searchProducts");
	var limit = req.query.limit;
	var status = req.query.status;
	var searchedname = req.query.name;
	var sort = req.query.sort;
	if (typeof limit === "undefined" || limit == '') {
		limit = 0;
	}
	if (typeof status === "undefined" || status == '') {
		status = 'available';
	}
	if (typeof searchedname === "undefined") {
		searchedname = '';
	}
	if (typeof sort === "undefined" || sort == ''){
		sort = {};
	} else if (sort === "asc"){
		sort = {'createdDate': 1};
	} else if (sort === "desc"){
		sort = {'createdDate': -1};
	}
	var query = {"name" :{  $regex: new RegExp(searchedname, "i") }, 'status': status};

	console.log(query);
	Product.find(query).sort(sort).limit(Number(limit)).exec(function(err, products) {
		if (err){
			console.log(err);
			return res.status(500).send(err);
		}
		res.json(products);
	});
});

routes.get('/wishlist/:id', function(req, res) {
	var productId = req.params.id;
	console.log('getProductWishList '+productId);
	getUsersWishByProduct(productId).then(
		function(userList){
			getUserFromSession(req).then(
				function(userSession){
					getProduct(productId).then(
						function(response){
							var user = JSON.parse(JSON.stringify(response[0]));
							if(userSession.isAdmin || user.userEmail == userSession.userEmail){
								var userArray = []
								for(var i = 0; i < userList.length; i++) {
									userArray.push(userList[i].useremail);
								}
								return res.json({ size: userList.length, users: userArray});
							} else {
								var userproduct = userList.find( function(user) { 
									return user.useremail === userSession.userEmail;
								} );
								if(userproduct){
									return res.json({ size: userList.length, users: [userproduct.useremail]});
								} else{
									return res.json({ size: userList.length, users: []});
								}
							}
						},
						function(error){
							return res.json({ size: userList.length, users: []});
						}
					);
				},
				function(error){
					return res.json({ size: userList.length, users: []});
				}
			);
		},
		function(error){
			console.log(err);
			res.status(500).send({ message: 'Internal Server Error!'});
		}
	);
});

routes.get("/product/:id", function(req, res){
	console.log("getProduct: "+ req.params.id);
	var ObjectId = require('mongoose').Types.ObjectId; 
	var query = { "_id" : new ObjectId(req.params.id)};

	Product.find(query, function (err, product) {
		if (err){
			console.log(err);
			res.status(500).send({ message: 'Internal Server Error!'});
		}
		return res.status(200).send(product);	
	});
});

//AUTHENTICATE USER
routes.post('/authenticate', function(req, res) {
	User.findOne({email: req.body.email}, function(err, user) {
		if (err) throw err;
	
		if (!user) {
			res.json({ success: false, message: 'Senha ou Email inválidos!' });
		} else if (user) {
			if (user.password != req.body.password) {
				res.json({ success: false, message: 'Senha ou Email inválidos!' });
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
			res.status(500).send({ message: 'Internal Server Error!'});
		} else {
			res.json({ message: 'Sua conta foi criada com sucesso!' });
		}
	});
});

//ROUTE MIDDLEWARE - All below will have restricted access
routes.use(function(req, res, next) {
	var token = req.body.token || req.query.token || req.headers['x-access-token'];
	if (token) {
		jwt.verify(token, app.get('secret'), function(err, decoded) {      
			if (err) {
				return res.status(400).send({
					loggedIn: false,
					message: 'Acesso não autorizado ou sessão expirada!'
				});
			} else {
				req.decoded = decoded;    
				next();
			}
		});
	} else {
		return res.status(403).send({ 
			success: false, 
			loggedIn: false,
			message: 'Acesso não autorizado ou sessão expirada!' 
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
		} else {
			reject(err);
		}
	})
}

function getProduct(productId) {
	console.log("getProduct: "+ productId);
	return new Promise(function(resolve, reject) {
		var ObjectId = require('mongoose').Types.ObjectId; 
		var query = { "_id" : new ObjectId(productId)};
	
		Product.find(query, function (err, product) {
			if (err){
				console.log(err);
				res.status(500).send({ message: 'Internal Server Error!'});
			}
			resolve(product);
		});
	})
}

function getUsersWishByProduct(productId) {
	console.log("getUsersWishByProduct: "+ productId);
	return new Promise(function(resolve, reject) {
		var ObjectId = require('mongoose').Types.ObjectId; 
		var query = { "_id" : new ObjectId(productId)};
		WishList.find({productid: productId},function(err, userList) {
			if (err){
				console.log("getUsersWishByProduct - Failed to get product from mongodb.");
				reject(err);
			}
			resolve(userList);
		});
	})
}

function hasPermissionsToSeeContactInfo(req, userEmail){
	return new Promise(function(resolve, reject) {
		getUsersWishByProduct(req.params.id).then(
			function(userList){
				getUserFromSession(req).then(
					function(userSession){
						if(userSession.isAdmin || userEmail == userSession.userEmail){
							resolve(true);
						}
						var userproduct = userList.find( function(user) { 
							return user.useremail === userSession.userEmail;
						} );
						if(userproduct){
							resolve(true);
						} else {
							resolve(false);
						}
					},
					function(error){
						resolve(false);
					}
				);
			},
			function(error){
				resolve(false);
			}
		);
	})
}

//createProduct
routes.post("/product", function(req, res) {
	console.log("addProduct: "+ req.body.productName);
	var name = req.body.productName;
	var description = req.body.productDescription;
	var category = req.body.category;
	var expirationDate = req.body.expirationDate;
	var fileName;
	var filePath;
	var fileUIPath;

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
			res.status(500).send({ message: 'Internal Server Error!'});
		}

		res.json({ product: newProduct });
	});
});


//updateProduct
routes.put("/product/:id", function(req, res) {
	var productId = req.params.id;
	console.log("updateProduct "+ productId);
	getUserFromSession(req).then(
		function(userSession) {
			getProduct(productId).then(
				function(response){
					var user = JSON.parse(JSON.stringify(response[0]));
					if(userSession.isAdmin || user.userEmail == userSession.userEmail){
						console.log("Response -getProduct "+ user);
						Product.update({ _id: productId }, { $set: { status: req.body.status }}, function(err) {
							if(err){
								console.log(err);
								res.status(500).send({ message: 'Internal Server Error!'});
							}
							res.json({ message: 'Produto foi atualizado com sucesso!' });
						});
					} else {
						console.log(err);
						return res.status(403).send({ message: 'Acesso não autorizado ou sessão expirada!'});
					}
				},
				function(err) {
					console.log("ERROR getProduct ",err);
					res.status(500).send({ message: 'Internal Server Error!'});
				}
			);
		},
		function(err) {
			console.log(err);
			return res.status(403).send({ message: 'Acesso não autorizado ou sessão expirada!'});
		}
	);
});

//deleteProduct
routes.delete("/product/:id", function(req, res) {
	var productId = req.params.id;
	console.log("deleteProduct "+ productId);
	getUserFromSession(req).then(
		function(userSession) {
			getProduct(productId).then(
				function(response){
					var user = JSON.parse(JSON.stringify(response[0]));
					if(userSession.isAdmin || user.userEmail == userSession.userEmail){
						console.log("Response -getProduct "+ user);
						Product.remove({ _id: productId }, function(err) {
							if(err){
								console.log(err);
								res.status(500).send({ message: 'Internal Server Error!'});
							}
							res.json({ success: true, message: 'Produto foi deletado com sucesso!' });
						});
					} else {
						console.log(err);
						return res.status(403).send({ message: 'Acesso não autorizado ou sessão expirada!'});
					}
					
				},
				function(err) {
					console.log(err);
					res.status(500).send({ message: 'Internal Server Error!'});
				}
			);
		},
		function(err) {
			console.log(err);
			return res.status(403).send({ message: 'Acesso não autorizado ou sessão expirada!'});
		}
	);
});

routes.post('/wishlist/:id', function(req, res) {
	console.log("addProductToWishList "+ req.params.id);
	WishList.count({productid: req.params.id},function(err, counter) {
		if (err){
			console.log(err);
			res.status(500).send({ message: 'Internal Server Error!'});
		}
		if(counter >= 2){
			return res.json({ success: false, message: 'Não está disponível no momento! Há '+ counter+' usuários interessados.' });
		} else {
			getUserFromSession(req).then(
				function(userSession) {
					console.log(userSession);
					var wishList = new WishList({ 
						productid: req.params.id,
						useremail: userSession.userEmail
					});

					WishList.count({productid: req.params.id, useremail: userSession.userEmail}, function(err, counter) {
						if (err){
							console.log(err);
							res.status(500).send({ message: 'Internal Server Error!'});
						}
						if(counter > 0){
							console.log(counter);
							return res.json({ success: false, message: 'Você já possui este produto.' });
						} else {
							wishList.save(function(err){
								if(err){
									console.log(err);
									res.status(500).send({ message: 'Internal Server Error!'});
								} else {
									res.json({ success: true, message: 'Você está na fila de interessados em obter este produto!' });
								}
							});
						}
					});
				},
				function(err) {
					console.log(err);
					return res.status(403).send({ message: 'Acesso não autorizado ou sessão expirada!'});
				}
			);
		}
	});
});

routes.delete('/wishlist/:id', function(req, res) {
	console.log("removeProductFromWishList "+ req.params.id);
	getUserFromSession(req).then(
		function(userSession) {
			WishList.remove({productid: req.params.id, useremail: userSession.userEmail}, function(err, message) {
				if (err){
					console.log(err);
					res.status(500).send({ message: 'Internal Server Error!'});
				} else {
					console.log("removeProductFromWishList "+message);
					res.json({ success: true, message: 'Você NÃO está mais fila de interessados em obter este produto!' });
				}
			});
		},
		function(err) {
			console.log(err);
			return res.status(403).send({ message: 'Acesso não autorizado ou sessão expirada!'});
		}
	);
});

routes.get("/user-from-product/:id", function(req, res){
	console.log("getUserFromProduct: "+ req.params.id);
	var ObjectId = require('mongoose').Types.ObjectId; 
	var query = { "_id" : new ObjectId(req.params.id)};

	Product.findOne(query, function (err, product) {
		if (err){
			console.log(err);
			res.status(500).send({ message: 'Internal Server Error!'});
		}
		hasPermissionsToSeeContactInfo(req, product.userEmail).then(
			function(response){
				User.findOne({email: product.userEmail}, function(err, user) {
					if (err){
						console.log(err);
						res.status(500).send({ message: 'Internal Server Error!'});
					}
					if (user) {
						if(response){
							return res.status(200).send({userEmail:product.userEmail, userName: user.name, userCellphone: user.cellphone });
						} else {
							return res.status(200).send({userEmail:'XXXXXX@XXXXXX.XXX', userName: user.name, userCellphone: '(XX) XXXXX-XXXX' });
						}
					} 
					return res.status(200).send({userEmail:'XXXXXX@XXXXXX.XXX', userName: 'XXXXXX', userCellphone: '(XX) XXXXX-XXXX' });
				});
			}, 
			function(error){
				console.log(err);
				return res.status(403).send({ message: 'Acesso não autorizado ou sessão expirada!'});
			}
		);
	});
});

//APPLYING ROUTES
app.use('/api', routes);

//STATIC CONTENT
app.use("/", express.static("public/"));

//HEALTH CHECK
app.get("/healthcheck", function(req, res) {
	console.log("healthcheck");
	res.status(200).send({ 
		message: "Ok"
	});
});

app.listen(port, ip);
console.log("App listening at http://%s:%s", ip, port);