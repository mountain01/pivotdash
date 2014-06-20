/////   MTCAuthenticationService ////////

// This will handle authentication for all apps
// To configure, include module and in app.config ...

// Include in your module the dependancy ---> angular.module('someapp', ['MTCAuthenticationService'])
// Inject MTCAuthServiceProvider in a config function
/// app.config(['MTCAuthServiceProvider', function(MTCAuthServiceProvider){

		// Configureable Options:
		// MTCAuthServiceProvider.setClientID(yourClientID);
		// MTCAuthServiceProvider.pushScope(URLYouDependOn)  Do this for each scope
		// MTCAuthServiceProvider.setRedirectURI(path)

		// Only one of these 3 may be used
		// MTCAuthServiceProvider.requireByu()  Requires a BYU login first time
		// MTCAuthServiceProvider.encourageByu()  Asks nicely for BYU login
		// MTCAuthServiceProvider.enforceByu()  Forces a BYU signin everytime no matter what
// }])

// NOTE:
// This module automatically requests access to the https://api.mtc.byu.edu/auth scope
// If you use this scope, it isn't necessary to push it

// Thats it.  You should be off and running

// To access the current user logged in inject the User service
// You should first call the initUser function to ensure that the token needed to
// get this user is available.  Here is a common use case
//

// ---- DEPRECATED -----
// User.initUser().then(function(){
// 	$scope.user = User.getUser();
// })

// The User.getUser() function returns the initialized user.
// You can guaranatee that the user object will be there if you first call
// initUser and use the .then property of the returned promise
// -------------------------------

// CURRENT WAY TO GET USER
// User.initUser().then(function(){
// 	$scope.user = User.user();
// })

// The User.getUser() function returns the initialized user.
// You can guaranatee that the user object will be there if you first call
// initUser and use the .then property of the returned promise
// The user object returned matches the user given by the auth api /me endpoint

// You also have access to User.isUserInRole
// Pass it a string, and you will get a boolean telling you
// if the logged in user has that role
// Ensure the user is initialized before using...

// User.initUser().then(function(){
//		$scope.isAdmin = User.isUserInRole("myadminrole")
// })

// You may use the built in logout function like so
// function ($scope, User) {
// 	$scope.logout = User.logout;
// }
// ....
// <div ng-click="logout()"></div>

// ---- DEPRECATED ------
// You may use the built in logout function like so
// function ($scope, MTCAuthService) {
// 	$scope.logout = MTCAuthService.logout;
// }
// ....
// <div ng-click="logout()"></div>

// You may also get the list of Locations that a user has rights in

// User.initUser().then(function(){
//		var locations = User.getUserLocations();
// })

// This will be an array of "mtc-location-*" roles
// Most users will only have one, but some may have rights to multiple MTCs

var mtcauth = angular.module('MTCAuthenticationService', []);

