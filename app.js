var express = require("express")
  , routes = require("./routes")
  , convert = require("./routes/convert")
  , test = require("./routes/test")
  , http = require("http")
  , path = require("path");

var app = express();

app.configure(function() {
	app.set("port", process.env.PORT || 3000);
	app.set("views", __dirname + "/views");
	app.set("view engine", "jade");
	app.set("view cache", false);
	app.use(express.favicon());
	app.use(express.logger("dev"));
	app.use(express.compress());
	app.use(express.methodOverride());
	app.use(express.cookieParser("your secret here"));
	app.use(express.session());
	app.use(app.router);
	app.use(require("less-middleware")({ src: __dirname + "/public" }));
	app.use(express.static(path.join(__dirname, "public")));

	app.post(/^\/convert\/(https?:\/\/.*)$/, convert.handleFileUpload, convert.do);
	app.put(/^\/convert\/(https?:\/\/.*)$/, convert.handleFileUpload, convert.do);
	app.use(convert.error);
});

app.configure("development", function() {
	/* route rendering form to test upload */
	app.get("/", routes.index);

	/* test routes: callback and error handlers */
	app.get("/test/callback", test.callback);
	app.get("/test/callback/error", test.error);
	app.get("/test/stats", test.stats);
});


http.createServer(app).listen(app.get("port"), function() {
	console.log("Express server listening on port " + app.get("port"));
});
