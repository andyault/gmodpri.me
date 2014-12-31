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
		controller: function($scope, $http) {
			$http.get('/api/communities').success(function(communities) {
				var data = communities;

				$scope.communities = [];

				data.results.forEach(function(id, k) {
					$scope.communities[k] = {loading: true};

					$http.get('/api/community/' + id).success(function(community) {
						$scope.communities[k] = community;
					});
				});
			});
		}
	});

	$routeProvider.when('/return', {
		template: '<center>{{msg}}</center>',
		controller: function($scope, $location, $timeout) {
			var query = $location.search();

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
		templateUrl: '/pages/404.html'
	});

	$locationProvider.html5Mode(true);
});

app.run(function($http, $rootScope) {
	$http.get('/api/info').success(function(info) {
		$rootScope.info = info;
	});
	
	$http.get('/api/user').success(function(data) {
		$rootScope.user = data;
	});
	
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