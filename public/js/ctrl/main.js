var msgs = {
	server_added: "Your server has been added successfully!",
	server_updated: "Your server has been updated successfully!",
	server_deleted: "Your server has been deleted successfully!",
	already_exists: "That server has already been added!",
	server_offline: "Your server must be online while being added!",
	not_owner: "You are not the owner of that server!",
	no_file: "You must upload an image!",
	log_in: "You must be logged in to do that!",
	logged_in: "Logged in successfully!",
	logged_out: "Logged out successfully!",
	error: "Internal error!"
}

var verbs = {add: 'added', delete: 'delete'}

var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

var app = angular.module('mainApp', ['ngRoute']);

app.config(function($compileProvider, $routeProvider, $locationProvider) {
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|steam):/);
	
	$routeProvider
		.when('/', {
			templateUrl:'/pages/top.html',
			controller: function($scope, $http) {
				$http.get('/api/servers').success(function(servers) {
					var data = servers;
					
					$scope.servers = [];
					
					data.results.forEach(function(id, k) {
						var temp = $scope.servers[k] = {loading: true};
						
						$http.get('/api/servers/' + id).success(function(server) {
							$scope.servers[$scope.servers.indexOf(temp)] = server;
							
							$scope.servers.sort(function(a, b) {return (a.rank ? a.rank : 11) - (b.rank ? b.rank : 11)});
						});
					});
				});
			}
		})

		.when('/terms', {
			templateUrl: '/pages/terms.html'
		})

		.when('/privacy', {
			templateUrl: '/pages/privacy.html'
		})

		.when('/contact', {
			templateUrl: '/pages/contact.html'
		})

		.when('/getstarted', {
			templateUrl: '/pages/getstarted.html'
		})

		.when('/faq', {
			templateUrl: '/pages/faq.html'
		})

		.when('/user/:id?', {
			templateUrl: '/pages/account.html',
			controller: function($scope, $routeParams, $rootScope, $http, $interval) {
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
						
					userdata.favorites = JSON.parse(userdata.favorites);
					userdata.votes = JSON.parse(userdata.votes);
					
					userdata.firstSeen = new Date(userdata.firstSeen);
					userdata.lastSeen = new Date(userdata.lastSeen);
					
					var cache = [];
					
					userdata.comments.forEach(function(comment) {
						comment.loading = true;
						
						if(!cache[comment.author]) {
							cache[comment.author] = true;
							
							$http.get('/api/userdata/' + comment.author).success(function(userdata) {
								comment.userdata = userdata;
								delete comment.loading;
								
								cache[comment.author] = userdata;
								server.comments.forEach(function(sameauthor) {
									if(sameauthor.loading && sameauthor.author == comment.author) {
										sameauthor.userdata = userdata;
										sameauthor.loading = false;
									}
								});
							});
						}
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
								ret.link = {label: 'server', href: '/servers/' + act.id}
								
								break
								
							case 'vote':
								ret.str.push(act.action == 'add' ? 'up' : 'down');
								ret.str.push('voted a');
								ret.link = {label: 'server', href: '/servers/' + act.id}
								
								break
							
							case 'comment':
								ret.str.push(act.action == 'add' ? 'left' : 'deleted');
								ret.str.push('a');
								ret.link = {label: 'comment', href: act.thing + '/' + act.id}
								
								break
								
							case 'server':
								ret.str.push(act.action == 'add' ? 'added' : 'deleted');
								
								if(act.action == 'add') {
									ret.str.push('a');
									ret.link = {label: 'server', href: '/servers/' + act.id}
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

							$http.get('/api/servers/' + id).success(function(server) {
								$scope.favorites[id] = server;
							});
						}
					};
					
					$scope.servers = [];
					
					userdata.servers.forEach(function(serverid, id) {
						$scope.servers[id] = {loading: true};

						$http.get('/api/servers/' + serverid).success(function(server) {
							$scope.servers[id] = server;
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
		})

		.when('/servers', {
			templateUrl: '/pages/servers.html',
			controller: function($scope, $http) {
				var cache = {};
				
				$http.get('/api/servers', {params: {amt: $scope.perpage}}).success(function(data) {
					$scope.results = $scope.servers = [];
					
					data.results.forEach(function(id, k) {
						$scope.results[k] = $scope.servers[k] = {loading: true};
						
						$http.get('/api/servers/' + id).success(function(server) {
							cache[id] = $scope.results[k] = $scope.servers[k] = server;
						});
					});

					$scope.numpages = Math.ceil(data.amt/$scope.perpage);
				});

				$scope.filters = [];
				$scope.criteria = [
					{name: "Name", value: "name"}, 
					{name: "Gamemode", value: "game"}, 
					{name: "Map", value: "map"}
				];

				$scope.unused = $scope.criteria.map(function(x) {return x.value});

				$scope.addFilter = function() {
					if($scope.unused.length == 0) 
						return;

					var field = $scope.unused.shift();

					$scope.filters.push({field: field, old: field, value: ""});
				}

				$scope.removeFilter = function() {
					var old = $scope.filters.pop();

					$scope.unused.unshift(old.field);

					$scope.fetchServers();
				}

				$scope.updateUnused = function() {
					//this isn't as ugly anymore

					var changed = this;

					$scope.unused.unshift(this.filter.old);
					this.filter.old = this.filter.field;

					//make the other one change

					$scope.filters.forEach(function(filter) {
						//this line is ugly, hopefully angular doesn't change $$hashKey

						if(filter.field == changed.filter.field && filter.$$hashKey !== changed.filter.$$hashKey) {
							filter.field = $scope.unused.shift();
							filter.old = filter.field;
						}
					});
				}

				$scope.fetchServers = function() {
					var params = {amt: $scope.perpage};
					var count = 0;

					$scope.filters.forEach(function(e) {
						params[e.field.toLowerCase()] = e.value.toLowerCase();
						count++;
					});

					if(count > 0) {
						//$scope.results = [];
						
						$http.get('/api/servers', {params: params}).success(function(data) {
							$scope.results = [];
							
							data.results.forEach(function(id, k) {
								if(cache[id]) {
									$scope.results[k] = cache[id];
								} else {
									$scope.results[k] = {loading: true};
								
									$http.get('/api/servers/' + id).success(function(server) {
										cache[id] = $scope.results[k] = server;
									});
								}
							});

							$scope.numpages = Math.ceil(data.amt/$scope.perpage);
						});
					} else {
						$scope.results = $scope.servers;

						$scope.numpages = Math.ceil($scope.servers.length/$scope.perpage);
					}
				}

				$scope.sortBy = "Rank";
				$scope.orderBy = "";

				$scope.curpage = 0;
				$scope.numpages = 0;
				$scope.perpage = 10;

				$scope.pages = function() {
					var ret = [];

					var high = Math.min(Math.max($scope.curpage + 2, Math.max($scope.curpage - 2, 0) + 5), $scope.numpages);
					var low = Math.max(Math.min($scope.curpage - 2, high - 5), 0);

					for(var i = low; i < high; i++) {
						ret.push(i);
					}

					return ret;
				}

				$scope.setPage = function(page) {
					var old = $scope.curpage;
					
					$scope.curpage = Math.min(Math.max(page, 0), $scope.numpages - 1);
					
					$http.get('/api/servers', {params: {amt: $scope.perpage, start: ($scope.curpage * $scope.perpage)}}).success(function(data) {
						$scope.results = [];
						
						data.results.forEach(function(id, k) {
							if(cache[id]) {	
								$scope.results[k] = cache[id];
							} else {
								$scope.results[k] = {loading: true};

								$http.get('/api/servers/' + id).success(function(server) {
									cache[id] = $scope.results[k] = server;
								});
							}
						});
					});
				}

				$scope.isPage = function(page) {
					return $scope.curpage == page;
				}

				$scope.prevPage = function() {
					$scope.setPage(Math.max($scope.curpage - 1, 0));
				}

				$scope.nextPage = function() {
					$scope.setPage(Math.min($scope.curpage + 1, $scope.numpages));
				}
			}
		})

		.when('/servers/new', {
			templateUrl: '/pages/edit.html',
			controller: function($scope) {
				$scope.title = 'Add a server';
				$scope.subtitle = 'Adding servers that you do not own and attempting to upload malicious files will result in a temporary ban. Repeat offenses will result in a permanent ban.';
					
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
		})

		.when('/servers/:id', {
			templateUrl: '/pages/server.html',
			controller: function($scope, $http, $routeParams, $rootScope) {
				$http.get('/api/servers/' + $routeParams.id).success(function(server) {
					if(!server) {
						$scope.error = "Server not found :(";
						return
					}
					
					server.fullip = (server.domain || server.ip) + ':' + server.port;
					server.score = server.votes.up - server.votes.down;
					
					var cache = [];
					
					server.comments.forEach(function(comment) {
						comment.loading = true;
						
						if(!cache[comment.author]) {
							cache[comment.author] = true;
							
							$http.get('/api/userdata/' + comment.author).success(function(userdata) {
								comment.userdata = userdata;
								delete comment.loading;
								
								cache[comment.author] = userdata;
								server.comments.forEach(function(sameauthor) {
									if(sameauthor.loading && sameauthor.author == comment.author) {
										sameauthor.userdata = userdata;
										sameauthor.loading = false;
									}
								});
							});
						}
					});
					
					if(server.website)
						server.website = (server.website.match(/^[^:]+:\/\//) ? '' : 'http://') + server.website;
					
					$scope.server = server;
                    
                    $http.get('/api/userdata/' + server.owner).success(function(data) {
                        if(!data) {
                            $scope.ownerName = 'error';
                            return
                        }
                            
                        $scope.ownerName = data.displayName;
                    });

					var seconds = Math.floor((Date.now() - new Date(server.updated))/1000);
					var minutes = Math.floor(seconds / 60);

					if(minutes > 0) {
						$scope.server.timeago = Math.floor(seconds / 60) + " minute" + (minutes > 1 ? "s" : "") + " ago";
					} else if(seconds < 5) {
						$scope.server.timeago = "now";
					} else {
						$scope.server.timeago = seconds + " seconds ago";
					}
					
					var setUserdata = function(userdata) {
						if(!userdata)
							return;
						
						userdata.favorites = JSON.parse(userdata.favorites);
						userdata.votes = JSON.parse(userdata.votes);

						$scope.userdata = userdata;

						$scope.faved = userdata.favorites[server._id];
						$scope.upped = userdata.votes[server._id] > 0;
						$scope.dnned = userdata.votes[server._id] < 0;
						
						$scope.favemsg = $scope.faved ? 'Unfavorite' : 'Add to favorites';
						$scope.votemsg = $scope.upped ? 'Remove vote' : ($scope.dnned ? 'Change vote' : 'Vote for this server');
					}						
                    
					if($rootScope.user) {
						$http.get('/api/userdata/').success(setUserdata);
					
						$scope.postComment = function() {
							var commentbox = document.getElementById('commentbox');

							$scope.server.comments.unshift({
								author: $rootScope.user.id,
								time: Date.now(),
								comment: commentbox.value,
								userdata: $scope.userdata
							});
							
							console.log('1234');

							$http.post('/api/servers/' + $routeParams.id + '/comment', {comment: commentbox.value}).success(console.log).error(console.log);

							commentbox.value = '';
						}

						$scope.act = function(type, e) {
							// man, clients are annoying
							
							var data = $scope.userdata;
							var id = server._id;
				
							switch(type) {
								case('fave'):
									$scope.faved = !$scope.faved;
									
									$scope.server.favorites += $scope.faved ? 1 : -1;
									
									break;

								case('upVote'):
									//$scope.server.votes.down -= $scope.dnned ? 1 : 0;
									
									$scope.upped = !$scope.upped;
									//$scope.dnned = false;
									
									$scope.server.votes.up += $scope.upped ? 1 : -1;
									
									break

								/* case('dnVote'):
									$scope.server.votes.up -= $scope.upped ? 1 : 0;
									
									$scope.dnned = !$scope.dnned;
									$scope.upped = false;
									
									$scope.server.votes.down += $scope.dnned ? 1 : -1;
									
									break */
							}
						
							$scope.favemsg = $scope.faved ? 'Unfavorite' : 'Add to favorites';
							$scope.votemsg = $scope.upped ? 'Remove vote' : 'Vote for this server'; //($scope.dnned ? 'Change vote' : 'Vote for this server');
							
							$http.post('api/servers/' + $routeParams.id, {act: type});
						}
						
					}
				})
			}
		})

		.when('/servers/:id/edit', {
			templateUrl: '/pages/edit.html',
			controller: function($scope, $http, $routeParams) {
				$scope.title = 'Edit server';
				
				document.getElementById('file').onchange = function() {
					if(this.files && this.files[0]) {
						var reader = new FileReader();

						reader.onload = function (e) {
							document.getElementById('previewimg').src = e.target.result;
						}

						reader.readAsDataURL(this.files[0]);
					}
				}
				
				$http.get('/api/servers/' + $routeParams.id).success(function(server) {
					$scope.server = server;
				});
			}
		})

		.when('/servers/:id/remove', {
			templateUrl: '/pages/remove.html',
			controller: function($http, $routeParams, $scope, $rootScope, $location) {
				$http.get('/api/servers/' + $routeParams.id).success(function(server) {
					if(!server) {
						$scope.error = 'That server does not exist.';
						return
					}
					
					server.fullip = (server.domain || server.ip) + ':' + server.port;
					
					$scope.server = server;
					
					if(!$rootScope.user) {
						$scope.error = 'You must be logged in to do that.';
					} else if(server.owner !== $rootScope.user.id) {
						$scope.error = 'You are not the owner of that server.';
					}
					
					$scope.remove = function() {
						$http.delete('/api/servers/' + $routeParams.id).success(function(url) {
							$location.url(url);
						});
					}
				})
			}
		})

		.when('/return', {
			template: '<center>{{msg}}</center>',
			controller: function($scope, $location, $timeout) {
				var query = $location.search();

				$scope.msg = (msgs[query.msg] || "Error: Message not found");

				$timeout(function() {
					$location.path(query.location || '/').search({});
					$location.replace();
				}, query.wait || 3000);
			}
		})

		.otherwise({
			templateUrl: '/pages/404.html'
		});

	$locationProvider.html5Mode(true);
});

/* openid middleware */

app.run(function($http, $rootScope) {
	$http.get('/api/user').success(function(data) {
		$rootScope.user = data;
	});
});

/* directives */

app.directive("serverView", function() {
	return {
		restrict: 'E',
		templateUrl: 'temps/serverView.html'
	};
});

app.directive("commentView", function() {
	return {
		restrict: 'E',
		templateUrl: 'temps/commentView.html',
		link: function(scope) {
			var date = new Date(scope.comment.time);
			
			var str = [];
			
			str.push(months[date.getMonth()].substr(0, 3));
			str.push(date.getDate());
			str.push('@');
			
			var hours = date.getHours();
			var minutes = date.getMinutes();
			var ampm = hours >= 12 ? 'pm' : 'am';
			hours = hours % 12;
			hours = hours ? hours : 12;
			minutes = minutes < 10 ? '0' + minutes : minutes;
			
			str.push(hours + ':' + minutes + ampm);
			
			scope.timestamp = str.join(' ');
		}
	};
});