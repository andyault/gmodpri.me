var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

var app = angular.module('routes-users', ['ngRoute']);

app.config(function($routeProvider) {
	$routeProvider.when('/user/:id?', {
		templateUrl: '/pages/user.html',
		controller: function($scope, $routeParams, $rootScope, $http, $interval, $q) {
			$routeParams.id = $routeParams.id || $rootScope.user.id;

			if(!$routeParams.id) {
				$scope.error = "You must be logged in to see your account!";
				return;
			}

			$http.get('/api/userdata/' + encodeURIComponent($routeParams.id)).success(function(userdata) {
				if(!userdata) {
					$scope.error = "Account not found";
					return
				}

				userdata.firstSeen = new Date(userdata.firstSeen);
				userdata.lastSeen = new Date(userdata.lastSeen);

				var cache = [];

				userdata.comments.forEach(function(comment) {
					comment.loading = true;

					if(!cache[comment.author]) {
						var deferred = $q.defer();

						$http.get('/api/userdata/' + comment.author).success(function(data) {
							deferred.resolve(data);
						});
						
						cache[comment.author] = deferred.promise;
					}
					
					cache[comment.author].then(function(data) {
						comment.userdata = data;
						delete comment.loading;
					});
				});

				$scope.userdata = userdata;

				$scope.prefix = ($rootScope.user && $rootScope.user.id == userdata.id ? 'You have' : userdata.displayName + ' has');

				$scope.activity = [];

				userdata.activity.forEach(function(act) {
					var ret = {
						icon: (act.action == 'add' ? 'fa-plus' : 'fa-minus'),
						str: [userdata.displayName],
						time: new Date(act.time)
					};

					switch(act.type) {
						case 'fave':
							ret.str.push('favorited a');
							ret.link = {label: 'community', href: '/community/' + act.id}

							break

						case 'comment':
							ret.str.push(act.action == 'add' ? 'left' : 'deleted');
							ret.str.push('a');
							ret.link = {label: 'comment', href: act.thing + '/' + act.id}

							break

						case 'community':
							ret.str.push(act.action == 'add' ? 'added' : 'deleted');

							if(act.action == 'add') {
								ret.str.push('a');
								ret.link = {label: 'community', href: '/community/' + act.id}
							} else {
								ret.str.push("'" + act.name + "'");
							}

							break
					}

					ret.str = ret.str.join(' ');
					var now = new Date();

					if(ret.time.getUTCFullYear() == now.getUTCFullYear() &&
					   ret.time.getUTCMonth() == now.getUTCMonth() && 
					   ret.time.getUTCDate() == now.getUTCDate()) {
						var hours = ret.time.getHours();
						var minutes = ret.time.getMinutes();
						var ampm = hours >= 12 ? 'PM' : 'AM';
						hours = hours % 12;
						hours = hours ? hours : 12;
						minutes = minutes < 10 ? '0' + minutes : minutes;
						ret.time = hours + ':' + minutes + ' ' + ampm;
					} else {
						ret.time = ret.time.getMonth() + 1 + '/' + ret.time.getDate() + '/' + ret.time.getFullYear();
					}	

					$scope.activity.push(ret);
				});

				$scope.postComment = function() {
					var commentbox = document.getElementById('commentbox');

					$scope.userdata.comments.unshift({
						author: $rootScope.user.id,
						time: Date.now(),
						comment: commentbox.value
					});

					$http.post('/api/users/' + $routeParams.id + '/comment', {comment: commentbox.value}).success(function(userdata) {
						$scope.userdata = userdata;
					});

					commentbox.value = '';
				}

				$scope.favorites = [];

				for(var id in userdata.favorites) {
					if(userdata.favorites.hasOwnProperty(id)) {
						$scope.favorites[id] = {loading: true};

						$http.get('/api/community/' + id).success(function(community) {
							$scope.favorites[id] = community;
						});
					}
				};

				$scope.communities = [];

				userdata.communities.forEach(function(communityid, id) {
					$scope.communities[id] = {loading: true};

					$http.get('/api/community/' + communityid).success(function(community) {
						$scope.communities[id] = community;
					});
				});

				$scope.firstSeen = [
					userdata.firstSeen.getDate(),
					months[userdata.firstSeen.getMonth()],
					userdata.firstSeen.getFullYear()
				].join(' ');

				var updateLastSeen = function() {
					var diff = Math.floor(Date.now() - userdata.lastSeen);

					var minutes = Math.floor(diff/60/1000);
					var hours = Math.floor(minutes/60);
					var days = Math.floor(hours/24);

					if(minutes < 1) {
						$scope.lastSeen = 'now';
					} else if(hours < 1) {
						$scope.lastSeen = minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ago';
					} else if(days < 1) {
						$scope.lastSeen = hours + ' hours ago';
					} else if(days <= 3) {
						$scope.lastSeen = days + ' days ago';
					} else {
						$scope.lastSeen = [
							userdata.lastSeen.getDate(),
							months[userdata.lastSeen.getMonth()],
							userdata.lastSeen.getFullYear()
						].join(' ');
					}
				}

				updateLastSeen();

				$interval(updateLastSeen, 60 * 1000);
			});

			$scope.curtab = 0;

			$scope.setTab = function(tab) {
				$scope.curtab = tab
			}

			$scope.isTab = function(tab) {
				return $scope.curtab == tab;
			}
		}
	});
});