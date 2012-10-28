var http = require("http")
  , nullFunction = new Function();


/**
 * Call unique callback
 *
 * @param {String} callback URL to call
 */
exports.success = function(callback) {
	http.get(callback, nullFunction);
};


/**
 * Call unique callback with "/error" appended
 *
 * @param {String} callback URL to call
 */
exports.fail = function(callback) {
	http.get(callback + "/error", nullFunction);
};