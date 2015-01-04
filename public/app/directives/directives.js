var app = angular.module('directives', []);

app.directive('communityView', ['$q', function($q) {
	return {
		restrict: 'E',
		templateUrl: 'app/directives/communityView.html',
		link: function(scope, elem) {
			var community = scope.community;
			
			community.deferred = $q.defer();
			
			community.deferred.promise.then(function(data) {
				community = scope.community = data;

				var feedback = {total: 0, good: 0},
					players = 0;

				community.comments.forEach(function(comment) {
					if(comment.rating) {
						feedback.total++;

						if(comment.rating > 0)
							feedback.good++;
					}
				});

				if(feedback.total) {
					var percent = Math.floor((feedback.good/feedback.total)*100);
					community.feedback = percent + '%';

					var feedback = elem[0].getElementsByClassName('badge')[0];
					feedback.style.backgroundColor = 'hsl(' + percent * 1.2 + ', 55%, 55%)';
				}

				community.servers.forEach(function(server) {
					players += server.numPlayers;
				});

				community.playermsg = (players || 0) + ' player' + (players !== 1 ? 's' : '');

				community.serversmsg = community.servers.length + ' server' + (community.servers.length > 1 ? 's' : '');
			});
			
			if(!community.loading)
				community.deferred.resolve(community);
		}
	};
}]);

app.directive('commentView', ['$http', function($http) {
	return {
		restrict: 'E',
		templateUrl: 'app/directives/commentView.html',
		link: function(scope, elem) {
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
			
			if(scope.user)
				scope.isAuthor = scope.user.id == scope.comment.author;
			
			scope.delete = function() {
				if(scope.community) {
					$http.delete('/api/community/' + scope.community._id + '/comment/' + scope.comment.id);
					scope.community.comments.splice(scope.comment.id, 1);
					
					scope.community.comments.forEach(function(comment, id) {
						comment.id = id;
					});
				}				
			}
		}
	};
}]);