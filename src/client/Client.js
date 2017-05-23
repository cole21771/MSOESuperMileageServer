/**
 * Created by cole2 on 5/15/2017.
 */

const angularApp = angular.module('angularApp', ['ng', 'ngAnimate', 'ngAria', 'ngMessages', 'ngMaterial', 'nvd3']);

angularApp.controller('angularController', ['$scope', 'socket', function ($scope, socket) {
    "use strict";

    $scope.defaultData = [[], [], [], [], [], []];
    $scope.currentNavItem = 0;

    $scope.options = {
        chart: {
            type: 'lineChart',
            height: 450,
            margin: {
                top: 20,
                right: 20,
                bottom: 60,
                left: 55
            },
            x: function (d) {
                return d.label;
            },
            y: function (d) {
                return d.value;
            },
            showValues: true,

            valueFormat: function (d) {
                return d3.format(',.4f')(d);
            },
            transitionDuration: 500,
            xAxis: {
                axisLabel: 'Time (HH:MM:SS)'
            },
            yAxis: {
                axisLabel: 'Value',
                axisLabelDistance: 30
            }
        }
    };

    $scope.beginDataFetch = function () {
        $scope.data = $scope.defaultData;

        $scope.labels = [];
        $scope.dataFetch = true;
        socket.on("newData", parseData);
    };

    function parseData(newData) {
        console.log(newData);
        if (newData !== null && newData !== undefined) {

            newData = JSON.parse(newData);
            if (Array.isArray(newData)) {
                addValuesToGraph(newData);
            }
        }
    }

    $scope.stopDataFetch = function () {
        $scope.dataFetch = false;
        $scope.data = [[], [], [], []];
        $scope.labels = [];
        socket.removeListener("newData", parseData);
    };

    $scope.leftSwipe = function () {
        if ($scope.currentNavItem < 2) {
            $scope.currentNavItem++;
        }
    };

    $scope.rightSwipe = function () {
        if ($scope.currentNavItem > 0) {
            $scope.currentNavItem--;
        }
    };

    $scope.addRand = function () {
        "use strict";
        addValuesToGraph([Math.random(), Math.random(), Math.random(), Math.random()]);
    };

    function addValuesToGraph(newData) {
        "use strict";
        if ($scope.data[0].length > 20) {
            $scope.data.forEach(function (array) {
                array.shift();
            });
            $scope.labels.shift();
        }

        $scope.data.forEach(function (array, index) {
            array.push(newData[index]);
        });
        $scope.labels.push(new Date().toLocaleTimeString());
    }

    $scope.getSavedData = function () {
        "use strict";
        $scope.selectedData = undefined;
        socket.emit('getSavedData');
    };

    socket.on("savedDataList", (savedData) => {
        "use strict";
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

        let newName = prompt('Please enter a new name for the file: (avoid using \\, /, :, *, ?, ", <, >, |)');
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

    socket.on("createdSavedDataFolder", () => {
        alert("Folder 'savedData/' did not exist, now it does.");
    });

    socket.on("noSavedData", () => {
        alert("No save data found!");
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