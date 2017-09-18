/**
 * Created by cole2 on 5/15/2017.
 */

const angularApp = angular.module('angularApp', ['ng', 'ngAnimate', 'ngAria', 'ngMessages', 'ngMaterial', 'ngMap']);

//Sets the theme to a dark theme of the default theme (but with a blue accent palette)
angularApp.config(function ($mdThemingProvider) {
    "use strict";

    $mdThemingProvider.theme('default')
        .primaryPalette('blue');
    //.dark();
});

/**
 * Creates an angular variable factory thingy for the socket so it updates the scope ($scope.apply)
 * when you receive an event or send one
 */
angularApp.factory('socket', function ($rootScope) {
    "use strict";
    let socket = io.connect();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                let args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                let args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});

angularApp.controller('angularController', ['$scope', 'socket', 'NgMap', function ($scope, socket, NgMap) {
    "use strict";

    $scope.resizeMap = function (id) {
        NgMap.getMap({id: id}).then(function (map) {
            setTimeout(() => {
                let center = map.getCenter();
                google.maps.event.trigger(map, 'resize');
                map.setCenter(center);
            }, 1000);
        });
    };

    $scope.currentNavItem = 0;
    $scope.selectedChart = 0;

    $scope.data = [
        {
            label: 'Speed',
            color: '#f00',
            min: 0,
            max: 35,
            units: 'MPH',
            displayAlways: false
        },
        {
            label: 'Motor RPM',
            color: '#0f0',
            min: 0,
            max: 3500,
            units: 'RPM',
            displayAlways: false
        },
        {
            label: 'Joules',
            color: '#00f',
            min: 0,
            max: 1000000,
            units: 'J',
            displayAlways: true
        },
        {
            label: 'Volts',
            color: '#0ff',
            min: 0,
            max: 30,
            units: 'V',
            displayAlways: false
        },
        {
            label: 'Current',
            color: '#f0f',
            min: 0,
            max: 50,
            units: 'A',
            displayAlways: false
        },
        {
            label: 'Lap Number',
            color: '#ff7f00',
            min: 0,
            max: 10,
            units: '',
            displayAlways: true
        }
    ];

    $scope.graphs = [];
    let Rickshaw = require('rickshaw');
    //let pallet = Rickshaw.Color.Palette({scheme: 'munin'});

    angular.element(document).ready(() => {

        let windowWidth = window.innerWidth;
        let width;

        if (windowWidth >= 1900)
            width = 900;
        else
            width = windowWidth;


        $scope.data.forEach((graphData) => {
            let graph = new Rickshaw.Graph({
                element: document.getElementById(graphData.label),
                width: width,
                height: 260,
                renderer: 'area',
                stroke: true,
                interpolation: 'linear',
                series: new Rickshaw.Series.FixedDuration([{
                    name: graphData.label,
                    color: graphData.color
                }], undefined, {
                    timeInterval: 250,
                    maxDataPoints: 120,
                    timeBase: new Date().getTime() / 1000,
                }),
                min: graphData.min,
                max: graphData.max
            });

            new Rickshaw.Graph.HoverDetail({
                graph: graph,
                yFormatter: (y) => {
                    return y.toFixed(2) + ' ' + graphData.units;
                }
            });

            new Rickshaw.Graph.Axis.Time({graph: graph});
            new Rickshaw.Graph.Axis.Y({graph: graph});

            $scope.graphs.push(graph);
        });
    });


    $scope.beginDataFetch = function () {
        socket.on("newData", parseData);
        socket.on("newLocation", parseLocation);
    };

    function parseData(newData) {
        if (newData !== null && newData !== undefined) {

            newData = JSON.parse(newData);
            if (Array.isArray(newData)) {
                console.log(newData);

                $scope.graphs.forEach((graph, index) => {

                    let data = {};

                    data[graph.element.id] = newData[index];

                    graph.series.addData(data);

                    graph.render();
                });
            }
        }
    }

    $scope.currentLap = 1;
    $scope.lapColors = [
        "#ff0000",
        "#07b71b",
        "#0000ff",
        "#680dcc",
        "#08ffd3",
        "#ffc900",
        "#ff00d9",
        "#ff6b00",
        "#623115",
        "#454545"];
    $scope.currentColor = $scope.lapColors[0];
    $scope.currentLocation = "NoLocation";
    $scope.polylineLocations = [];
    $scope.locationSpeed = {
        values: [],
        key: 'Location Speed',
        color: '#1596ff',
        area: true
    };

    function parseLocation(location) {
        console.log(location);

        $scope.currentLocation = [location.latitude, location.longitude];
        $scope.polylineLocations.push($scope.currentLocation);

        if ($scope.locationSpeed.values.length > 20)
            $scope.locationSpeed.values.shift();
        $scope.locationSpeed.values.push({x: new Date(), y: location.speed});
    }

    /**
     * Gets the list of files from the saveData folder
     */
    $scope.getSavedData = function () {
        "use strict";
        $scope.selectedData = undefined;
        socket.emit('getSavedData');
    };

    /**
     * Listening for the list of files from the saveData folder. When it gets it,
     * it will set the savedDataList equal to the array response from the server
     */
    socket.on("savedDataList", (savedData) => {
        "use strict";
        $scope.needRefresh = false;
        $scope.savedDataList = savedData;
    });

    socket.on("dataUnreadable", (filename) => {
        alert("'" + filename + "' was unreadable for some reason...");
    });

    /**
     * Emits a call to the server for when a filename is clicked from the list
     *
     * @param selectedFilename is the filename that was clicked on from the md-list
     */
    $scope.selectDataSet = function (selectedFilename) {
        "use strict";
        socket.emit("retrieveFile", selectedFilename);
    };

    $scope.selectedDataPolyline = [];

    /**
     * A listener for when the server sends the actual contents of a selected file over
     */
    socket.on("requestedFile", (data) => {
        $scope.selectedDataPolyline = [];
        $scope.selectedDataPolylineRemoved = [];

        data = JSON.parse(data);

        if (Array.isArray(data)) {
            $scope.selectedData = data;
            $scope.reviewSliderValue = data.length - 1;
            data.forEach((dataPoint) => {
                $scope.selectedDataPolyline.push([dataPoint.latitude, dataPoint.longitude]);
            });

            $scope.resizeMap('reviewMap');
        }
    });

    $scope.startPlayback = function () {
        $scope.timer = setInterval(() => {
            $scope.reviewSliderValue += 1;
        }, 10);
    };

    $scope.stopPlayback = function () {
        clearInterval($scope.timer);
    };

    /**
     * When the client is connected it disables the offline svg
     */
    socket.on('connect', () => {
        $scope.disconnected = false;
    });

    /**
     * When the client is disconnected it shows the offline svg
     */
    socket.on('disconnect', () => {
        $scope.disconnected = true;
    });

    /**
     * When you click the renameFile button, this function is called.
     *
     * It opens a prompt and allows you to enter a new filename for the file and makes sure
     * you don't put in any invalid characters.
     *
     * @param clickedFilename is the filename that was clicked
     */
    $scope.renameFile = function (clickedFilename) {
        let invalidCharacters = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'];
        let hasInvalidCharacter = false;

        let newName = prompt('Please enter a new name for the file: (avoid using \\, /, :, *, ?, ", <, >, |)', clickedFilename);
        if (newName) {
            invalidCharacters.forEach((invalidChar) => {
                if (newName.includes(invalidChar)) {
                    console.log(invalidChar);
                    hasInvalidCharacter = true;
                }
            });

            if (hasInvalidCharacter)
                alert("Please don't use invalid characters: " + invalidCharacters);
            else if (newName.includes("."))
                socket.emit("renameFile", [clickedFilename, newName]);
            else
                socket.emit("renameFile", [clickedFilename, newName + ".smv"]);

        } else
            alert("Can't be empty name!");
    };

    /**
     * This function is called when you click the delete button on a filename from
     * the md-list element
     *
     * @param dataSet is the file to be deleted by the server
     */
    $scope.deleteFile = function (dataSet) {
        socket.emit("deleteFile", dataSet);
    };

    /**
     * Serves as a notification that the server created the saveData folder as it
     * did not previously exist
     */
    socket.on("createdSavedDataFolder", () => {
        $scope.needRefresh = false;
        alert("Folder 'savedData/' did not exist, now it does.");
    });

    /**
     * When you click the 'Get Saved Data' button and there is no save data to return,
     * the server emits a 'noSavedData' call in order to notify the client that there
     * was 'No save data found!'
     */
    socket.on("noSavedData", () => {
        $scope.needRefresh = false;
        alert("No save data found!");
    });

    /**
     * When a client makes a change to the savedData folder such as renaming or deleting a file, this
     * 'needRefresh' event is called so that other clients are notified that before doing anything else,
     * they should refresh the list of saved data by clicking the 'Get Saved Data' button again.
     */
    socket.on("needRefresh", () => {
        $scope.needRefresh = true;
    });

    /**
     * When you click the retrieveCSV button on a filename in the md-list for the list of
     * saved data, this is called so it can send a message to the server that the client
     * wants the data downloaded in a csv format
     *
     * @param filename the clicked filename
     */
    $scope.retrieveCSV = function (filename) {
        let labels = [];

        $scope.data.forEach((graphData) => {
            labels.push(graphData.key);
        });

        socket.emit("getCSV", {filename: filename, labels: labels});
    };

    socket.on("convertedCSVFile", (convertedFile) => {
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(convertedFile.data));
        element.setAttribute('download', convertedFile.filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    });

    $scope.$watch("reviewSliderValue", (newValue) => {
        $scope.selectedDataPolyline = $scope.selectedDataPolyline.concat($scope.selectedDataPolylineRemoved);
        $scope.selectedDataPolylineRemoved = [];

        $scope.selectedDataPolylineRemoved = $scope.selectedDataPolyline.splice(newValue, $scope.selectedDataPolyline.length - 1);
    });

    $scope.selectedDataPolylineRemoved = [];
}]);
