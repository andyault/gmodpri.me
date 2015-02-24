var msgs = {
	community_added: "Your community has been added successfully!",
	community_updated: "Your community has been updated successfully!",
	community_deleted: "Your community has been deleted successfully!",
	already_exists: "That server has already been added!",
	not_owner: "You are not the owner of that community!",
	no_file: "You must upload an image!",
	log_in: "You must be logged in to do that!",
	logged_in: "Logged in successfully!",
	logged_out: "Logged out successfully!",
	csrf: "Token expired! Refresh and try again!",
	error: "Internal error!"
}

var app = angular.module('mainApp', [
	'ngRoute',
	'directives',
	'routes-footer',
	'routes-forms',
	'routes-users',
	'routes-communities'
]);

app.config(function($compileProvider, $routeProvider, $locationProvider) {
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|steam):/);
	
	$routeProvider.when('/', {
		templateUrl:'/pages/home.html',
		controller: function($rootScope, $scope, $http, $q) {
			$rootScope.title = 'Garry\'s Mod Servers | GMOD Prime';
			$rootScope.description = 'GMOD Prime - An alternative server browser';
			
			$scope.categories = {};
			$scope.fetching = true;
			
			$http.get('/api/communities', {params: {amt: 4}}).success(function(data) {
				$scope.categories.new = [];
				$scope.fetching = false;
				
				var added = {};

				data.results.forEach(function(id, k) {
					$scope.categories.new[k] = {loading: true};
					added[id] = true;

					$http.get('/api/community/' + id).success(function(data) {
						var community = $scope.categories.new[k];

						if(community.deferred)
							community.deferred.resolve(data);
						else 
							community = $scope.categories.new[k] = data;
					});
				});
			
				$http.get('/api/communities', {params: {amt: 8, sortBy: 'random'}}).success(function(data) {
					$scope.categories.random = [];

					data.results.forEach(function(id) {
						if(!added[id] && $scope.categories.random.length < 4) {
							var k = $scope.categories.random.unshift({loading: true});

							$http.get('/api/community/' + id).success(function(data) {
								var community = $scope.categories.random[k - 1];

								if(community.deferred)
									community.deferred.resolve(data);
								else
									community = $scope.categories.random[k - 1] = data;
							});
						}
					});
				});
			});
			
			//sponsored, featured
		}
	});

	$routeProvider.when('/return', {
		template: '<center>{{msg}}</center>',
		controller: function($rootScope, $scope, $location, $timeout) {
			var query = $location.search();
			
			$rootScope.description = $rootScope.title = msgs[query.msg];

			if(query.msg == 'wait') {
				var date = new Date(query.time);
				date.setDate(date.getDate() + 1);

				var diff = date - Date.now();

				var seconds = Math.floor(diff/1000);
				var minutes = Math.floor(seconds/60);
				var hours = Math.floor(minutes/60);
				minutes %= 60;
				seconds %= 60;

				var str = ['You must wait'];

				if(hours)
					str.push(hours + ' hours' + (minutes ? (seconds ? ',' : ' and') : ''));

				if(minutes)
					str.push(minutes + ' minutes' + (seconds ? ' and' : ''));

				if(seconds)
					str.push(seconds + ' seconds');

				str.push('before you can vote again.');

				$scope.msg = str.join(' ');
			} else {
				$scope.msg = (msgs[query.msg] || "Error: Message not found");
			}				

			$timeout(function() {
				$location.path(query.location || '/').search({});
				$location.replace();
			}, query.wait || 3000);
		}
	});

	$routeProvider.otherwise({
		templateUrl: '/pages/404.html',
		controller: function($rootScope) {
			$rootScope.title = '404 Not Found';
			$rootScope.description = '404 Not Found';
		}
	});

	$locationProvider.html5Mode(true);
});

app.run(function($http, $rootScope, $q) {
	$http.get('/api/info').success(function(info) {
		$rootScope.info = info;
	});
	
	//steam info
	
	var userDef = $q.defer();
	
	$rootScope.userPromise = userDef.promise;
	
	$http.get('/api/user').success(function(data) {
		userDef.resolve(data);
	});
	
	$rootScope.userPromise.then(function(data) {
		$rootScope.user = data;
	});
	
	//database info
	
	$http.get('/api/userdata').success(function(data) {
		if(!data)
			return
			
		$rootScope.userdata = data;
		
		$rootScope.notifications = [];
		$rootScope.unread = 0;
		
		$rootScope.userdata.notifications.forEach(function(note, k) {
			var ret = {
				str: 'New comment on your',
				label: note.label,
				link: ''
			};
			
			switch(note.label) {
				case 'community':
					ret.link = '/community/' + note.id;
					
					break
				
				case 'profile':
					ret.link = '/user/' + note.id;
					
					break
			}
			
			$rootScope.notifications[k] = ret;
			
			if(note.unread) {
				$rootScope.unread++;
				delete note.unread;
			}
		});
	});
	
	$rootScope.showNotifications = false;
	$rootScope.toggleNotifications = function() {
		$rootScope.showNotifications = !$rootScope.showNotifications;
		
		if($rootScope.showNotifications && $rootScope.unread) {
			$http.post('/api/clearNotifications');
			$rootScope.unread = 0;
		}
	}
});