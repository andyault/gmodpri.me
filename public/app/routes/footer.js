var app = angular.module('routes-footer', ['ngRoute']);

app.config(function($routeProvider) {
	$routeProvider.when('/terms', {
		templateUrl: '/pages/terms.html',
		controller: function($rootScope) {
			$rootScope.description = $rootScope.title = 'Terms of use';
		}
	});

	$routeProvider.when('/privacy', {
		templateUrl: '/pages/privacy.html',
		controller: function($rootScope) {
			$rootScope.description = $rootScope.title = 'Privacy policy';
		}
	});

	$routeProvider.when('/contact', {
		templateUrl: '/pages/contact.html',
		controller: function($rootScope) {
			$rootScope.description = $rootScope.title = 'Contact';
		}
	});

	$routeProvider.when('/getstarted', {
		templateUrl: '/pages/getstarted.html',
		controller: function($rootScope) {
			$rootScope.description = $rootScope.title = 'Getting started';
		}
	});

	$routeProvider.when('/faq', {
		templateUrl: '/pages/faq.html',
		controller: function($rootScope) {
			$rootScope.description = $rootScope.title = 'Frequently asked questions';
		}
	});
});