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
		}
	}
}

var app = angular.module('routes-forms', ['ngRoute']);

app.config(function($routeProvider) {
	$routeProvider.when('/community/new', {
		templateUrl: '/pages/edit.html',
		controller: function($scope) {
			$scope.title = 'Add a community';
			$scope.subtitle = 'Adding servers that you do not own and attempting to upload malicious files will result in a temporary ban. Repeat offenses will result in a permanent ban.';
			
			commonStuff($scope, document);

			$scope.action = '/community/new?_csrf=' + encodeURIComponent($scope.token);
		}
	});
		
	$routeProvider.when('/community/:id/edit', {
		templateUrl: '/pages/edit.html',
		controller: function($scope, $http, $routeParams) {
			$scope.title = 'Edit community';
			
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
		controller: function($http, $routeParams, $scope, $rootScope, $location) {
			$http.get('/api/community/' + $routeParams.id).success(function(community) {
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