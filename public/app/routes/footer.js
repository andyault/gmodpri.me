var app = angular.module('routes-footer', ['ngRoute']);

app.config(function($routeProvider) {
	$routeProvider.when('/terms', {
		templateUrl: '/pages/terms.html'
	});

	$routeProvider.when('/privacy', {
		templateUrl: '/pages/privacy.html'
	});

	$routeProvider.when('/contact', {
		templateUrl: '/pages/contact.html'
	});

	$routeProvider.when('/getstarted', {
		templateUrl: '/pages/getstarted.html'
	});

	$routeProvider.when('/faq', {
		templateUrl: '/pages/faq.html'
	});
});