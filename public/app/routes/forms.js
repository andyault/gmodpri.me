var commonStuff = function($scope, document) {
	$scope.token = document.cookie.match(/XSRF-TOKEN=([^;]*)/)[1]; //I hate this
	
	$scope.ips = [{}];

	$scope.addIP = function() {
		$scope.ips.push({});
	}

	$scope.popIP = function() {
		$scope.ips.pop();
	}

	document.getElementById('file').onchange = function() {
		if(this.files && this.files[0]) {
			var reader = new FileReader();

			reader.onload = function (e) {
				document.getElementById('previewimg').src = e.target.result;
			}

			reader.readAsDataURL(this.files[0]);
			
			if(this.files[0].type.search(/image\/*/) < 0)
				this.classList.add('invalid');
			else
				this.classList.remove('invalid');
		}
	}
	
	document.getElementById('website').onchange = function() {
		if(!this.value.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)) //http://code.tutsplus.com/tutorials/8-regular-expressions-you-should-know--net-6149
			this.classList.add('invalid');
		else
			this.classList.remove('invalid');
	}
	
	validateIP = function(elem) {		
		if(!elem.value.match(/([0-255]\.[0-255]\.[0-255])|(([a-z0-9\.-]+)\.([a-z\.]{2,6}))/))
			elem.classList.add('invalid');
		else
			elem.classList.remove('invalid');
	}
	
	validatePort = function(elem) {
		if(!elem.value.match(/[0-65535]/))
			elem.classList.add('invalid');
		else
			elem.classList.remove('invalid');
	}
	
	document.getElementById('submit').onclick = function(e) {
		if(document.getElementsByClassName('invalid').length)
			e.stopPropagation();
	}	
	
	$scope.toggleHelp = function() {
		document.getElementById('help').classList.toggle('display');
	}
}

var app = angular.module('routes-forms', ['ngRoute']);

app.config(function($routeProvider) {
	$routeProvider.when('/community/new', {
		templateUrl: '/pages/edit.html',
		controller: function($rootScope, $scope) {
			$rootScope.description = $rootScope.title = 'Add a community';
				
			$scope.subtitle = 'Adding servers that you do not own and attempting to upload malicious files will result in a temporary ban. Repeat offenses will result in a permanent ban.';
			
			commonStuff($scope, document);

			$scope.action = '/community/new?_csrf=' + encodeURIComponent($scope.token);
		}
	});
		
	$routeProvider.when('/community/:id/edit', {
		templateUrl: '/pages/edit.html',
		controller: function($rootScope, $scope, $http, $routeParams) {
			$rootScope.description = $rootScope.title = 'Edit community';
			
			commonStuff($scope, document);

			$scope.action = '/community/' + $routeParams.id + '/edit?_csrf=' + encodeURIComponent($scope.token);

			$http.get('/api/community/' + $routeParams.id).success(function(community) {
				if(!community)
					$scope.error = 'Community not found';
				
				$scope.community = community;
				
				$scope.ips = community.servers;
			});
		}
	});

	$routeProvider.when('/community/:id/remove', {
		templateUrl: '/pages/remove.html',
		controller: function($rootScope, $http, $routeParams, $scope, $rootScope, $location) {
			$http.get('/api/community/' + $routeParams.id).success(function(community) {
				$rootScope.description = $rootScope.title = 'Remove community';
				
				if(!community) {
					$scope.error = 'That community does not exist.';
					return
				}

				$scope.community = community;

				if(!$rootScope.user) {
					$scope.error = 'You must be logged in to do that.';
				} else if(community.owner !== $rootScope.user.id) {
					$scope.error = 'You are not the owner of that community.';
				}

				$scope.remove = function() {
					$http.delete('/api/community/' + $routeParams.id).success(function(url) {
						$location.url(url);
					});
				}
			})
		}
	});
});