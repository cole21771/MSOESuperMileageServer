//	server.js

let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);

let path = require('path');

app.use(require('compression')());

app.set('views', path.join(__dirname, 'client'));
app.set('view engine', 'ejs');	//	template system
app.engine('html', require('ejs').renderFile);
let bodyParser = require('body-parser');

app.use(express.static(path.join(__dirname, 'client')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

let index = require('./routes/index');
app.use('/', index);	 //	associate with index route files

app.use('/dist', express.static(__dirname + '/dist'));

let fs = require('fs');

/**
 * All of the data that has been received is kept track of with this array
 * (that is full of arrays)
 *
 * @type {Array}
 */
let fullDataSet = [];

let locationDataSet = [];

/**
 * Just a const so that I don't have to type 'savedData/' every time I want to access
 * that folder. Also it makes it easier to change if I want to in the future
 *
 * @type {string}
 */
const storage = "savedData/";

io.on('connection', (socket) => {
    "use strict";

    /**
     * When the server retrieves new data from the vehicle, this function is called
     * and the new data is sent to all of the connected clients
     */
    socket.on('newData', (newData) => {
        recordData(newData);
        io.emit('newData', newData);
    });

    /**
     * When a client asks for all of the saved data in the saveData folder, this function is called
     * so it can first make sure the folder exists, then if it does, check if it's empty and if it is,
     * tell the client, if it isn't, send a list of the files that are in that folder.
     */
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

    /**
     * A listener for when the client asks for a specific file, it returns the file that was
     * selected
     */
    socket.on("retrieveFile", (filename) => {
        let data = fs.readFileSync(storage + filename, "utf8");
        socket.emit("requestedFile", data);
    });

    /**
     * Allows the client to rename a file.
     * Error checking is done on the client side
     */
    socket.on("renameFile", (array) => {
        fs.renameSync(storage + array[0], storage + array[1]);
        refreshData(socket, io);
    });

    /**
     * Allows the client to delete a file by emitting a 'deleteFile' event
     */
    socket.on("deleteFile", (filename) => {
        fs.unlinkSync(storage + filename);
        refreshData(socket, io);
    });

    /**
     * A listener for when a client asks for a file to be converted to a csv format
     */
    socket.on("getCSV", (data) => {
        "use strict";
        let filename = data.filename, labels = data.labels;

        let fileData = JSON.parse(fs.readFileSync(storage + filename, "utf8"));
        if (Array.isArray(fileData)) {
            let convertedData = "Time, ";

            if (Array.isArray(labels))
                convertedData += labels.join(',') + "\n";

            let firstTime = new Date(fileData[0].timeStamp).getTime();
            fileData.forEach((dataPoint) => {
                convertedData += (new Date(dataPoint.timeStamp).getTime() - firstTime) + ", " + JSON.parse(dataPoint.data).join(',') + "\n";
            });

            socket.emit("convertedCSVFile", {
                data: convertedData,
                filename: filename.slice(0, filename.indexOf('.')) + '.csv'
            })
        } else
            socket.emit("dataUnreadable", filename);
    });

    socket.on("newLocation", (locationArray) => {
        let location = JSON.parse(locationArray);

        if (Array.isArray(location)) {
            location = new Location(location);
            recordLocation(location);
            io.emit("newLocation", location);
        }
    });
});

/**
 * A function that allows any of the above event listeners to tell all of the clients
 * they need a refresh and then send the refreshed data back to the client who initially caused
 * this function to be called
 * @param socket
 * @param io
 */
function refreshData(socket, io) {
    "use strict";
    io.emit("needRefresh");
    let files = fs.readdirSync(storage, "utf8");
    if (files.length !== 0)
        socket.emit("savedDataList", files);
    else
        socket.emit("noSavedData");
}

/**
 * A function that adds the new data to the fullDataSet with a timestamp
 *
 * @param newData the new data to be pushed to the array
 */
function recordData(newData) {
    "use strict";
    fullDataSet.push(new DataPoint(newData));
}

function recordLocation(location) {
    locationDataSet.push(location);
}

/**
 * The statement, function below (exitHandler), and few process.on event listeners
 * stop the server from exiting before saving the data to the savedData folder
 */
process.stdin.resume(); //so the program will not close instantly
function exitHandler(options, err) {
    "use strict";
    if (options.cleanup && fullDataSet.length !== 0) {
        console.log("Attempting to write file!");
        let filePath = new Date().toLocaleString().replace(/[:\/]/g, "-") + ".smv";

        fs.writeFileSync(storage + filePath, JSON.stringify(fullDataSet), "utf8");
        fs.writeFileSync(storage + filePath + '.location', JSON.stringify(locationDataSet), 'utf8');
        console.log("File probably saved as " + filePath + " in saveData folder.");
    } else if (err)
        console.log(err.stack);
    else if (options.exit)
        process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));

let port = 3000;

/**
 * The thing that starts the server
 *
 * @type {number}
 */
server.listen(port, function () {
    console.log("Listening on port " + port)
});

/**
 * A DataPoint object that sets the data attribute to the data passed into the object,
 * and creates a timestamp with a new Date()
 *
 * @param data is the data to be recorded by this DataPoint
 */
function DataPoint(data) {
    "use strict";
    this.data = data;
    this.timeStamp = new Date();
}

function Location(data) {
    this.latitude = data[0];
    this.longitude = data[1];
    this.altitude = data[2];
    this.timeStamp = new Date();
}