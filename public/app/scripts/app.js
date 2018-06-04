'use strict';

angular.module('doeApp', ['ui.router', 'ngResource'])
	.config([ '$httpProvider',   function($httpProvider) {
		$httpProvider.interceptors.push('resourceInterceptor');
    }])
    .config(['$httpProvider', function($httpProvider) {
        if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};    
        }    
        //disable IE ajax request caching
        $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
        // extra
        $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
        $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';
    }])
    .config(function ($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('app', {
                url: '/',
                views: {
                    'header': {
                        templateUrl : 'views/header.html'
                    },
                    'content': {
                        templateUrl : 'views/home.html',
                        controller  : 'HomeController'
                    },
                    'footer': {
                        templateUrl : 'views/footer.html'
                    }
                }

            })
            .state('app.aboutus', {
                url: 'aboutus',
                views: {
                    'content@': {
                        templateUrl : 'views/aboutus.html'
                    }
                }
            })
            .state('app.contactus', {
                url: 'contactus',
                views: {
                    'content@': {
                        templateUrl : 'views/contactus.html',
                        controller  : 'ContactController'
                    }
                }
            })
            .state('app.login', {
                url: 'login',
                views: {
                    'content@': {
                        templateUrl : 'views/login.html',
                        controller  : 'LoginController'
                    }
                }
            })
			.state('app.signup', {
                url: 'signup',
                views: {
                    'content@': {
                        templateUrl : 'views/signup.html',
                        controller  : 'SignupController'
                    }
                }
            })
			.state('app.home', {
                url: 'home',
                views: {
                    'content@': {
                        templateUrl : 'views/home.html',
                        controller  : 'HomeController'
                    }
                }
            }).state('app.productregister', {
                url: 'productregister',
                views: {
                    'content@': {
                        templateUrl : 'views/product-register.html',
                    }
                }
            }).state('app.product', {
                url: 'product/{id}',
                controller: function($stateParams){
                    $stateParams.id
                },
                views: {
                    'content@': {
                        templateUrl : 'views/product.html',
                    }
                }
            })
            .state('app.search', {
                url: 'search/{productName}',
                controller: function($stateParams){
                    $stateParams.productName
                },
                views: {
                    'content@': {
                        templateUrl : 'views/search.html',
                        controller  : 'SearchController'
                    }
                }
            });
        $urlRouterProvider.otherwise('/');
    }).run(function ($rootScope, $state, $stateParams) {
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
    })

;