// Configure service that will handle redirectURIs and ClientIds
mtcauth.provider('MTCAuthService', function($httpProvider){

	// Oauth Configuration object
	var oauth = {};
	oauth.url = "https://auth.mtc.byu.edu/oauth2/auth";
	oauth.state = "initial";
	oauth.response_type = 'token';
	oauth.scope = ["https://api.mtc.byu.edu/auth"]; // We Required Auth scope for User Object
	oauth.byuRequired = false;
	oauth.byuEncouraged = false;
	oauth.byuEnforcedEachTime = false;

	return {
		setClientID: function(id) {
			oauth.client_id = id;
		},
		pushScope: function(scope) {
			oauth.scope.push(scope);
		},
		setRedirectURI: function(path) {
			oauth.redirect_uri = path;
		},
		requireByu: function() {
			oauth.byuRequired = true;
		},
		encourageByu: function() {
			oauth.byuEncouraged = true;
		},
		enforceByu: function() {
			oauth.byuEnforced = true;
		},
		$get: function($window, $q) {

			var token = null;

			var user = {},
			configObject = {}

			configObject = {
				checkToken: function() {
					return token && (parseInt($window.sessionStorage.expiresAt) > new Date().getTime());
				},
				setToken : function(t) {
					// Save token
					token = t.access_token;
					$window.sessionStorage.accessToken = token;
					$window.sessionStorage.expiresAt = new Date(new Date().getTime() + (t.expires_in - 300) * 1000).getTime(); // Remove 5 minutes, to ensure service updates token before expiration
					$httpProvider.defaults.headers.common.Authorization = 'Bearer ' + token;
				},
				getToken: function() {

					return token;
				},
				getOAuthURL: function() {
					return oauth.url;
				},
				retrieveToken: function() {


					// Try to get the token from 3 different places
					// First: Check route params and see if we have it there
					// Second: Check sessionStorage for token
					// Third: Redirect to signin and get token

					// Look on route params
					var params = {}, queryString = '', path = String(window.location).substring(1), regex = /([^&=]+)=([^&]*)/g, m;
					// remove the # added to the front of the URL
					var pathChunks = path.split("#");
					if(pathChunks[1])// if hash was found, this shouldnt be undefined
						queryString = pathChunks[1].replace(/\//g,'');// sometimes there was a leading forward slash along with the # so we removed it. This is safe as long as we dont use forward slashes in the query params
					else	// if hash wasnt present
						queryString = pathChunks[0].replace(/\//g,'');
					while (m = regex.exec(queryString)) {
						params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);// save out each query param
					}

					if(params && params.access_token && params.expires_in) {
						// Got token from a redirect query string
						this.setToken(params);
					}

					// Look in sessionStorage, verify token in there is good
					if($window.sessionStorage.accessToken && $window.sessionStorage.expiresAt && (parseInt($window.sessionStorage.expiresAt) > new Date().getTime())){
						token = $window.sessionStorage.accessToken;
						$httpProvider.defaults.headers.common.Authorization = 'Bearer ' + token;
					}

					// If checkToken is still false, and there is nothing in sessionStorage
					// redirect to sign in
					if (!this.checkToken()) {
						var url = this.buildUrl();

						$window.open(url, '_self');
					}

					return this.getToken();
				},
				buildUrl: function() {

					function spaceDelimitScope(scopes) {
						var string = '';
						for (var i = scopes.length - 1; i >= 0; i--) {
							var scope = scopes[i];
							string += scope;

							if (i != 0) { // Last one, no space
								string += ' ';
							}
						};
						return string;
					}

					var url = oauth.url;
					url += '?client_id=' + oauth.client_id;
					url += '&response_type=' + oauth.response_type;
					url += '&redirect_uri=' + oauth.redirect_uri;
					url += '&scope=' + spaceDelimitScope(oauth.scope);
					url += '&state=' + oauth.state;

					if (oauth.byuRequired || oauth.byuEncouraged || oauth.byuEnforced) {
						
						url += '&request_auths=';

						if (oauth.byuRequired)
							url += 'byurequired';
						if (oauth.byuEncouraged)
							url += 'byu';
						if (oauth.byuEnforced)
							url += 'byulogin';
					}

					return url;
				},

				// UTILITY FUNCTIONS FOR GETTING USER LOGGED IN, LOGGING OUT, ETC
				logout: function() {
					// Clear session storage
					$window.sessionStorage.accessToken = '';
					$window.sessionStorage.expiresAt = '';
					$window.open('https://auth.mtc.byu.edu/oauth2/logout', "_self");
				}
			};

			return configObject;
		}
	}
});

// Configure User Service
mtcauth.factory('User', function(MTCAuthService, $http, $q, $window){

	var user = null; // DEPRECATED
	var newUser = null;
	var config = {

		// Ensure user is available
		initUser: function() {

			// Return a promise that will guarantee user object is set
			var d = $q.defer();
			var t = MTCAuthService.getToken();
			if (user == null) {

				// Go get the user object
				// DEPRECATED ----
				MTCAuthService.retrieveToken();
				
				$http.get("https://auth.mtc.byu.edu/oauth2/tokeninfo?access_token=" + MTCAuthService.getToken()).success(function(data,status,headers,config){
					user = data;
				})
				.error(function() { d.reject() } ).then(function(){ // ---- END DEPRECATED
					$http.get("https://api.mtc.byu.edu/auth/v1/users/me").success(function(data){
						newUser = data;
						d.resolve();
					}).error(function(){
						d.reject();
					});
				});
				
			} else {
				d.resolve(); // We already have user
			}

			return d.promise;
		},

		// -- DEPRECATED ---
		getUser: function() {
			return user;
		},
		// ----

		user: function() {
			return newUser;
		},

		isUserInRole: function(role) {

			if (user) {

				for (var i = user.user.roles.length - 1; i >= 0; i--) {
					if (user.user.roles[i] == role)
						return true;
				};

				return false;
			}

			console.error("User is undefined, init user first");
			throw "User undefined Error";
		},

		logout: function() {
			// Clear session storage
			$window.sessionStorage.accessToken = '';
			$window.sessionStorage.expiresAt = '';
			$window.open('https://auth.mtc.byu.edu/oauth2/logout', "_self");
		},

		getUserLocations: function() {

			if (newUser) {

				var locations = [];
				for (var i = newUser.roles.length - 1; i >= 0; i--) {
					var role = newUser.roles[i];
					if (role.indexOf("mtc-location-") == 0) { // Role is prefixed with this
						locations.push(role);
					}
				};
				return locations;
			}

			console.error("User is undefined, init user first");
			throw "User undefined Error";
		}
	};

	return config;
});

// Config the async function
mtcauth.factory('Async', function($q, MTCAuthService, $rootScope, $window){

	return {

		getTokenAsync: function(config) {

			// Go get token asynchronously
			// Update $httpProvider with new token
			// Allow config request to continue
			// Need to use OLD SCHOOL ajax request
			var deferred = $q.defer();

			var xmlhttp; // Config object
			if (window.XMLHttpRequest)
			{	// code for IE7+, Firefox, Chrome, Opera, Safari
				xmlhttp = new XMLHttpRequest();
			}
			else
			{	// code for IE6, IE5
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			}

			xmlhttp.onreadystatechange = function() {

				if (xmlhttp.readyState == 4 && (xmlhttp.status == 200 || xmlhttp.status == 302))
				{
					var obj = eval('(' + xmlhttp.response + ')');
					MTCAuthService.setToken(obj);
					// Modify this header
					config.headers.Authorization = "Bearer " + MTCAuthService.getToken();
					deferred.resolve(config);
					$rootScope.$apply();
				}
				else {

					// // This will error if the session is invalidated on the back end
					// // We need to show the user a message, or just redirect to login
					// // For now redirect to login
					// alert("There was an error refreshing your token.  Most likely you have been inactive for over 2 hours.  You are being redirected to the authentication page");
					// $window.open(MTCAuthService.buildUrl(), "_self");
					// $rootScope.$apply();
				}
			}

			xmlhttp.withCredentials = true;
			xmlhttp.open("GET",MTCAuthService.buildUrl(),true);
			xmlhttp.setRequestHeader("Accept", "application/json");
			xmlhttp.send();

			return deferred.promise;
		}
	}
});

// Configure headers and interceptor middleware
mtcauth.config(['$httpProvider', function($httpProvider){

	// Set up OAUTH headers
	$httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.headers.common['Accept'] = 'application/json, text/plain, text/html';
	delete $httpProvider.defaults.headers.common["X-Requested-With"];

	// Intercept API reqeuests and check token
	// Only do this if we are on a valid mtc domain
	if (location.host.indexOf("mtc.byu.edu") != -1) {

		$httpProvider.interceptors.push(function(Async, MTCAuthService) {

			return {
				'request': function (config) {
					
					// Check config object.  We don't want an infinite loop if we
					// are getting our new token
					// The only request that "bypasses" our interceptor is when we go to authenticate or request static content
					if ((config.url.indexOf('https://') == -1 && config.url.indexOf('http://') == -1) || config && config.url == MTCAuthService.getOAuthURL())
						return config;
					else {

						// Check Token.  If all is well, proceed
						// Otherwise, suspend the request, get a new token, modify the request header
						// before sending it out, and let it fly
						// Don't stop from retrieving partials, or other assets with relative URLs
						// TODO: Figure out better way to determine if URLs are relative or not
						if (MTCAuthService.checkToken() || config.url.indexOf("https://auth.mtc.byu.edu/oauth2/tokeninfo?access_token=") != -1) {
							return config;
						}
						else {

							if (!MTCAuthService.checkToken()) {
								return Async.getTokenAsync(config);
							}
						}
					}
				}
			}
		});
	}

}]);



// On app Run, listen for route changes and check token
mtcauth.run(['$rootScope', 'MTCAuthService', '$http', 'Async', '$window', function($rootScope, MTCAuthService, $http, Async, $window){

	$rootScope.$on("$routeChangeStart",function(event, next, current){
		// If its bad, go get it asynchronously
		if (!MTCAuthService.checkToken()) {
			if (location.host.indexOf("mtc.byu.edu") != -1 && $window.sessionStorage.accessToken) {
				Async.getTokenAsync().then(function(){
					$http.defaults.headers.common.Authorization = "Bearer " + MTCAuthService.getToken();
				});
			}
			else {
				// Get it refresh style
				MTCAuthService.retrieveToken();
			}
		}
	});

}]);