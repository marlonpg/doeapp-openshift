'use strict';

angular.module('doeApp')
        .controller('ContactController', ['$scope', function($scope) {
			$scope.sendFeedback = function(){
				alert("Em construção :). Para entrar em contato, mande email para gambasoftware@gmail.com");
			}
        }])
		.filter('escape', function() {
			return window.encodeURIComponent;
		})
		.controller('TimelineController', ['$scope', 'timelineFactory', function($scope, timelineFactory) {
            $scope.showTimeline = false;
            $scope.message = "Loading ...";			
            $scope.products = timelineFactory.getTimelineProducts().query()
                .$promise.then(
                    function(response) {
                        $scope.products = response;
                        $scope.showTimeline = true;
                    },
                    function(response) {
                        $scope.message = "Error: "+response.status + " " + response.statusText;
                    }
			);
			$scope.search = function () {
				$scope.$state.go("app.search", {productName: $scope.searchProductName});
			}
        }])
		.controller('ProductController', ['$scope', 'productService', '$stateParams', 'UserService', 'wishListService', function($scope, productService, $stateParams, UserService, wishListService) {
			$scope.showWish = false;
			$scope.showDelete = false;

			$scope.deleteProduct = function(){
				var deleteProduct = window.confirm('Você quer mesmo deletar o Produto "'+ $scope.product.name + '"?');
				if(deleteProduct){
					productService.deleteProduct($stateParams.id).remove()
						.$promise.then(
							function(response) {
								console.log(response);
								$scope.$state.go("app.home");
							},
							function(response) {
								alert("Você não tem permissão para deletar este produto.");
								console.log("Error deleteProduct: "+response.status + " " + response.statusText);
								$scope.message = "Error: "+response.status + " " + response.statusText;
							}
						);
				}
			};
			
			$scope.getProductWishList = function() {
				console.log("CALLING getProductWishList");
				wishListService.get({'productId':$stateParams.id})
				.$promise.then(
					function(response) {
						$scope.wishListNumber = response.size;
						$scope.isDesiring = response.users.includes(UserService.email);
					},
					function(response) {
						//console.log("Error getProductWishList: "+response.status + " " + response.statusText);
						$scope.message = "Error: "+response.status + " " + response.statusText;
					}
				);
			}

			$scope.addProductToWishList = function(){
				var userWantsThisProduct = window.confirm('Você deseja mesmo obter este Produto "'+ $scope.product.name + '"?');
				if(userWantsThisProduct){
					wishListService.save({'productId':$stateParams.id},{})
					.$promise.then(
						function(response) {
							if(response.success){
								$scope.getProductWishList();
								$scope.getUserFromProduct();
								alert(response.message);
							} else {
								alert(response.message);
							}
						},
						function(response) {
							console.log("Error addProductToWishList: "+response.status + " " + response.statusText);
							$scope.message = "Error: "+response.status + " " + response.statusText;
						}
					);
				}
			}

			$scope.removeProductFromWishList = function(){
				var userDontWantsThisProduct = window.confirm('Você deseja mesmo SAIR da fila de interessados pelo Produto "'+ $scope.product.name + '"?');
				if(userDontWantsThisProduct){
					wishListService.remove({'productId':$stateParams.id},{})
					.$promise.then(
						function(response) {
							if(response.success){
								$scope.getProductWishList();
								$scope.getUserFromProduct();
								alert(response.message);
							} else {
								alert(response.message);
							}
						},
						function(response) {
							console.log("Error removeProductFromWishList: "+response.status + " " + response.statusText);
							$scope.message = "Error: "+response.status + " " + response.statusText;
						}
					);
				}
			}

			$scope.getUserFromProduct = function(){
				if((UserService.isAdmin === true || UserService.isAdmin === 'true')  || (UserService.email)){
					productService.getUserFromProduct($stateParams.id).get()
						.$promise.then(
							function(response) {
								$scope.userContact = response;
								changeButtonsVisibility();
							},
							function(response) {
								$scope.userContact =  {userEmail:'XXXXXX@XXXXX.XXX', userName: 'XXXXXX', userCellphone: '(XX) XXXXX-XXXX' }
								console.log("Error: "+response.status + " " + response.statusText);
							}
					);
				} else {
					$scope.userContact =  {userEmail:'XXXXXX@XXXXX.XXXXXX', userName: 'XXXXXX', userCellphone: '(XX) XXXXX-XXXX' }
				}
			}

			var changeButtonsVisibility = function(){
				if((UserService.isAdmin === true || UserService.isAdmin === 'true')  || (UserService.email === $scope.userContact.userEmail)){
					$scope.showWish = false;
					$scope.showDelete = true;
				} else if((UserService.isAdmin === false || UserService.isAdmin === 'false') && (UserService.email !== $scope.userContact.userEmail)){
					$scope.showWish = true;
					$scope.showDelete = false;
				} else {
					$scope.showWish = false;
					$scope.showDelete = false;
				}
			}
						
			productService.getProduct($stateParams.id).query()
				.$promise.then(
					function(response) {
						$scope.product = response[0];
					},
					function(response) {
						$scope.message = "Error: "+response.status + " " + response.statusText;
					}
			);

			$scope.getUserFromProduct();
			$scope.getProductWishList();
        }])
		.controller('LoginController', ['$rootScope', '$scope', 'loginService', 'UserService', 'LocalStorage', function($rootScope, $scope, loginService, UserService, LocalStorage) {
            $scope.showLoading = false;
            $scope.message = "Loading ...";
			$scope.login = function(){
				$scope.showLoading = true;
				loginService.login().save($scope.user).$promise.then(
                    function(response) {
						if(response.success){
							LocalStorage.cleanLocalStorage();
							$scope.user = {email:"", password:""};
							$scope.loginForm.$setPristine();
							$scope.showLoading = false;
							LocalStorage.setLocalStorage(response.token, response.name, response.email, response.isAdmin);
							
							$scope.$state.go("app.home");
						} else {
							LocalStorage.cleanLocalStorage();
							$scope.messageClass = "alert alert-danger";
							$scope.message = "Error: "+response.message;
						}
                    },
                    function(response) {
                        $scope.message = "Error: "+response.status + " " + response.statusText;
                    }
				);
			}
        }])
		
		.controller('SignupController', ['$scope', 'signupService', function($scope, signupService) {
            $scope.showLoading = false;
            $scope.message = "Loading ...";
			$scope.signup = function(){
				$scope.showLoading = true;
				signupService.signup().save($scope.user).$promise.then(
                    function(response) {
                        //response.user;
						$scope.user = {name:"", cellphone:"", email:"", password:""};
						$scope.signupForm.$setPristine();
						$scope.messageClass = "alert alert-success alert-dismissable";
						$scope.message = response.message;
                    },
                    function(response) {
                        $scope.message = "Error: "+response.status + " " + response.statusText;
                    }
            	);

			}
        }])
		.controller('ProductRegisterController', ['$scope', 'UserService', function($scope, UserService) {
            $scope.message = "Loading ...";
			$scope.saveProduct = function () {
				createNewProduct(UserService.token)
				.done(function(data) {
					$scope.$state.go("app.home");
					console.log('success', data) 
				})
				.fail(function(xhr) {
					if(!xhr.responseJSON.loggedIn){
						var response = confirm("Você precisa estar logado para realizar esta operação!");
						if (response == true) {
							$scope.$state.go("app.login");
						}
					} else {
						alert(xhr.responseJSON.message)
					}
					console.log('error', xhr);
				});;
			}
        }])		
		.controller('MenuController', ['$scope', 'UserService', 'SharedService', 'LocalStorage', function($scope, UserService, sharedService, LocalStorage) {
			$scope.$on('handleBroadcast', function() {
				$scope.name = sharedService.displayName;
			});
			$scope.logout = function(){
				console.log("logout");
				LocalStorage.cleanLocalStorage();
				$scope.$state.go("app");
			}
		}])
		.controller('SearchController', ['$scope', 'productService','$stateParams', function($scope, productService, $stateParams) {		
			$scope.productName;
			$scope.showLastSearch;
			$scope.search = function () {
				if($scope.searchProductName == undefined || $scope.searchProductName === ''){
					$scope.productName = $stateParams.productName;
				} else {
					$scope.productName = $scope.searchProductName;
				}
				
				productService.searchProducts($scope.productName).query()
                .$promise.then(
                    function(response) {
                        $scope.products = response;
						$scope.showTimeline = true;
						$scope.searchProductName = '';
                    },
                    function(response) {
                        $scope.message = "Error: "+response.status + " " + response.statusText;
                    }
				);
			}
			if($stateParams.productName){
				$scope.search();
			}
		}])
		.directive('pressEnter', function () {
			return function (scope, element, attrs) {
				element.bind("keydown keypress", function (event) {
					if(event.which === 13) {
						scope.$apply(function (){
							scope.$eval(attrs.pressEnter);
						});
		
						event.preventDefault();
					}
				});
			};
		});
;
