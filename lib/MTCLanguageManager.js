/*********************************************************************************************
 MTCLanguageManager - An AngularJS Localization Module
 *********************************************************************************************


 Introduction
 *********************************************************************************************
  This module has been created with the intent to provide a elegant solution for quick 
  webapp localization.

  The module will automatically detect the browser language and set it as the default language
  code.

 How to Use Module
 *********************************************************************************************
    
    1. Tell your app module that 'LocalizationModule' is a dependancy.
       Ex.  var app = angular.module('app_name', ['LocalizationModule']);

    2. Now, inject 'localizationService' into every scope and controller it is
       needed in.

    3. Set the appID at the top of your main app controller.  This triggers the loading of your app's 
       localized string from the database.  Your appID is your application's name without spaces or
       punctuation, and all lowercase.  (Ex. If your application is named Flash Cards, the appID 
       should be "flashcards")

    3b (optional) You can also override the default language code, detected from the browser,
       and set your own using 'setLanguageCode()'.  The language code is a ISO 639-1 Code.
       (E.g. 'en', 'zh', etc).

    4. Lastly, to use the localized string within your code, use the following filter wherever
       you need localized text.

       Ex. {{'localized-text-key' | localizedString}}

       Where 'localized-text-key' is the key that corresponds to the localized string key in 
       the database.  The module will then dynamically update and replace this with the 
       localized string from the database.

 Rules to Localized Text Key:
 *********************************************************************************************

    The key must conform to the following rules:

    1. The localized key must be the exact word or phrase you wish to use, all lowercase,
        punctuation removed, and where there are spaces, slashes, or dashes, use dashes. "-"
        Ex. {{'welcome-to-the-mtcs-awesome-app' | localizedString}}
        Where the string you wish use is: "Welcome to the MTC's Awesome App!"

    2. In the case where you need two (or more) different translations of the same word in your 
        application, apply the rule above and add a "-{num}" for distinction.
	    Ex. {{'name-2' | localizedString}} in the case of more than one translation for "Name".
	

 *********************************************************************************************
 API Reference
 *********************************************************************************************
    
 Variables
 *********************************************************************************************

     languageCode

         This is the current languageCode of the module.  The default value of the languageCode
         is set on startup based on the browsers language.  It has corresponding getters and
         setters.

     
     localizedDictionary

         The JSON dictionary array that holds all the localized strings.  It is updated in the 
         updateLocalizedResources and accessed in getLocalizedString.

     
     appID

         This is the appID of the current app it is being used in.  It has corresponding
         getters and setters.  This is REQUIRED to be set before the resource request will work.


     activeEndpoint

         This is the current endpoint used in generating the resource request URL. The default
         value is 'productionEndpoint'.


     resourceFileLoaded

         This is the flag used to know if the resources have been loaded.  I believe this has 
         been @deprecated.


 Methods
 *********************************************************************************************

    successCallback(iData)
    
        Method called with a successful http request.  It will store iData into the json
        dictionary storing all the localized strings.

        iData - This expected to be a json array of localized string dictionaries.


    updateLocalizedResources()

        Used to request the localized strings json data from the generatedResourceURL().


    getLocalizedString(iKey)

        Returns the string that matches iKey in the localized string dictionary.

        iKey - A key that is expected to match a string in the database.


    getLanguageCode()

        Returns the currently set language code. E.g. 'en' or 'zh'


    getCurrentLanguageCodeDescription()

        Returns the english description of the module's current set language code.
        E.g. If the current language code was set to 'en' it would return 'English'.


    getDescriptionForLanguageCode(iLanguageCode)

        Returns the english description of iLanguageCode. E.g. If iLanguageCode is 'zh',
        it would return 'Chinese'.

    
    setAppId(iAppID)

        Set's the module's appID.  This appID is used in the request to grab back the proper
        json data for the webapp.  This must be set for updateLocalizedResources() to work.

        After the appID has been set, it calls updateLocalizedResources() to force an update
        of all the localized strings.

        NOTE: This must match the name of the angular application and the name you used when
        creating the angular.module!


    setLanguageCode(iLanguageCode)

        Set's the module's language code.  This calls updateLocalizedResources() to force an
        update of all the localized strings.


    useCustomEndpoint(iOptionalURL)

        Tells the module to use the custom request endpoint, iOptionalURL.  If iOptionalURL 
        is null, it will use the hardcoded default global variable localhostEndpoint as the 
        activeEndpoint.

        This DOES NOT call updateLocalizedResources().

    
    useProductionEndpoint()

        Tells the module to use the hardcoded global variable productionEndpoint as the 
        activeEndpoint.

        This DOES NOT call updateLocalizedResources().


    generateResourceURL

        This method will generate the resource request URL depending on the activeEndpoint,
        languageCode, and appID.

 *********************************************************************************************/


