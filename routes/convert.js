var formidable = require("formidable")
  , fs = require("fs")
  , path = require("path")
  , converter = require("../models/pdf-convert.js")
  , callbaker = require("../models/callbaker")
  , logger = require("log4js").getLogger("Converter");


/**
 * Handle file upload
 *
 * @param {IncomingMessage} req Express request
 * @param {ServerResponse} res Express response
 * @param {Function} next Chain callback
 */
exports.handleFileUpload = function(req, res, next) {
	var form = new formidable.IncomingForm();

	if (req.get("content-type").indexOf("multipart/form-data") !== 0) {
		return next("Wrong Content-type specified!");
	}

	form.parse(req, function(err, fields, files) {
		if (err) {
			return next("Upload handler error: " + err);
		} else if (form.bytesReceived !== form.bytesExpected) {
			return next("Expected and received bytes count differ.")
		}

		var keys = Object.keys(files);
		if (!keys.length) {
			return next("No files uploaded");
		} else if (keys.length > 1) {
			return next("Only one file per-request is allowed");
		}

		req.file = files[keys.shift()];
		if (path.extname(req.file.name).toLowerCase() !== ".pdf") {
			next("Non-pdf file was uploaded");
		} else {
			next();
		}
	});
};


/**
 * Handle /convert/:callback_url
 *
 * @param {IncomingMessage} req Express request
 * @param {ServerResponse} res Express response
 * @param {Function} next Chain callback
 */
exports.do = function(req, res, next) {
	converter.processFile(req.file, function(err, outPath) {
		if (err) {
			return next(err);
		}

		res.download(outPath, req.file.name, function(err) {
			if (err) {
				return next(err);
			}

			/* call unique callback */
			callbaker.success(req.params[0]);

			fs.unlink(outPath, function(err) {
				if (err) {
					logger.warn("Error removing output file: %s", err);
				}
			});
		});
	});
};


/**
 * Error handler for /convert/:callback_url requests
 *
 * @param {*} err Error
 * @param {IncomingMessage} req Express request
 * @param {ServerResponse} res Express response
 * @param {Function} next Chain callback
 */
exports.error = function(err, req, res, next) {
	if (req.url.indexOf("/convert/") !== 0) {
		next(err);
	} else {
		/* call unique callback + /error */
		callbaker.fail(req.params[0]);

		res.send(500, {error: err});
	}
};