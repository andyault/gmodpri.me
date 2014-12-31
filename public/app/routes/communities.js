var timeAgo = function(seconds) {
	var timeago = seconds + ' seconds ago';
	if(seconds < 5) {
		var timeago = "now";
	} else if(seconds >= 60) {
		var minutes = Math.floor(seconds / 60);
		
		var timeago = minutes + " minute" + (minutes > 1 ? "s" : "") + " ago";
	}
	
	return timeago;
}

var app = angular.module('routes-communities', ['ngRoute']);

app.config(function($routeProvider) {
	$routeProvider.when('/search', {
		templateUrl: '/pages/search.html',
		controller: function($scope, $http) {
			var cache = {};
			var cachenum = 0;

			$http.get('/api/communities', {params: {amt: $scope.perpage}}).success(function(data) {
				$scope.results = [];

				data.results.forEach(function(id, k) {
					$scope.results[k] = {loading: true};

					$http.get('/api/community/' + id).success(function(community) {
						cache[id] = $scope.results[k] = community;
					});
				});

				cachenum = data.amt;
				$scope.numpages = Math.ceil(cachenum/$scope.perpage);
			});

			$scope.filters = [];
			$scope.criteria = [
				{name: 'Name', value: 'name'}, 
				{name: 'Gamemode', value: 'game'}, 
				{name: 'Map', value: 'map'}
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

			$scope.fetchCommunities = function() {
				var params = {amt: $scope.perpage, sortBy: $scope.sortBy, reverse: $scope.orderBy};

				$scope.filters.forEach(function(e) {
					params[e.field.toLowerCase()] = e.value.toLowerCase();
				});

				//$scope.results = [];

				$http.get('/api/communities', {params: params}).success(function(data) {
					$scope.results = [];

					data.results.forEach(function(id, k) {
						if(cache[id]) {
							$scope.results[k] = cache[id];
						} else {
							$scope.results[k] = {loading: true};

							$http.get('/api/community/' + id).success(function(community) {
								cache[id] = $scope.results[k] = community;
							});
						}
					});

					$scope.numpages = Math.ceil(data.amt/$scope.perpage);
				});
			}

			$scope.sortBy = 'added';
			$scope.sortOptions = [
				{name: 'Age', value: 'added'}, 
				{name: 'Name', value: 'name'}
			];

			$scope.orderBy = "";

			$scope.curpage = 0;
			$scope.numpages = 0;
			$scope.perpage = 15;

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

				$http.get('/api/communities', {params: {amt: $scope.perpage, start: ($scope.curpage * $scope.perpage)}}).success(function(data) {
					$scope.results = [];

					data.results.forEach(function(id, k) {
						if(cache[id]) {	
							$scope.results[k] = cache[id];
						} else {
							$scope.results[k] = {loading: true};

							$http.get('/api/community/' + id).success(function(community) {
								cache[id] = $scope.results[k] = community;
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
	});

	$routeProvider.when('/community/:id', {
		templateUrl: '/pages/community.html',
		controller: function($scope, $http, $routeParams, $rootScope, $q) {
			var cache = [];
			
			var getPromise = function(id) {
				if(!cache[id]) {
					var deferred = $q.defer();

					$http.get('/api/userdata/' + id).success(function(data) {
						deferred.resolve(data);
					});

					cache[id] = deferred.promise;
				}

				return cache[id];
			}
			
			$http.get('/api/community/' + $routeParams.id).success(function(community) {
				if(!community) {
					$scope.error = "Community not found";
					return
				}

				if(community.website)
					community.website = (community.website.match(/^[^:]+:\/\//) ? '' : 'http://') + community.website;
				
				community.feedback = {
					total: 0,
					good: 0,
					percent: 0
				}

				community.comments.forEach(function(comment) {
					comment.loading = true;

					if(comment.rating) {
						community.feedback.total++;
						
						if(comment.rating > 0)
							community.feedback.good++;
					}
					
					getPromise(comment.author).then(function(data) {
						comment.userdata = data;
					});
				});

				community.feedback.percent = Math.floor((community.feedback.good/community.feedback.total)*100);
				
				community.ownerName = 'Fetching...';

				getPromise(community.owner).then(function(data) {
					community.ownerName = data.displayName;
				});
				
				community.timeago = timeAgo(Math.floor((Date.now() - new Date(community.updated))/1000));
				
				community.servers.forEach(function(server) {
					server.fullip = (server.domain ? server.domain : server.ip) + ':' + server.port;
				});
				
				$scope.community = community;
				
				if($rootScope.user) {
					$scope.isOwner = community.owner == $rootScope.user.id;
					$scope.reviewmsg = $scope.isOwner ? 'Leave a comment' : 'Leave your feedback';
					
					$scope.postComment = function() {
						var commentbox = document.getElementById('commentbox');

						$scope.community.comments.unshift({
							author: $rootScope.user.id,
							time: Date.now(),
							comment: commentbox.value,
							userdata: $rootScope.userdata,
							rating: $scope.rating
						});

						if($scope.rating) {
							community.feedback.total++;
							
							if($scope.rating > 0)
								community.feedback.good++;
							
							community.feedback.percent = Math.floor((community.feedback.good/community.feedback.total)*100);
						}

						$http.post('/api/community/' + $routeParams.id + '/comment', {comment: commentbox.value, rating: $scope.rating});

						commentbox.value = '';
					}
				}
			});
			
			//get some stuff done while we're waiting for the community info
			if($rootScope.user) {
				var promise;
				
				if(!$rootScope.userdata)
					promise = getPromise($rootScope.user.id);
				else {
					var deferred = $q.defer(); //hate this
					promise = deferred.promise;
					deferred.resolve($rootScope.userdata);
				}
				
				promise.then(function(data) {
					$scope.faved = $rootScope.userdata.favorites.indexOf($routeParams.id) > -1;
					$scope.rating = 0;
					
					$scope.favemsg = $scope.faved ? 'Unfavorite' : 'Add to favorites';
					$scope.reviewmsg = $scope.isOwner ? 'Leave a comment' : 'Leave your feedback'; //have to set this twice because we don't know what order stuff'l go in
					
					$scope.setRating = function(rating) {
						$scope.rating = Math.max(Math.min(1, rating), -1);
						
						switch($scope.rating) {
							case -1:
								$scope.reviewmsg = 'I like this community!';
								break
							case 0:
								$scope.reviewmsg = 'Leave your feedback';
								break
							case 1:
								$scope.reviewmsg = 'I don\'t like this community!';
								break
						}
					}
					
					$scope.isRating = function(rating) {
						return $scope.rating == rating;
					}
					
					$scope.fave = function() {
						$scope.faved = !$scope.faved;

						$http.post('api/community/' + $routeParams.id + '/fave');
					}
				});
			};
		}
	});
});