/*
 *	Force the module to 'use strict'
 *	Note: http://stackoverflow.com/questions/1335851/what-does-use-strict-do-in-javascript-and-what-is-the-reasoning-behind-it
 */
'use strict';

/*
 *	Start MTCLanguageManager
 */
var angularLanguageManager = angular.module('LocalizationModule', []);


/*
 *  Global Endpoint Urls
 */
var productionEndpoint = "https://app.mtc.byu.edu/";
var localhostEndpoint = "http://localhost:8080/mtcservices/";

/*
 *  Factory
 */
angularLanguageManager.factory('localizationService', ['$http', '$rootScope', '$window', '$filter', 
	function ($http, $rootScope, $window, $filter) {
		var localize = {

			// Default to Browser Language (first two digits)
			languageCode: "en",
            //($window.navigator.userLanguage || $window.navigator.language).substring(0,2)
            
			// Localized strings array
			localizedDictionary:[],

			// App Id
			appID:"",

            // Endpoint url
            activeEndpoint:productionEndpoint,

			// Resource loaded flag
			resourceFileLoaded:false,

			successCallback:function (iData) {
			    // store the returned array in the dictionary
			    localize.localizedDictionary = iData;

			    // set the flag that the resource are loaded
			    localize.resourceFileLoaded = true;

			    // broadcast that the file has been loaded
			    $rootScope.$broadcast('localizeResourcesUpdates');
			},
 
            updateLocalizedResources:function() {

                if(!this.appID) {
                    console.log("MTCLanguageManager Error: Trying to update localized resources but there is no appID set.")
                    return;
                };

                if(!this.languageCode) {
                    console.log("MTCLanguageManager Error: Trying to update localized resources but there is no language set.")
                    return;
                };

                // Note: This is for using the actual files
                // var resourceUrl = '../language/localization_' + localize.language.substring(0,2) + '.js';
                var resourceUrl = this.generateResourceURL();
                $http({ method:"GET", url:resourceUrl, cache:true })
                    .success(localize.successCallback)
                    .error(function () {
                        console.log('error');
                        // // Request failed, get the default fallback language file
                        // var url = '../language/localization_en.js';
                        // $http({ method:"GET", url:url, cache:true }).success(localize.successCallback);
                    });
            },

			getLocalizedString:function (iKey) {
	            var localizedString = '';

	            if ((localize.localizedDictionary !== []) && (localize.localizedDictionary.length > 0)) {
	                
	                // Use the filter service for entries that match.  If multiple, use the first.
	                var entry = $filter('filter')(localize.localizedDictionary, function(element) {
	                        return element.key === iKey;
	                })[0];

                    if(entry == null){
                        console.log("MTCLanguageManager Error: There is no entry found for " + iKey);
                    }

                    localizedString = entry.text;
	            }

	            return localizedString;
	        },

			getLanguageCode:function() {
				return this.languageCode;
			},

			getCurrentLanguageCodeDescription:function() {
				return languageLookup[this.languageCode];
			},

            getDescriptionForLanguageCode:function(iLanguageCode) {
                return languageLookup[iLanguageCode];
            },

            setAppId:function(iAppID) {
                localize.appID = iAppID;

                this.updateLocalizedResources();
            },

            setLanguageCode:function(iLanguageCode) {
                localize.languageCode = iLanguageCode;

                this.updateLocalizedResources();
            },

            useCustomEndpoint:function(iOptionalURL) {
                if (iOptionalURL == null) {
                    this.activeEndpoint = productionEndpoint;
                } else {
                    this.activeEndpoint = iOptionalURL;
                };
            },

            useProductionEndpoint:function() {
                this.activeEndpoint = productionEndpoint;
            },

            generateResourceURL:function() {
                return "" + this.activeEndpoint + "translate/getappphrases?appcode=" + this.appID + "&languagecode=" + this.languageCode;
            }

		};

		return localize;
	}
]).

/*
 *  Filter
 */
