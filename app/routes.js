var passport = require('passport'),
	http = require('http'),
	async = require('async'),
	Busboy = require('busboy'),
	path = require('path'),
	url = require('url'),
	dns = require('dns'),
	fs = require('fs');

var Server = require('./models/server'),
	User = require('./models/user');

var config = require('../config');

var options = {
	root: __dirname + '/../public/'
}

var handleError = function(err, req, res) {
	if(!err)
		return
	
	console.log('!', req.ip, req.method, req.url);
	console.log('!', err.toString());
	
	if(err.stack)
		console.log('!', err.stack);
	
	//if(res)
		//res.redirect('/return?msg=error');
	
	return true
}

var addActivity = function(user, info, shouldSave) {
	info.time = Date.now();
	
	user.activity.unshift(info);
	
	user.activity = user.activity.slice(0, config.activityLength);
	
	if(shouldSave) {
		user.save();
	}	
}

var sortServers = function() {
	Server.find({}, function(err, servers) {
		if(handleError(err))
			return
		
		if(!servers)
			return
		
		servers.sort(function(a, b) {
			return (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down);
		});

		servers.forEach(function(server, rank) {
			server.rank = parseInt(rank) + 1;

			server.save();
		});
	});
}

var lastIP;

module.exports = function(app) {
	var startTime = Date.now();
	
	app.use(function(req, res, next) {
		if(req.method != 'GET') {
			if(lastIP !== req.ip) {
				lastIP = req.ip;

				console.log('\n*', lastIP + ':');
			}

			console.log(' ', req.method, req.url);
			
			['params', 'body'].forEach(function(field) {
				var empty = true;
				
				for(var key in req[field]) {
					if(req[field].hasOwnProperty(key)) {
						empty = false;
						break
					}
				}
				
				if(!empty) {
					console.log(' ', ' ', field + ':', req[field]);
				}
			});
		}
		
		req.socket.setMaxListeners(0);
		
		req.socket.once('timeout', function() {
			//handleError('ETIMEDOUT', req, res);
			return
		});
		
		req.socket.once('error', function(err) {
			handleError(err, req, res);
			return
		});
		
		if(req.user) {
			User.findOne({id: req.user.id}, function(err, userdata) {
				if(handleError(err, req, res))
					return
				
				if(userdata) {
					userdata.lastSeen = Date.now();

					userdata.save();
				}
			});
		}

		next();
	});

	//user 

	app.get('/login', 
		passport.authenticate('steam', {failureRedirect: '/login'})
	);

	app.get('/login/return',
		passport.authenticate('steam', {failureRedirect: '/login'}),
		function(req, res) {
			/* 
			http.get('http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?' +
					'key=' + config.apiKey + '&' +
					'steamid=' + req.user.id + '&' + 
					'input_json={' + 
						'appids_filter: [4000]' +
					'}&' +
					'format=json',
				function(gres) {
					var body = '';

					gres
					.on('data', function(chunk) {
						body += chunk;
					})

					.on('end', function() {
						var json = JSON.parse(body);

						res.json(json);
					});
			}); */
		
			User.findOne({id: req.user.id}, function(err, userdata) {
				if(handleError(err, req, res))
					return
				
				if(!userdata) {
					userdata = new User({
						id: req.user.id,
						firstSeen: Date.now()
					}).save();
				}
			});

			res.redirect('/return?msg=logged_in');
		}
	);

	app.get('/logout', function(req, res){
		req.logout();

		res.redirect('/return?msg=logged_out');
	});
	
	app.get('/api/status', function(req, res) {
		res.json({
			startTime: startTime
		});
	});

	app.get('/api/user', function(req, res) {
		res.json(req.user);
	});
	
	app.post('/api/users/:id/comment', function(req, res) {
		if(!req.user) {
			res.end();
			return
		}
		
		User.findOne({id: req.params.id}, function(err, userdata) {
			if(handleError(err, req, res))
				return
			
			if(!userdata) { // || userdata.id == req.user.id) {
				res.end();
				return
			}
			
			userdata.comments.unshift({
				author: req.user.id,
				time: Date.now(),
				comment: req.body.comment
			});
			
			userdata.save(function(err, saved) {
				if(handleError(err, req, res))
					return
				
				res.json(saved);
			});
		});
	});		

	app.get('/api/userdata/:id?', function(req, res) {
		if(!(req.params.id || req.user)) {
			res.end();
			return
		}
		
		req.params.id = req.params.id || req.user.id;

		User.findOne({id: req.params.id}, function(err, userdata) {
			if(handleError(err, req, res))
				return
			
			if(!userdata) {
				res.end();
				return
			}
            
            if(userdata.needsUpdate()) {
                http.get('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?' +
                         'key=' + config.apiKey + '&' +
                         'steamids=' + req.params.id,
                    function(steamRes) {
                        steamRes.on('data', function(chunk) {
                            var json = JSON.parse(chunk);
                            var data = json.response.players[0];
                            
                            if(!data || userdata.id !== data.steamid) { //vulnerability maybe?
                                res.end();
                                return
                            }
                            
                            userdata.displayName = data.personaname;
							userdata.avatar = data.avatarfull;
                            userdata.updated = Date.now();
                            
                            userdata.save(function(err) {
								if(handleError(err, req, res))
									return
                                
                                res.json(userdata);
                            });
                        });
                    }
                );
            } else {
                res.json(userdata);
            }
		});
	});

	//servers

	app.get('/api/servers/', function(req, res) {
		req.query.amt = +(req.query.amt || 10);
		req.query.start = Math.max(+(req.query.start || 0), 0);
		var search = {};

		for(var key in req.query) {
			if(key !== 'amt' && key !== 'start') {
				search[key] = new RegExp('.*' + req.query[key] + '.*', 'i');
			}
		}

		Server.find(search, function(err, servers) {
			if(handleError(err, req, res))
				return
				
			servers.sort(function(a, b) {
				return a.rank - b.rank;
			});
			
			res.json({
				amt: servers.length,
				results: servers.slice(req.query.start, req.query.start + req.query.amt).map(function(v) {return v._id})
			});
			
			/*

			res.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked'
			});

			res.write('[');

			var count = 0;
			var addToRes = function(server) {
				res.write((count++ > 0 ? ', ' : '') + JSON.stringify(server));
			}

			if(servers.length > 0) {
				async.each(servers.slice(0, req.query.amt), function(server, cb) {
					if(server.needsUpdate()) {
						server.getInfo(function(err, info) {
							delete server.error;

							if(err) {
								server.error = err;
								server.updated = Date.now();
							} else {
								for(var key in info) {
									if(info.hasOwnProperty(key)) {
										server[key] = info[key];
									}
								}
							}

							server.save(function(err) {
								if(err)
									throw err;

								addToRes(server);

								cb();
							});
						});
					} else {
						addToRes(server);

						cb();
					}
				}, function(err) {
					if(err)
						throw err;

					res.end(']');
				});
			} else {
				res.end(']');
			}
			
			*/
		});
	});

	app.get('/api/servers/:id', function(req, res) {
		Server.findOne({_id: req.params.id}, function(err, server) {
			if(handleError(err, req, res))
				return

			if(!server) {
				res.end();
				return
			}

			if(server.needsUpdate()) {
				server.getInfo(function(err, info) {
					server.error = null;

					if(err) {
						server.error = err;
						server.updated = Date.now();
					} else {
						for(var key in info) {
							if(info.hasOwnProperty(key)) {
								server[key] = info[key];
							}
						}
					}

					server.save(function(err) {
						if(handleError(err, req, res))
							return

						res.json(server);
					});
				});
			} else {
				res.json(server);
			}
		});
	});
	
	app.post('/api/servers/:id', function(req, res) {
		if(!req.user) {
			res.end();
			return
		}
		
		var id = req.params.id;
		
		Server.findOne({_id: id}, function(err, server) {
			if(handleError(err, req, res))
				return
			
			if(!server) { // || server.owner == req.user.id) {
				res.end();
				return
			}
			
			User.findOne({id: req.user.id}, function(err, userdata) {
				if(handleError(err, req, res))
					return
				
				var favorites = JSON.parse(userdata.favorites);
				var votes = JSON.parse(userdata.votes);
				var vote = votes[id];
				
				switch(req.body.act) {
					case('fave'):
						if(favorites[id]) {
							delete favorites[id];
							server.favorites--;
						} else {
							favorites[id] = true;
							server.favorites++;
						}
						
						break
						
					case('upVote'):
						if(vote && vote > 0) {
							delete votes[id];
							server.votes.up--;
						} else {
							/* if(vote && vote < 0) {
								server.votes.down--;
							} */
							
							votes[id] = 1;
							server.votes.up++;
						}
						
						break
					
					/* case('dnVote'):
						if(vote && vote < 0) {
							delete votes[id];
							server.votes.down--;
						} else {
							if(vote && vote > 0) {
								server.votes.up--;
							}
							votes[id] = -1;
							server.votes.down++;
						}
						
						break */
				}
				
				var info;
				
				if(req.body.act == 'fave') {
					if(favorites[id]) {
						info = {
							type: 'fave',
							action: 'add',
							id: id
						}
					}
				} else {
					if(votes[id]) {
						info = {
							type: 'vote',
							action: 'add', //(votes[id] > 0 ? 'add' : 'delete'),
							id: id
						}
					}
				}
				
				userdata.favorites = JSON.stringify(favorites);
				userdata.votes = JSON.stringify(votes);
				
				if(info) {
					addActivity(userdata, info);
				}
				
				userdata.save(function(err) {
					if(handleError(err, req, res))
						return
				});
				
				server.save(function(err, saved) {
					if(handleError(err, req, res))
						return
					
					sortServers();
				});
				
				res.end();
			});
		});
	});
	
	app.post('/api/servers/:id/comment', function(req, res) {
		if(!req.user) {
			res.end();
			return
		}
		
		Server.findOne({_id: req.params.id}, function(err, server) {
			if(handleError(err, req, res))
				return
			
			if(!server) {
				res.end();
				return
			}
			
			server.comments.unshift({
				author: req.user.id,
				time: Date.now(),
				comment: req.body.comment
			});
			
			server.save();
			res.end();
		});
	});	
	
	app.delete('/api/servers/:id', function(req, res) {
		if(!req.user) {
			res.end('/return?msg=log_in&location=' + encodeURIComponent('/login'));
			return
		}
		
		Server.findOne({_id: req.params.id}, function(err, server) {
			if(handleError(err, req, res))
				return
			
			if(!server) {
				res.end();
				return
			}
			
			if(server.owner !== req.user.id) {
				res.end('/return?msg=not_owner&location=' + encodeURIComponent('/servers/' + server._id));
				return;
			}
			
			server.remove(function(err, server) {
				if(handleError(err, req, res))
					return
				
				User.findOne({id: req.user.id}, function(err, userdata) {
					if(handleError(err, req, res))
						return
					
					if(!userdata)
						return //this should never happen
						
					var idof = userdata.servers.indexOf(server._id);
					
					while(idof > -1) {
						userdata.servers.splice(idof, 1);
						
						idof = userdata.servers.indexOf(server._id);
					}
						
					addActivity(userdata, {
						type: 'server',
						action: 'delete',
						name: server.name
					}, true);
				});

				console.log(' ', 'Server', server.ip + ':' + server.port, '(' + (server.domain ? server.domain + ':' + server.port : ' ') + ')', 'removed');
				
				res.end('/return?msg=server_deleted');
			});
		});
	});

	//form handling
    
    /*  todo: authenticate this, don't allow posting to servers/new without token 
		possible exploit: filename.exe
			real talk though, ip: ../../../?, port: config, filename: .js
	*/

	app.post('/servers/new', function(req, res) {
		if(!req.user) {
			res.redirect('/return?msg=log_in&location=' + encodeURIComponent('/login'));
			return
		}

		var busboy = new Busboy({headers: req.headers});
		var data = {},
			files = {};

		busboy
			.on('field', function(field, val) {
				if(val)
					data[field] = val;
			})

			.on('file', function(field, file, filename, encoding, mimetype) {
				files[field] = {
					'filename': filename,
					'encoding': encoding,
					'mimetype': mimetype,
					'data': []
				}

				file
					.on('data', function(chunk) {
						files[field].data.push(chunk);
					})

					.on('end', function() {
						files[field].data = Buffer.concat(files[field].data);
					});
			})

			.on('finish', function() {
				data.ip = (data.ip.match(/^[^:]+:\/\//) ? '' : 'http://') + data.ip;

				data.ip = url.parse(data.ip).hostname;
				data.port = +(data.port || 27015);
			
				if(data.port < 0 || data.port > 65536) {
					res.redirect('/return?msg=error&location=' + encodeURIComponent('/servers/new'));
					return
				}

				dns.lookup(data.ip, 4, function(err, ip) {
					if(handleError(err, req, res))
						return

					if(!ip) {
						res.redirect('/return?msg=server_offline&location=' + encodeURIComponent('/servers/new'));
						return
					}
					
					if(ip !== data.ip) {
						data.domain = data.ip;
						data.ip = ip;
					}

					Server.findOne({ip: data.ip, port: data.port}, function(err, server) {
						if(handleError(err, req, res))
							return

						if(server) {
							res.redirect('/return?msg=already_exists&location=' + encodeURIComponent('/servers/' + server._id));
							return
						}
						
						/* possible exploit
							data.ip = '../'
						*/

						var file = files.banner;
						
						if(!file || file.mimetype.search('image/.*') < 0) {
							res.redirect('/return?msg=no_file&location=' + encodeURIComponent('/servers/new'));
							return
						}

						var newServer = new Server({
							name: data.name,
							description: data.desc,
							website: data.website,
							fileext: path.extname(file.filename),
							domain: data.domain,
							ip: data.ip,
							port: data.port,
							owner: req.user.id
						});

						User.findOne({id: req.user.id}, function(err, user) {
							if(handleError(err, req, res))
								return

							if(!user)
								return; //this should never happen

							user.servers.unshift(newServer._id);

							addActivity(user, {
								type: 'server',
								action: 'add',
								name: data.name,
								id: newServer._id
							}, true);
						});

						newServer.save(function(err) {
							if(handleError(err, req, res))
								return

							console.log(' ', 'Server', data.ip + ':' + data.port, '(' + (data.domain ? data.domain + ':' + data.port : ' ') + ')', 'saved');
							
							var filename = path.normalize('banners/' + newServer._id + path.extname(file.filename));
							var filepath = path.join(__dirname, '/../public/', filename);

							fs.writeFile(
								filepath,
								file.data,
								function() {
									console.log(' ', filename, 'saved');
								}
							);
							
							sortServers();

							res.redirect('/return?msg=server_added&location=' + encodeURIComponent('/servers/' + newServer._id));
						});
					});
				});
			});

		req.pipe(busboy);
	});
	
	app.post('/servers/:id/edit', function(req, res) {
		if(!req.user) {
			res.redirect('/return?msg=log_in&location=' + encodeURIComponent('/login'));
			return
		}
		
		Server.findOne({_id: req.params.id}, function(err, server) {
			if(handleError(err, req, res))
				return
			
			if(!server) {
				res.end();
				return
			}
			
			if(server.owner !== req.user.id) {
				res.redirect('/return?msg=not_owner&location=' + encodeURIComponent('/login'));
				return
			}
			
			var busboy = new Busboy({headers: req.headers});
			var data = {},
				files = {};

			busboy
				.on('field', function(field, val) {
					if(val)
						data[field] = val;
				})

				.on('file', function(field, file, filename, encoding, mimetype) {
					files[field] = {
						'filename': filename,
						'encoding': encoding,
						'mimetype': mimetype,
						'data': []
					}

					file
						.on('data', function(chunk) {
							files[field].data.push(chunk);
						})

						.on('end', function() {
							files[field].data = Buffer.concat(files[field].data);
						});
				})

				.on('finish', function() {
					data.ip = (data.ip.match(/^[^:]+:\/\//) ? '' : 'http://') + data.ip;

					data.ip = url.parse(data.ip).hostname;
					data.port = +(data.port || 27015);
			
					if(data.port < 0 || data.port > 65536) {
						res.redirect('/return?msg=error&location=' + encodeURIComponent('/servers/new'));
						return
					}

					dns.lookup(data.ip, 4, function(err, ip) {
						if(handleError(err, req, res))
							return

						if(!ip) {
							res.redirect('/return?msg=server_offline&location=' + encodeURIComponent('/servers/new'));
							return
						}
						
						if(ip !== data.ip) {
							data.domain = data.ip;
							data.ip = ip;
						}

						Server.findOne({ip: data.ip, port: data.port}, function(err, dupe) {
							if(handleError(err, req, res))
								return

							if(dupe && dupe._id != req.params.id) {
								console.log(typeof dupe._id, dupe._id);
								console.log(typeof req.params.id, req.params.id);
								console.log(dupe._id == req.params.id);
								
								res.redirect('/return?msg=already_exists&location=' + encodeURIComponent('/servers/' + server._id));
								return
							}

							/* possible exploit
								data.ip = '../'
							*/

							var file = files.banner;

							if(file.filename) {
								if(file.mimetype.search('image/.*') < 0) {
									res.redirect('/return?msg=no_file&location=' + encodeURIComponent('/servers/new'));
									return
								}
								
								var filename = path.normalize('banners/' + server._id + path.extname(file.filename));
								var filepath = path.join(__dirname, '/../public/', filename);
								
								if(fs.existsSync(filepath)) {
									fs.unlink(filepath, function(err) {
										if(handleError(err, req, res))
											return
									});
								}

								server.fileext = path.extname(file.filename);
							}

							server.name = data.name;
							server.description = data.desc;
							server.website = data.website;
							server.domain = data.domain;
							server.ip = data.ip;
							server.port = data.port;

							server.save(function(err) {
								if(handleError(err, req, res))
									return

								console.log(' ', 'Server', data.ip + ':' + data.port, '(' + (data.domain ? data.domain + ':' + data.port : ' ') + ')', 'saved');

								if(file.filename) {
									fs.writeFile(
										filepath,
										file.data,
										function() {
											console.log(' ', filename, 'saved');
										}
									);
								}

								res.redirect('/return?msg=server_updated&location=' + encodeURIComponent('/servers/' + server._id));
							});
						});
					});
				});

			req.pipe(busboy);
		});
	});

	//everything else

	app.get('*', function(req, res) {
		res.sendFile('/views/index.html', options);
	});
}