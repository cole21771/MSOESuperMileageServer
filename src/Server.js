//	server.js
//	MVC framework for Node
let express = require('express');

//	allows us to deal with system file path, from core library
let path = require('path');

//	accepts data through a form and submits it to a DB
let bodyParser = require('body-parser');

//	set up routes
let index = require('./routes/index');
//let tracks = require('./routes/tracks');

//	create express main app variable
let app = express();

//	define port let
let port = 3000;

//	View engine, views will be in 'views' folder
//	https://github.com/tj/ejs
app.set('views', path.join(__dirname, 'client'));

app.set('view engine', 'ejs');	//	template system
app.engine('html', require('ejs').renderFile);

//	Set up static folder - where we are	going to stick angular stuff
app.use(express.static(path.join(__dirname, '/client')));

//	Body parser middleware, want to parse json
//	https://github.com/expressjs/body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use('/', index);	 //	associate with index route files
//app.use('/api', tracks);	// api
app.listen(port, function () {
    console.log("Listening on port " + port)
});