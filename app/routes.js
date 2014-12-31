<<<<<<< HEAD
var passport = require('passport'),
	http = require('http'),
	Busboy = require('busboy'),
	path = require('path'),
	url = require('url'),
	dns = require('dns'),
	fs = require('fs'),
	chalk = require('chalk');
=======
var chalk = require('chalk');
>>>>>>> develop

var User = require('./models/user');

var lastIP,
	methods = {
		GET: true,
		HEAD: true,
		OPTIONS: true
	},
	fields = ['params', 'body'];

<<<<<<< HEAD
var options = {
	root: __dirname + '/../public/'
}

var handleError = function(err, req, res) {
	if(!err)
		return
	
	if(req) {
		if(lastIP !== req.ip) {
			lastIP = req.ip;

			console.log('\n' + chalk.bold(lastIP + ':'));
		}
		
		console.log(' ', chalk.bgRed(chalk.underline(chalk.bold('Error'), '@', timestamp(), ':')));
		console.log(' ', ' ', req.method, req.url);
	}
	
	if(err.stack)
		console.log(' ', ' ', chalk.red(err.stack));
	else
		console.log(' ', ' ', chalk.red(err.toString()));
	
	console.log('');
	
	//if(res)
		//res.redirect('/return?msg=error');
	
	return true
}

