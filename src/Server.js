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

let fullDataSet = [];

io.on('connection', function(socket) {
    "use strict";
    socket.on('newData', function(newData){
        recordData(newData);
        io.emit('newData', newData);
    });
});

function recordData(newData) {
    "use strict";
    fullDataSet.push(new DataPoint(newData));
}

let fs = require('fs');

process.stdin.resume(); //so the program will not close instantly
function exitHandler(options, err) {
    "use strict";
    if (options.cleanup) {
        console.log("Attempting to write file!");
        let filePath = new Date().toUTCString().replace("/[:\/]/g", "-") + ".txt";

        fs.writeFile(filePath, fullDataSet, "UTF-8",(err) => {
            if (err)
                throw err;
            console.log("File Saved to " + filePath);
            process.exit();
        });
    } else if (err)
        console.log(err.stack);
    else if (options.exit)
        process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));



let port = 3000;
server.listen(port, function () {
    console.log("Listening on port " + port)
});

function DataPoint(data) {
    "use strict";
    this.data = data;
    this.timeStamp = new Date();
}