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

let fs = require('fs');
let fullDataSet = [];
const storage = "savedData/";

io.on('connection', (socket) => {
    "use strict";

    socket.on('newData', (newData) => {
        recordData(newData);
        io.emit('newData', newData);
    });

    socket.on("getSavedData", () => {
        if (fs.existsSync(storage)) {
            let files = fs.readdirSync(storage, "utf8");
            if (files.length !== 0)
                socket.emit("savedDataList", files);
            else
                socket.emit("noSavedData");
        } else {
            fs.mkdirSync(storage);
            socket.emit("createdSavedDataFolder");
        }
    });

    socket.on("retrieveDataSet", (fileName) => {
        let data = fs.readFileSync(storage + fileName, "utf8");
        socket.emit("dataSet", data);
    });

    socket.on("renameFile", (array) => {
        fs.renameSync(storage + array[0], storage + array[1]);
        let files = fs.readdirSync(storage, "utf8");
        socket.emit("savedDataList", files);
    });
});

function recordData(newData) {
    "use strict";
    fullDataSet.push(new DataPoint(newData));
}

process.stdin.resume(); //so the program will not close instantly
function exitHandler(options, err) {
    "use strict";
    if (options.cleanup && fullDataSet.length !== 0) {
        console.log("Attempting to write file!");
        let filePath = new Date().toLocaleString().replace(/[:\/]/g, "-") + ".txt";

        fs.writeFileSync("savedDataList/" + filePath, JSON.stringify(fullDataSet), "utf8");
        console.log("File probably saved as " + filePath + " in savedDataList folder.");
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