(function (angular) {

	var authCssProp = 'oauth-hide';
	angular.module('angular-oauth2', []);

	// Configure service that will handle redirectURIs and ClientIds
	function oauth2($httpProvider) {

		// Configure $httpProvider
		var configHttpComplete = false;
		function configHttp() {

			if (configHttpComplete)
				return;

			configHttpComplete = true;
			$httpProvider.defaults.useXDomain = true;
			delete $httpProvider.defaults.headers.common['X-Requested-With'];

			$httpProvider.interceptors.push(['$injector', function ($injector) {
				var $oauth2 = $injector.get('$oauth2');
				return {
					'request': function (config) {
						// Check if this is a request to the oauth2 servers, ignore
						if (!~config.url.indexOf(oauth['oauth2_url']) && !~config.url.indexOf(oauth['logoutUrl'])) {
							if (!$oauth2.isAuthenticated() && !settings.redirecting)
								return $oauth2.updateToken();
						}

						return config;
					}
				};
			}]);
		}
		
		var oauth = {
			'response_type': 'token' // We only support token currently
		}, settings = {
			'redirecting': false // Help with not trying to renew token when redirect is about to happen
		};
		
		// Configure the OAuth2 object
		// client_id: Id of OAuth2 client
		// oauth2_url: (string) url to retrieve token from and authenticate
		// scope: comma separated list of scopes
		// auto_auth: (true/false) default true, start authentication immediately when page loads or not
		// state: (string/true) string representing state
		// redirect_uri: (string/true) string of redirect uri or true to 
		// 		automatically make the redirect_uri from the current browser URL
		// logoutUrl: (string) url to visit to logout
		// popupLogin: (boolean) whether to redirect window for sigin, or use a popup
		// token_info: (string) url to token endpoint
		// options: (object) extra options to include in oauth2 request
		this.configure = function (config) {

			// Set state param in oauth2 to match the angular route
			if (angular.isDefined(config['state'])) {
				if (typeof config['state'] === 'boolean') {
					settings['state'] = config['state'];
					delete config['state'];
				}
			}

			// Set redirect uri to the current location
			// WARNING: Allows flexibility in development, but still must be registered as valid redirect uri on auth server
			if (angular.isDefined(config['redirect_uri'])) {
				if (typeof config['redirect_uri'] === 'boolean') {
					settings['auto_redirect'] = config['redirect_uri'];
					delete config['redirect_uri'];
				}
			}

			// Whether to login with popup or redirect
			// Default redirect (false)
			if (angular.isDefined(config['popup'])) {
				settings['popup'] = config['popup'];
				delete config['popup'];
			}

			// If two different config functions call configure, scope
			// could potential be messed up.  Handle that here
			if (angular.isDefined(oauth['scope'])) {
				oauth['scope'] += ' ' + config['scope'];
				delete config['scope'];
			}

			// Prevent issues of overwriting values
			if (!angular.isDefined(config['oauth2_url'])) {
				config['oauth2_url'] = oauth['oauth2_url'];
			}
			if (!angular.isDefined(config['client_id'])) {
				config['client_id'] = oauth['client_id'];
			}

			settings['auto_auth'] = config['auto_auth'] || true;
			delete config['auto_auth'];
			angular.extend(oauth, config);

			configHttp();
		};

		this.$get = ['$injector', 'oauth2-key', '$q', '$location', '$window',
			function ($injector, oauthKey, $q, $location, $window) {

			var	tokenRefreshReduction = (60 * 1000 * 5); // 5 minutes
			var tokenDefer = $q.defer();

			function buildUrl(config) {

				var oauth = angular.copy(config);
				var url = oauth['oauth2_url'] + '?';
				delete oauth['oauth2_url'];

				var state = $window.location.hash.substring(1);
				var redirect = $window.location.origin + ($window.location.pathname || '');
				url += 'client_id=' + oauth['client_id'];
				url = oauth['scope'] ? (url + '&scope=' + oauth['scope']) : url;
				url = (settings['state'] && state) ? (url + '&state=' + state) : (oauth['state'] ? (url + '&state=' + oauth['state']) : url);
				url += '&response_type=token';
				url = (settings['auto_redirect'] && redirect) ? (url + '&redirect_uri=' + redirect) : (url + '&redirect_uri=' + oauth['redirect_uri']);

				return url;
			}

			function saveToken(token) {
				// Save to session storage
				var now = new Date().getTime();
				token['expires_at'] = token['expires_at'] || new Date(now + ((token['expires_in'] * 1000) - tokenRefreshReduction)).getTime();
				$window.sessionStorage[oauthKey + '-' + oauth['client_id']] = angular.toJson(token);
				$httpProvider.defaults.headers.common.Authorization = 'Bearer ' + token['access_token'];
				tokenDefer.resolve(token);
				return token;
			}

			function stripToken(path) {

				var params, queryString = '', regex = /([^&=]+)=([^&]*)/g, m;
				var pathChunks = path.split('#');

				if (pathChunks.length > 1) {

					if (pathChunks[1].charAt(0) === '/')// if hash was found, this shouldnt be undefined
						pathChunks[1] = pathChunks[1].substring(1);

					queryString = pathChunks[1];
			               
					while ((m = regex.exec(queryString))) {
						if (!angular.isDefined(params))
							params = {};
						params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);// save out each query param
					}
				}

				return params;
			}

			var foundOnPath = false;
			function findToken() {

				// If user added oauth attribute to body, we remove it once authentication is complete
				function showBody() {
					angular.element($window.document).find('body').removeAttr(authCssProp);
				}

				// Throw error for missing required pieces
				if ((!angular.isDefined(oauth['redirect_uri']) && !settings['auto_redirect']) ||
					!angular.isDefined(oauth['client_id']) ||
					!angular.isDefined(oauth['oauth2_url'])) {

					throw new Error('Missing required configuration options');
				}

				// See if a login has occurred before forcing authentication
				// If we are authenticated, we are good
				if (service.isAuthenticated()) {
					showBody();
					return;
				}

				// Try to find access token on path
				var token;
				if ((token = stripToken(String($window.location)))) {
					foundOnPath = true;
					saveToken(token);
					showBody();
					if (token['state'])
						$location.path(token['state']);
					else if (!settings['auto_redirect'])
						window.location.hash = ''; // Clear hash if we aren't using routing or state
					return;
				}

				// Try to authenticate
				if (settings['auto_auth'])
					service.authenticate();
			}

			// Configure the service
			var service = {};

			// Register a function to call when authentication occurs
			service.registerCallback = function (func) {
				return !foundOnPath || func();
			};

			service.authenticate = function () {
				// Start Oauth2 flow
				var url = buildUrl(oauth);

				// TODO: Popup style
				$window.location.href = url;
				settings.redirecting = true;
			};

			service.isAuthenticated = function () {
				// Verify user is authenticated
				var token = angular.fromJson($window.sessionStorage[oauthKey + '-' + oauth['client_id']]);
				var now = new Date().getTime();
				var valid = (angular.isDefined(token) && parseInt(token['expires_at']) > now);

				if (valid)
					saveToken(token);

				return valid;
			};

			service.updateToken = function () {

				var defer = $q.defer();

				// Try async authentication
				$injector.get('$http')({'url': buildUrl(oauth), 'method': 'GET', 'withCredentials': true, 'headers': {'Accept': 'application/json'}})
				.success(function (data) {
					if (angular.isObject(data)) {
						defer.resolve(saveToken(data));
						return;
					}

					defer.reject('Token was received as JSON');
				})
				.error(function () {
					// Authenticate normally
					console.warn('Attempted to retrieve token async, fallback to default method');
					service.authenticate();
				});

				return defer.promise;
			};

			service.getConfig = function () {
				return angular.extend(angular.copy(settings), angular.copy(oauth));
			};

			service.getToken = function () {
				return angular.fromJson($window.sessionStorage[oauthKey + '-' + oauth['client_id']]);
			};

			// Promise that tells us when token is retrieved
			service.tokenAvailable = tokenDefer.promise;

			// Kick of auth by calling function
			findToken();

			return service;
		}];
	}

	angular.module('angular-oauth2').provider('$oauth2', ['$httpProvider', oauth2]);
	angular.module('angular-oauth2').constant('oauth2-key', 'angular-oauth2');

	// Add css for hiding body if desired :)
	window.document.styleSheets[0].insertRule('[' + authCssProp + '] { display: none; }', window.document.styleSheets[0].cssRules.length);

})(angular);