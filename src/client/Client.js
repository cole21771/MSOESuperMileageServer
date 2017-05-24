/**
 * Created by cole2 on 5/15/2017.
 */

const angularApp = angular.module('angularApp', ['ng', 'ngAnimate', 'ngAria', 'ngMessages', 'ngMaterial', 'nvd3']);

angularApp.controller('angularController', ['$scope', 'socket', function ($scope, socket) {
    "use strict";

    $scope.currentNavItem = 0;
    $scope.selectedChart = 0;

    $scope.data = [
        {
            values: [],
            key: 'Speed',
            color: '#f00',
            area: true
        },
        {
            values: [],             //values - represents the array of {x,y} data points
            key: 'Engine Temp',           //key  - the name of the series.
            color: '#0f0',          //color - optional: choose your own line color.
            area: true              //area - set to true if you want this line to turn into a filled area chart.
        },
        {
            values: [],
            key: 'Lap Number',
            color: '#00f',
            area: true
        },
        {
            values: [],
            key: 'AFR',
            color: '#0ff',
            area: true
        },
        {
            values: [],
            key: 'Throttle Position',
            color: '#f0f',
            area: true
        },
        {
            values: [],
            key: 'Motor RPM',
            color: '#ff7f00',
            area: true
        }
    ];

    $scope.options = {
        chart: {
            type: 'lineChart',
            height: 450,
            margin: {
                top: 20,
                right: 50,
                bottom: 60,
                left: 75
            },
            x: function (d) {
                return d.x;
            },
            y: function (d) {
                return d.y;
            },
            useInteractiveGuideline: true,
            duration: 0,
            xAxis: {
                axisLabel: 'Time (HH:MM:SS)',
                tickFormat: function (d) {
                    return new Date(d).toLocaleTimeString();
                }
            },
            yAxis: {
                axisLabel: 'Values'
            }
        }
    };

    $scope.beginDataFetch = function () {
        socket.on("newData", parseData);
    };

    function parseData(newData) {
        if (newData !== null && newData !== undefined) {

            newData = JSON.parse(newData);
            if (Array.isArray(newData)) {
                console.log(newData);
                addValuesToGraph(newData);
            }
        }
    }

    function addValuesToGraph(newData) {
        "use strict";

        if ($scope.data[0].values.length > 20) {
            $scope.data.forEach(function (graph) {
                graph.values.shift();
            });
        }

        $scope.data.forEach(function (graph, index) {
            graph.values.push({x: new Date(), y: newData[index]});
        });

        if ($scope.shouldRender && $scope.currentNavItem === 1)
            $scope.api[$scope.selectedChart].update();
    }

    $scope.getSavedData = function () {
        "use strict";
        $scope.selectedData = undefined;
        socket.emit('getSavedData');
    };

    socket.on("savedDataList", (savedData) => {
        "use strict";
        $scope.needRefresh = false;
        $scope.savedDataList = savedData;
    });

    $scope.selectDataSet = function (selectedDataSet) {
        "use strict";
        socket.emit("retrieveDataSet", selectedDataSet);
    };

    socket.on("dataSet", (data) => {
        $scope.selectedData = data;
    });

    socket.on('connect', () => {
        $scope.disconnected = false;
    });

    socket.on('disconnect', () => {
        $scope.disconnected = true;
    });

    $scope.renameFile = function (clickedDataSet) {
        let invalidCharacters = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'];
        let hasInvalidCharacter = false;

        let newName = prompt('Please enter a new name for the file: (avoid using \\, /, :, *, ?, ", <, >, |)', clickedDataSet);
        if (newName) {
            invalidCharacters.forEach((invalidChar) => {
                if (newName.includes(invalidChar)) {
                    console.log(invalidChar);
                    hasInvalidCharacter = true;
                }
            });

            if (hasInvalidCharacter)
                alert("Please don't use invalid characters: " + invalidCharacters);
            else
                socket.emit("renameFile", [clickedDataSet, newName]);

        } else
            alert("Can't be empty name!");
    };

    $scope.deleteFile = function (dataSet) {
        socket.emit("deleteFile", dataSet);
    };

    socket.on("createdSavedDataFolder", () => {
        $scope.needRefresh = false;
        alert("Folder 'savedData/' did not exist, now it does.");
    });

    socket.on("noSavedData", () => {
        $scope.needRefresh = false;
        alert("No save data found!");
    });

    socket.on("needRefresh", () => {
        $scope.needRefresh = true;
    });

}]);

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