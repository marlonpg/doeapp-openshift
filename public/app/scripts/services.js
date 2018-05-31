'use strict';

angular.module('doeApp')
	.constant("baseURL","/")
	.factory('UserService', function() {
	  return {
		  token : '',
		  name : '',
		  isAdmin : false,
		  email : ''
	  };
	})
	
	.factory('timelineFactory', ['$resource', 'baseURL', function($resource, baseURL) {
		var timelineFactory = {};

		timelineFactory.getTimelineProducts = function() {
			return $resource(baseURL + "products");
		};
		return timelineFactory;
	}])

	.service('loginService', ['$resource', 'baseURL', function($resource, baseURL) {
		this.login = function() {
			return $resource(baseURL + "api/authenticate");
		};
	}])

	.service('signupService', ['$resource', 'baseURL', function($resource, baseURL) {
		this.signup = function() {
			return $resource(baseURL + "api/signup");
		};
	}])
	
	.service('resourceInterceptor', ['$rootScope', 'UserService', 'SharedService', function($rootScope, UserService, sharedService) {
		this.request = function(config) {
			if(UserService.name != '') {
				config.headers['x-access-token'] = UserService.token;
			} else if (localStorage.getItem('token')){
				config.headers['x-access-token'] = localStorage.getItem('token');
				UserService.token = localStorage.getItem('token');
				UserService.name = localStorage.getItem('name');
				UserService.email = localStorage.getItem('email');
				UserService.isAdmin = localStorage.getItem('isAdmin');
				sharedService.prepForBroadcast(UserService.name);
				console.log("test");
			}
			sharedService.prepForBroadcast(UserService.name);
			console.log("LOGANDO");
			return config;
		};
	}])

	.service('productService', ['$resource', 'baseURL', function($resource, baseURL) {
		this.getProduct = function(productId) {
			return $resource(baseURL + "api/product/"+productId);
		};
		this.getUserFromProduct = function(productId) {
			console.log("getUserFromProduct");
			return $resource(baseURL + "api/user-from-product/"+productId);
		};
		this.deleteProduct = function(productId) {
			return $resource(baseURL + "api/product/"+productId);
		};
		this.searchProducts = function(name) {
			return $resource(baseURL + "api/products?name="+name);
		};
	}])
	.service('wishListService', ['$resource', 'baseURL', function($resource, baseURL) {
		var date = new Date();
		var timestamp = date.getTime();
		return $resource(baseURL + "api/wishlist/:productId" + "?date="+timestamp, {productId: '@id'});
	}])
	.service('LocalStorage', ['UserService', function(UserService) {
		this.cleanLocalStorage = function() {
			localStorage.setItem('token', '');
			localStorage.setItem('name', '');
			localStorage.setItem('email', '');
			localStorage.setItem('isAdmin', '');
			UserService.token = '';
			UserService.name = '';
			UserService.email = '';
			UserService.isAdmin = '';
		};
		this.setLocalStorage = function(token, name, email, isAdmin) {
			localStorage.setItem('token', token);
			localStorage.setItem('name', name);
			localStorage.setItem('email', email);
			localStorage.setItem('isAdmin', isAdmin);
			UserService.token = token;
			UserService.name = name;
			UserService.email = email;
			UserService.isAdmin = isAdmin;
		};
	}])
	.factory('SharedService', ['$rootScope', function($rootScope) {
		var sharedService = {};
		
		sharedService.displayName = '';
	
		sharedService.prepForBroadcast = function(name) {
			this.displayName = name;
			this.broadcastItem();
		};
	
		sharedService.broadcastItem = function() {
			$rootScope.$broadcast('handleBroadcast');
		};
	
		return sharedService;
	}]);
	
	
;

