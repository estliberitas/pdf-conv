var child_process = require("child_process")
  , fs = require("fs")
  , poolModule = require("generic-pool")
  , log4js = require("log4js")
  , path = require("path")
  , execFile = child_process.execFile
  , poolLogger = log4js.getLogger("Converter pool")
  , convLogger = log4js.getLogger("Converter");

// TODO replace with configuration json file
var POOL_MAX_IDLE = 3600000
  , POOL_MIN_NODES = 10
  , POOL_MAX_NODES = 1000
  , USE_QUEUE = true;

/**
 * Path to PDF/A definition file (relative to application root)
 *
 * @type {String}
 */
var PDFA_DEF_PATH = "data/PDFA_def.ps"
  , PDFA_DEF_CONF = ["-dPDFA=2", "-dBATCH", "-dNOPAUSE", "-dNOOUTERSAVE", "-dUseCIEColor", "-sProcessColorModel=DeviceCMYK", "-sDEVICE=pdfwrite"];


/**
 * Converter service model
 *
 * @class PDFConverter
 * @constructor
 */
function PDFConverter() {
	/**
	 * Cache for further use
	 *
	 * @type {String}
	 */
	this.rootPath = path.join(__dirname, "..");

	this.initQueue();
	this.checkPDFDefinition();
}


/**
 * Init queue for conversion tasks if needed
 *
 * @private
 */
PDFConverter.prototype.initQueue = function() {
	if (USE_QUEUE) {
		convLogger.debug("Using queueing of conversion tasks");

		/**
		 * Pool will be used for queueing only
		 *
		 * @type {Object}
		 */
		this.pool = poolModule.Pool({
			name: "pdf-converter",
			min: POOL_MIN_NODES,
			max: POOL_MAX_NODES,
			idleTimeoutMillis: POOL_MAX_IDLE,

			/* place our own logger */
			log: function() { poolLogger.debug.apply(poolLogger, arguments); },

			/* do nothing */
			create: function(callback) {
				callback(null, new Boolean(true));
			},

			/* do nothing */
			destroy: function() {
				callback();
			}
		});
	} else {
		convLogger.debug("No queueing used - conversions run simultaneously");
	}
};


/**
 * Check for PDF/A definition file, create if one is not present
 *
 * @private
 */
PDFConverter.prototype.checkPDFDefinition = function() {
	var locPath = path.join(this.rootPath, "app.loc")
	  , defPath = path.join(this.rootPath, PDFA_DEF_PATH)
	  , cache
	  , defData;

	if (fs.existsSync(locPath)) {
		cache = fs.readFileSync(locPath).toString();
	}

	if (cache != this.rootPath) {
		convLogger.debug("First run. Creating PDF/A definition from sample");
		fs.writeFileSync(locPath, this.rootPath);

		defData = fs.readFileSync(defPath + ".example").toString();
		defData = defData.replace("%PATH%", this.rootPath);
		fs.writeFileSync(defPath, defData)
	}
};


/**
 * Handle convert request
 *
 * @param {File} file Formidable file representation
 * @param {Function} fn Callback taking (err, outPath)
 * @public
 */
PDFConverter.prototype.processFile = function(file, fn) {
	if (USE_QUEUE) {
		var self = this;
		this.pool.acquire(function(err, trueValue) {
			if (err) {
				poolLogger.error(err);
				fn(err);
			} else {
				self._processFile(file, fn, trueValue);
			}
		});
	} else {
		this._processFile(file, fn);
	}
};


/**
 * Run "gs" util, convert file
 *
 * @param {File} file Formidable file representation
 * @param {Function} fn Callback taking (err, outPath)
 * @param {Boolean} [flag] Boolean object, e.g. pool node
 * @private
 */
PDFConverter.prototype._processFile = function(file, fn, flag) {
	var outPath = file.path +  ".converted"
	  , args = PDFA_DEF_CONF.slice(0)
	  , self = this;

	args.unshift(["-sOutputFile=", outPath].join(""));
	args.push(PDFA_DEF_PATH);
	args.push(file.path);

	convLogger.debug("Executing gs with following arguments: %s", args.join(" "));
	convLogger.debug("Processing %s", file.path);

	execFile("gs", args, {
		cwd: this.rootPath
	}, function(err, stdout, stderr) {
		if (stderr) {
			var start = stdout.indexOf("Error: ") + 7
			  , end = stdout.indexOf("\n", start)
			  , errorText = ["Ghostscript error:"];

			errorText.push(stdout.substring(start, end));
			err = errorText.join(" ");
		}

		if (flag) {
			self.pool.release(flag);
		}

		// remove original file
		fs.unlink(file.path, function(err) {
			if (err) {
				convLogger.warn("Error removing original PDF file: %s", err);
			}
		});

		if (err) {
			fn(err);
		} else {
			fn(null, outPath);
		}
	});
};


module.exports = new PDFConverter();