filter('localizedString', ['localizationService', function (localizationService) {
	return function(input) {
		return localizationService.getLocalizedString(input);
	};
}]).

/*
 *  Directive
 */
directive('localizedString', ['localizationService', function(localizationService) {
	var lsDirective = {
		restrict:"EAC",
        updateText:function(elm, token){
            var values = token.split('|');
            if (values.length >= 1) {
                var tag = localize.getLocalizedString(values[0]); 
				
                // update the element only if data was returned
                if ((tag !== null) && (tag !== undefined) && (tag !== '')) {
                    if (values.length > 1) {
                        for (var index = 1; index < values.length; index++) {
                            var target = '{' + (index - 1) + '}';
                            tag = tag.replace(target, values[index]);
                        }
                    }

                    // insert the text into the element
                    elm.text(tag);
                };
            }
        },

        link:function (scope, elm, attrs) {
            scope.$on('localizeResourcesUpdates', function() {
                lsDirective.updateText(elm, attrs.ls);
            });

            attrs.$observe('localizedString', function (value) {
                lsDirective.updateText(elm, attrs.ls);
            });
        }		
	};
	return lsDirective;
}]);


/*
 *  Constants
 */

// Language Lookup Array
var languageLookup = {
     "ab": "Abkhazian",
     "af": "Afrikaans",
     "an": "Aragonese",
     "ar": "Arabic",
     "as": "Assamese",
     "az": "Azerbaijani",
     "be": "Belarusian",
     "bg": "Bulgarian",
     "bn": "Bengali",
     "bo": "Tibetan",
     "br": "Breton",
     "bs": "Bosnian",
     "ca": "Catalan / Valencian",
     "ce": "Chechen",
     "co": "Corsican",
     "cs": "Czech",
     "cu": "Church Slavic",
     "cy": "Welsh",
     "da": "Danish",
     "de": "German",
     "el": "Greek",
     "en": "English",
     "eo": "Esperanto",
     "es": "Spanish / Castilian",
     "et": "Estonian",
     "eu": "Basque",
     "fa": "Persian",
     "fi": "Finnish",
     "fj": "Fijian",
     "fo": "Faroese",
     "fr": "French",
     "fy": "Western Frisian",
     "ga": "Irish",
     "gd": "Gaelic / Scottish Gaelic",
     "gl": "Galician",
     "gv": "Manx",
     "he": "Hebrew",
     "hi": "Hindi",
     "hr": "Croatian",
     "ht": "Haitian; Haitian Creole",
     "hu": "Hungarian",
     "hy": "Armenian",
     "id": "Indonesian",
     "is": "Icelandic",
     "it": "Italian",
     "ja": "Japanese",
     "jv": "Javanese",
     "ka": "Georgian",
     "kg": "Kongo",
     "ko": "Korean",
     "ku": "Kurdish",
     "kw": "Cornish",
     "ky": "Kirghiz",
     "la": "Latin",
     "lb": "Luxembourgish Letzeburgesch",
     "li": "Limburgan Limburger Limburgish",
     "ln": "Lingala",
     "lt": "Lithuanian",
     "lv": "Latvian",
     "mg": "Malagasy",
     "mk": "Macedonian",
     "mn": "Mongolian",
     "mo": "Moldavian",
     "ms": "Malay",
     "mt": "Maltese",
     "my": "Burmese",
     "nb": "Norwegian (Bokmål)",
     "ne": "Nepali",
     "nl": "Dutch",
     "nn": "Norwegian (Nynorsk)",
     "no": "Norwegian",
     "oc": "Occitan (post 1500); Provençal",
     "pl": "Polish",
     "pt": "Portuguese",
     "rm": "Raeto-Romance",
     "ro": "Romanian",
     "ru": "Russian",
     "sc": "Sardinian",
     "se": "Northern Sami",
     "sk": "Slovak",
     "sl": "Slovenian",
     "so": "Somali",
     "sq": "Albanian",
     "sr": "Serbian",
     "sv": "Swedish",
     "sw": "Swahili",
     "tk": "Turkmen",
     "tr": "Turkish",
     "ty": "Tahitian",
     "uk": "Ukrainian",
     "ur": "Urdu",
     "uz": "Uzbek",
     "vi": "Vietnamese",
     "vo": "Volapuk",
     "yi": "Yiddish",
     "zh": "Chinese"
}   // End Language Lookup Array