var addActivity = function(user, info, shouldSave) {
	info.time = Date.now();
	
	user.activity.unshift(info);
=======
var timestamp = function() {
	var now = new Date();
>>>>>>> develop
	
	return chalk.blue.bgWhite(now.getMonth() + '/' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds());
}

<<<<<<< HEAD
var addNotification = function(user, info, shouldSave) {
	info.unread = true;
	
	user.notifications.unshift(info);
	
	user.notifications = user.notifications.slice(0, 5);
	
	if(shouldSave) {
		user.save();
	}	
}

var timestamp = function() {
	var now = new Date();
	
	return chalk.blue(now.getMonth() + '/' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds());
}	

var lastIP;

module.exports = function(app) {
	var startTime = Date.now();
=======
module.exports = function(app) {
	process.on('uncaughtException', function(err) {
		console.log(chalk.red.bold('Error!'));
		
		if(err.stack)
			console.log(' ', chalk.red(err.stack));
		else
			console.log(' ', chalk.red(err.toString()));
		
		console.log('');
	});
>>>>>>> develop
	
	process.on('uncaughtException', function(err) {
		console.log(chalk.red.underline.bold('!!Uncaught exception!!'), '\n');
		handleError(err);
	});
	
	app.use(function(req, res, next) {
		if(!methods[req.method]) {
			if(lastIP !== req.ip) {
				lastIP = req.ip;

				console.log('\n' + chalk.bold(lastIP + ':'));
			}
<<<<<<< HEAD
			
			console.log(' ', '@', timestamp(), ':');
			console.log(' ', ' ', req.method, req.url);
=======
>>>>>>> develop
			
			console.log(' ', '@', timestamp(), ':');
			console.log(' ', ' ', req.method, req.url);
			
			fields.forEach(function(field) {
				var empty = true;
				
				for(var key in req[field]) {
					if(req[field].hasOwnProperty(key)) {
						empty = false;
						break
					}
				}
				
				if(!empty) {
					console.log(' ', ' ', ' ', field + ':', req[field]);
				}
			});
			
			console.log('');
		}
		
		//console.log(' ', timestamp(), req.method + ':', req.url);
		
		if(req.user) {
			User.findOne({id: req.user.id}, function(err, userdata) {
				if(err)
					throw err;
				
				if(userdata) {
					userdata.lastSeen = Date.now();
					userdata.save();
				}
			});
		}
		
		//res.cookie('XSRF-TOKEN', req.csrfToken());

		next();
	});
<<<<<<< HEAD

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
	
	app.get('/api/info', function(req, res) {
		var now = new Date(),
			ret = {startTime: startTime},
			amt = 0,
			len = 3;
		
		now.setMinutes(now.getMinutes() - 5);
		
		var addAndCheck = function(key, val) {
			ret[key] = val;
			
			if(++amt == len) {
				res.json(ret);
			}
		}
		
		User.find({}, function(err, users) {
			if(handleError(err, req, res))
				return
				
			addAndCheck('users', (users ? users.length : 0));
		});
		
		User.find({lastSeen: {$gt: now}}, function(err, active) {
			if(handleError(err, req, res))
				return
				
			addAndCheck('active', (active ? active.length: 0));
		});
		
		Server.find({}, function(err, servers) {
			if(handleError(err, req, res))
				return
				
			addAndCheck('servers', (servers ? servers.length : 0));
		});
	});

	app.get('/api/user', function(req, res) {
		res.json(req.user);
	});
	
	app.post('/api/clearNotifications', function(req, res) {
		if(!req.user) {
			res.end();
			return
		}
		
		User.findOne({id: req.user.id}, function(err, userdata) {
			if(handleError(err, req, res))
				return
				
			if(!userdata) {
				res.end()
				return
			}
				
			userdata.notifications.forEach(function(note, k) {
				note.unread = false;
			});
				
			userdata.markModified('notifications');
			
			userdata.save(function(err, saved) {
				if(handleError(err, req, res))
					return
				
				res.end();
			});
		});
	});			
	
	app.post('/api/users/:id/comment', function(req, res) {
		if(!req.user) {
			res.end();
			return
		}
		
		if(!req.body.comment.trim().length) {
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
			
			addNotification(userdata, {
				type: 'comment',
				label: 'profile',
				id: req.params.id
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
		var special = {
			amt: +(req.query.amt || 10),
			start: Math.max(+(req.query.start || 0), 0),
			sortBy: req.query.sortBy || 'added',
			reverse: !!req.query.reverse
		};
		
		var search = {};

		for(var key in req.query) {
			if(req.query.hasOwnProperty(key)) {
				if(!special.hasOwnProperty(key)) {
					search[key] = new RegExp('.*' + req.query[key].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + '.*', 'i');
				}
			}
		}

		Server.find(search, function(err, servers) {
			if(handleError(err, req, res))
				return
				
			servers.sort(function(a, b) {
				var field = special.sortBy;
				var x = (a[field] || 0);
				var y = (b[field] || 0);
				var ret = x < y ? 1 : x > y ? -1 : 0;
				
				ret *= special.reverse ? -1 : 1;
				
				return ret;
			});
			
			res.json({
				amt: servers.length,
				results: servers.slice(special.start, special.start + special.amt).map(function(v) {return v._id})
			});
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
				
				switch(req.body.act) { //just in case I guess?
					case('fave'):
						if(favorites[id]) {
							delete favorites[id];
							server.favorites--;
						} else {
							favorites[id] = true;
							server.favorites++;
						}
						
						break
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
				}
				
				userdata.favorites = JSON.stringify(favorites);
				
				if(info) {
					addActivity(userdata, info);
				}
				
				userdata.save();
				
				server.save();
				
				res.end();
			});
		});
	});
	
	app.post('/api/servers/:id/comment', function(req, res) {
		if(!req.user) {
			res.end();
			return
		}
		
		if(!req.body.comment.trim().length) {
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
				comment: req.body.comment.trim(),
				rating: req.body.rating
			});
			
			server.save(function(err) {
				if(handleError(err, req, res))
					return
			});
			
			User.findOne({id: server.owner}, function(err, user) {
				if(handleError(err, req, res))
					return
					
				addNotification(user, {
					type: 'comment',
					label: 'server',
					id: req.params.id
				}, true);
			});
			
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
							owner: req.user.id,
							added: new Date()
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
=======
	
	app.use('/', require('./routes/auth'));
	app.use('/', require('./routes/api'));
	app.use('/', require('./routes/users'));
	app.use('/', require('./routes/communities'));
	app.use('/', require('./routes/forms'));
>>>>>>> develop

	app.get('*', function(req, res) {
		res.cookie('XSRF-TOKEN', req.csrfToken());
		
		res.sendFile('/views/index.html', {root: __dirname});
	});
}