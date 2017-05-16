//	server.js
//	MVC framework for Node
let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);

let path = require('path');

app.set('views', path.join(__dirname, 'client'));
app.set('view engine', 'ejs');	//	template system
app.engine('html', require('ejs').renderFile);
let bodyParser = require('body-parser');

app.use(express.static(path.join(__dirname, 'client')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

let index = require('./routes/index');
app.use('/', index);	 //	associate with index route files

io.on('connection', function(socket) {
    socket.on('newData', function(newData){
        io.emit('newData', newData);
    });
});

let port = 3000;
server.listen(port, function () {
    console.log("Listening on port " + port)
});
