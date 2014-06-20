(function (window, angular, _, undefined) {

	// Define mtc module
	angular.module('mtc', ['angular-oauth2']);
	angular.module('mtc').constant('mtc.version', '0.0.1');
	angular.module('mtc').constant('mtc.location.prefix.key', '8a5e67e4-be4b-404b-bd55-811128aca6ba');

	function UrlProvider() {

		var apps = {}, config = {},
			envs = ['prod', 'stage', 'test', 'beta', 'dev'];

		config.register = function (name, config) {

			// Verify config doesn't have any weird stuff
			for (var env in config) {
				if (!~envs.indexOf(env))
					throw new Error('Invalid environment type found: ' + env);
			}

			// Verify no collisions
			if (angular.isDefined(apps[name]))
				throw new Error('App: ' + name + ' has already been registered');

			apps[name] = {};
			apps[name].config = config;
		};

		var service = ['LDSUser', '$q', function (User, $q) {

			var factory = {};

			function getEnvironment(name) {

				var defer = $q.defer();

				if (!angular.isDefined(apps[name]))
					defer.reject('App: ' + name + ' is not registered');

				if (angular.isDefined(apps[name].env)) {
					defer.resolve(apps[name].env);
					return defer.promise;
				}

				User.init.then(function (user) {
					defer.resolve(user.environment);
				}, function (rejection) {
					defer.reject(rejection);
				});

				return defer.promise;
			}

			factory.getPrefix = function (name) {

				var defer = $q.defer();
				var envProm = getEnvironment(name);
				envProm.then(function (env) {
					if (!angular.isDefined(apps[name].config[env]))
						defer.reject(env + ' was not found for ' + name);
					defer.resolve(apps[name].config[env]);
				}, function (err) {
					defer.reject(err);
				});

				return defer.promise;
			};

			return factory;
		}];

		config.$get = service;
		
		return config;
	}

	angular.module('mtc').provider('mtc.api.url', UrlProvider);

	function Config($oauth2, Url, locationKey) {

		$oauth2.configure({
			'scope': 'https://api.mtc.byu.edu/auth https://api.mtc.byu.edu/personnel https://api.mtc.byu.edu/mtc'
		});

		var locationPrefixes = {
			'beta': 'http://localhost:8080/newpersonnel/employees/',
			'test': 'http://tallbeta.mtc.byu.edu/newpersonnel/v1/employees/',
			'prod': 'http://tallbeta.mtc.byu.edu/newpersonnel/v1/employees/' // This will fail in prod currently
		};

		Url.register(locationKey, locationPrefixes);
	}

	angular.module('mtc').config(['$oauth2Provider', 'mtc.api.urlProvider', 'mtc.location.prefix.key', Config]);

	function UserService($oauth2, $http, authKey, $window) {

		var oauthUser = 'https://auth.mtc.byu.edu/oauth2/tokeninfo?access_token=',
			userInfo = {},
			logoutUrl = 'https://auth.mtc.byu.edu/oauth2/logout';

		var User = {};
		User.init = $oauth2.tokenAvailable.then(function (token) {
			return $http.get(oauthUser + token['access_token']);
		}).then(function (response) {
			userInfo = response.data.user;
			userInfo.audience = response.data.audience;
			userInfo.environment = response.data.environment;

			var locations = [];
			for (var i = userInfo.roles.length - 1; i >= 0; i--) {
				var role = userInfo.roles[i];
				if (role.indexOf('mtc-locations-') === 0) { // Role is prefixed with this
					locations.push(role.substring('mtc-locations-'.length));
				}
			}
			userInfo.locations = locations;

			return userInfo;
		});

		User.hasRole = function (role) {
			if (!userInfo.roles)
				throw new Error('User roles is undefined');
			return !!~userInfo.roles.indexOf(role);
		};

		User.logout = function () {
			// Remove token, make sure user has been defined
			User.init.then(function (user) {
				delete $window.sessionStorage[authKey + '-' + user.audience];
				$window.location.href = logoutUrl;
			});
		};

		return User;
	}

	angular.module('mtc').factory('LDSUser', ['$oauth2', '$http', 'oauth2-key', '$window', UserService]);

	function MTCLocation(User, $http, $q, $scope, $injector, Url, locationKey) {

		var location = {},
			mtcUrl = 'https://api.mtc.byu.edu/mtc/v1/mtcs',
			mtcs = $http.get(mtcUrl),
			selected;

		location.setMtc = function (mtcId) {

			var mtcDefer = $q.defer();
			location.available = mtcDefer.promise;

			if (angular.isDefined(mtcId) && mtcId !== null) {
				$scope.$broadcast('LDSLocation.updated');
				mtcDefer.resolve(selected = mtcId);

				if ($injector.has('$route'))
					$injector.get('$route').reload();

			} else {

				$q.all({
					'prefix': Url.getPrefix(locationKey),
					'user': User.init
				}).then(function (resolved) {
					$http.get(resolved.prefix + resolved.user.id + '/defaultmtc')
					.success(function (employee) {
						mtcDefer.resolve(selected = employee.defaultMtc || resolved.user.locations[0]);
					})
					.error(function () {
						mtcDefer.resolve(selected = resolved.user.locations[0]);
					});
				});
			}

			return location.available;
		};

		location.getMtc = function () {

			var mtcDefer = $q.defer();

			$q.all({
				'location': location.available,
				'mtcs': mtcs
			}).then(function (resolved) {
				var list = resolved.mtcs.data;
				for (var i = 0; i < list.length; i++) {
					if (angular.equals(selected, list[i].id)) {
						mtcDefer.resolve(list[i]);
						return;
					}
				}

				mtcDefer.resolve({'id': selected});
			});

			return mtcDefer.promise;
		};

		location.setMtc();

		return location;
	}

	angular.module('mtc').factory('mtc.location',
		['LDSUser', '$http', '$q', '$rootScope', '$injector', 'mtc.api.url', 'mtc.location.prefix.key', MTCLocation]);

	function MtcResourceService($http, $q, Url, Loc) {

		var requestOptions = ['query', 'get', '$get', '$save', '$update', '$delete'];
		var requestMethods = {
			'query': 'GET',
			'get': 'GET',
			'$get': 'GET',
			'$save': 'POST',
			'$update': 'PUT',
			'$delete': 'DELETE'
		};
		var validMethods = ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'];
		var bodyMethods = ['$save', '$update', '$delete', 'PUT', 'POST', 'DELETE', 'PATCH'];

		function validMethod(method) {
			if (!~validMethods.indexOf(method))
				throw new Error('Invalid request type: ' + method);
			return method;
		}

		function replacePath(params, url, passedParams) {
			passedParams = passedParams || {};
			var regex = /\/:([\w\d]+)[\/]?/g, path = angular.copy(url), match;
			while ((match = regex.exec(path))) {
				path = path.replace(':' + match[1], params[match[1]] || ':' + match[1]);
				if (params[match[1]])
					delete passedParams[match[1]]; // Don't reuse as a query param
			}
			if ((match = regex.exec(path))) // If some params weren't supplied, chop the url
				path = path.substring(0, match.index);
			return path;
		}

		function parameterize(params) {
			var path = '';
			for (var key in params) {
				if (params.hasOwnProperty(key)) {
					path += '?';
					if (path.length > 1)
						path += '&';
					path += key + '=' + params[key];
				}
			}
			return path;
		}

		function doRequest(path, value, method, Const, successFn, errorFn) {
			var defer = $q.defer();
			value.$promise = defer.promise;
			var reqMethod = requestMethods[method] || validMethod(method);
			var httpConfig = {
				url: path,
				method: reqMethod
			};
			if (~bodyMethods.indexOf(method)) httpConfig.data = value;
			$http(httpConfig).then(function success(response) {

				if (angular.isArray(value) && !angular.isArray(response.data) ||
					!angular.isArray(value) && angular.isArray(response.data))
					throw new Error('Saw Array or Object as response while expecting the other, try a get instead of query or vice versa');

				if (angular.isArray(value)) {
					angular.forEach(response.data, function (item) {
						value.push(new Const(item));
					});
				} else {
					angular.extend(value, response.data);
				}
				defer.resolve(value);
				(successFn || angular.noop)(value);
				value.$resolved = true;
			}, function error(err) {
				defer.reject(err);
				(errorFn || angular.noop)(value);
			});
		}

		function ResourceBuilder(url, Constructor, options, apiKey) {
			// Path resolutions
			var config = $q.all({
				'path': Url.getPrefix(apiKey),
				'location': Loc.getMtc()
			});
			// Verify options are only found in requestOptions
			options.methods = options.methods || options;
			var newOptions = _.difference(_.union(requestOptions, options.methods), requestOptions);
			if (!angular.isArray(options.methods) || newOptions.length)
				throw new Error('Invalid request option: ' + newOptions.toString());

			// Seperate instance methods
			var $props = _.filter(options.methods, function (option) {
				return option.charAt(0) === '$';
			});
			var props = _.filter(options.methods, function (option) {
				return option.charAt(0) !== '$';
			});

			function generateRequest(prop, curUrl) {
				return function generateRequest(params, success, error) {
					if (angular.isFunction(params)) {
						error = (success || angular.noop);
						success = params;
						params = {};
					}

					var value = (this instanceof Constructor) ? this : (prop === 'query' ? [] : new Constructor({}));

					config.then(function setUpRequest(resolved) {
						// Replace pieces of url
						var extend = angular.copy(params || {});
						var path = resolved.path + replacePath(angular.extend(extend,
							{'mtcId': resolved.location.id}, angular.isArray(value) ? {} : value), curUrl, params);
						path += parameterize(params || {});
						doRequest(path, value, prop, Constructor, success, error);
					});

					return value;
				};
			}

			// Class level functions
			angular.forEach(props, function (prop) {
				Constructor[prop] = generateRequest(prop, url);
			});

			// Instance
			angular.forEach($props, function (prop) {
				Constructor.prototype[prop] = generateRequest(prop, url);
			});

			// Other methods
			angular.forEach(options.custom, function (method) {
				if (method.name.charAt(0) === '$')
					Constructor.prototype[method.name] = generateRequest(method.method, method.url);
				else
					Constructor[method.name] = generateRequest(method.method, method.url);
			});

			return Constructor;
		}

		return ResourceBuilder;
	}

	angular.module('mtc').service('$mtcResource', ['$http', '$q', 'mtc.api.url', 'mtc.location', MtcResourceService]);

})(window, window.angular, window._);