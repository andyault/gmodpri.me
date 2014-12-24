var express = require('express'),
	busboy = require('busboy');

var User = require('../models/user'),
	Community = require('../models/community');

var router = express.Router();

var handleForm(req, cb) {
	var busboy = new Busboy({headers: req.headers});
	var data = {},
		files = {},
		servers = [],
		curServer;

	busboy
		.on('field', function(field, val) {
			if(val) {
				if(field == 'servernum')
					servers[val] = curServer = {};
				else if(field.search(/^server/) > -1)
					curServer[field.replace(/^server/, '')] = val;
				else
					data[field] = val;
			}
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
			cb(data, files, server);
		});

	req.pipe(busboy);
}

router.post('/community/new', function(req, res) {
	if(!req.user) {
		res.redirect('/return?msg=log_in&location=' + encodeURIComponent('/login'));
		return
	}
	
	handleForm(req, function(data, files, servers) {
		var checked = 0;

		servers.forEach(function(server) {
			server.ip = (server.ip.match(/^[^:]+:\/\//) ? '' : 'http://') + server.ip;

			server.ip = url.parse(server.ip).hostname;
			server.port = +(server.port || 27015);

			if(server.port < 0 || server.port > 65536) {
				res.redirect('/return?msg=error&location=' + encodeURIComponent('/community/new'));
				return
			}

			dns.lookup(server.ip, 4, function(err, ip) {
				if(err)
					throw err;

				if(!ip) {
					res.redirect('/return?msg=server_offline&location=' + encodeURIComponent('/community/new'));
					return
				}

				if(ip !== server.ip) {
					server.domain = server.ip;
					server.ip = ip;
				}

				addAndCheck();
			});
		});

		var addAndCheck = function() {
			if(++checked == servers.length) {
				//make sure we're not adding the same ip twice
				
				var ips = {};

				servers.forEach(function(server) {
					if(!ips[server.ip + server.port])
						ips[server.ip + server.port] = true;
					else {
						res.redirect('/return?msg=error&location=' + encodeURIComponent('/servers/new'));
						return
					}
				});

				delete ips;

				Community.find({}, function(err, communities) {
					if(err)
						throw err;
					
					//make sure no one else has any of our servers

					communities.forEach(function(community) {
						community.servers.forEach(function(server) {
							servers.forEach(function(myserver) {
								if(server.ip == myserver.ip && server.port == myserver.port) {
									res.redirect('/return?msg=already_exists&location=' + encodeURIComponent('/servers/' + community._id));
									return
								}
							});
						});
					});

					var file = files.banner;

					if(!file || file.mimetype.search('image/.*') < 0) {
						res.redirect('/return?msg=no_file&location=' + encodeURIComponent('/servers/new'));
						return
					}

					var newCommunity = new Community({
						name: data.name,
						description: data.desc,
						fileext: path.extname(file.filename),
						website: data.website,
						owner: req.user.id,
						servers: servers,
						added: new Date()
					});

					User.findOne({id: req.user.id}, function(err, user) {
						if(err)
							throw err;

						user.servers.unshift(newCommunity._id);

						addActivity(user, {
							type: 'server',
							action: 'add',
							name: data.name,
							id: newCommunity._id
						}, true);
					});

					newCommunity.save(function(err) {
						if(err)
							throw err;

						console.log(' ', 'Community', newCommunity.name, 'saved:');
						
						newCommunity.servers.forEach(function(server) {
							console.log(' ', ' ', server.ip + ':' + server.port, server.domain ? '(' + server.domain + ':' + server.port + ')' : '');
						});
						
						var filepath = path.join(process.cwd(), '/public/banners/', newServer._id + newCommunity.fileext);

						fs.writeFile(filepath, file.data);

						res.redirect('/return?msg=server_added&location=' + encodeURIComponent('/servers/' + newServer._id));
					});
				});
			}
		}
	});
});

router.post('/servers/:id/edit', function(req, res) {
	if(!req.user) {
		res.redirect('/return?msg=log_in&location=' + encodeURIComponent('/login'));
		return
	}
	
	handleForm(req, function(data, files, servers) {
		var checked = 0;

		servers.forEach(function(server) {
			server.ip = (server.ip.match(/^[^:]+:\/\//) ? '' : 'http://') + server.ip;

			server.ip = url.parse(server.ip).hostname;
			server.port = +(server.port || 27015);

			if(server.port < 0 || server.port > 65536) {
				res.redirect('/return?msg=error&location=' + encodeURIComponent('/servers/new'));
				return
			}

			dns.lookup(server.ip, 4, function(err, ip) {
				if(err)
					throw err;

				if(!ip) {
					res.redirect('/return?msg=server_offline&location=' + encodeURIComponent('/servers/new'));
					return
				}

				if(ip !== server.ip) {
					server.domain = server.ip;
					server.ip = ip;
				}

				addAndCheck();
			});
		});

		var addAndCheck = function() {
			if(++checked == servers.length) {
				//make sure we're not adding the same ip twice
				
				var ips = {};

				servers.forEach(function(server) {
					if(!ips[server.ip + server.port])
						ips[server.ip + server.port] = true;
					else {
						res.redirect('/return?msg=error&location=' + encodeURIComponent('/servers/new'));
						return
					}
				});

				delete ips;

				Community.find({}, function(err, communities) {
					if(err)
						throw err;
					
					//make sure no one else has any of our servers

					communities.forEach(function(community) {
						community.servers.forEach(function(server) {
							servers.forEach(function(myserver) {
								if(server.ip == myserver.ip && server.port == myserver.port) {
									res.redirect('/return?msg=already_exists&location=' + encodeURIComponent('/servers/' + community._id));
									return
								}
							});
						});
					});

					var file = files.banner;

					if(!file || file.mimetype.search('image/.*') < 0) {
						res.redirect('/return?msg=no_file&location=' + encodeURIComponent('/servers/new'));
						return
					}

					var newCommunity = new Community({
						name: data.name,
						description: data.desc,
						fileext: path.extname(file.filename),
						website: data.website,
						owner: req.user.id,
						servers: servers,
						added: new Date()
					});

					User.findOne({id: req.user.id}, function(err, user) {
						if(err)
							throw err;

						user.servers.unshift(newCommunity._id);

						addActivity(user, {
							type: 'server',
							action: 'add',
							name: data.name,
							id: newCommunity._id
						}, true);
					});

					newCommunity.save(function(err) {
						if(err)
							throw err;

						console.log(' ', 'Community', newCommunity.name, 'saved:');
						
						newCommunity.servers.forEach(function(server) {
							console.log(' ', ' ', server.ip + ':' + server.port, server.domain ? '(' + server.domain + ':' + server.port + ')' : '');
						});
						
						var filepath = path.join(process.cwd(), '/public/banners/', newServer._id + newCommunity.fileext);

						fs.writeFile(filepath, file.data);

						res.redirect('/return?msg=server_added&location=' + encodeURIComponent('/servers/' + newServer._id));
					});
				});
			}
		}
	});
});

/* router.post('/servers/:id/edit', function(req, res) {
	if(!req.user) {
		res.redirect('/return?msg=log_in&location=' + encodeURIComponent('/login'));
		return
	}

	Server.findOne({_id: req.params.id}, function(err, server) {
		if(err)
			throw err;

		if(!server) {
			res.end();
			return
		}

		if(server.owner !== req.user.id) {
			res.redirect('/return?msg=not_owner&location=' + encodeURIComponent('/login'));
			return
		}

		handleForm(req, function(data, files, servers) {
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
	});
}); */

module.exports = router;