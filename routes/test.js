var SUCCESSFUL = 0
  , FAILED = 0;


/**
 * POST /test/callback handler
 *
 * @param {IncomingMessage} req Express request
 * @param {ServerResponse} res Express response
 */
exports.callback = function(req, res) {
	res.send({success: ++SUCCESSFUL});
};


/**
 * POST /test/callback/error handler
 *
 * @param {IncomingMessage} req Express request
 * @param {ServerResponse} res Express response
 */
exports.error = function(req, res) {
	res.send({success: ++FAILED});
};


/**
 * POST /test/callback/handler
 *
 * @param {IncomingMessage} req Express request
 * @param {ServerResponse} res Express response
 */
exports.stats = function(req, res) {
	res.send({
		success: SUCCESSFUL,
		failed: FAILED
	});
};