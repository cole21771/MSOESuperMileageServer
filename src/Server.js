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
const storage = "savedData/";

io.on('connection', function(socket) {
    "use strict";

    socket.on('newData', function(newData){
        recordData(newData);
        io.emit('newData', newData);
    });

    socket.on("getSavedData", function(){
        let files = fs.readdirSync(storage, "utf8");
        socket.emit("savedData", files);
    });

    socket.on("retrieveDataSet", (fileName) => {
        let data = fs.readFileSync(storage + fileName, "utf8");
        socket.emit("dataSet", data);
    });

    socket.on("renameFile", (array) => {
        fs.renameSync(storage + array[0], storage + array[1]);
        let files = fs.readdirSync(storage, "utf8");
        socket.emit("savedData", files);
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
    if (options.cleanup && fullDataSet.length !== 0) {
        console.log("Attempting to write file!");
        let filePath = new Date().toLocaleString().replace(/[:\/]/g, "-") + ".txt";

        fs.writeFileSync("savedData/" + filePath, JSON.stringify(fullDataSet), "utf8");
        console.log("File probably saved as " + filePath + " in savedData folder.");
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