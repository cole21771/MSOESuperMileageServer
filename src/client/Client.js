/**
 * Created by cole2 on 5/15/2017.
 */

const angularApp = angular.module('angularApp', ['ngMaterial', 'chart.js']);

angularApp.controller('angularController', function ($scope,socket) {
    "use strict";

    $scope.defaultData = [[],[],[],[]];
    $scope.currentNavItem = 'page1';

    $scope.beginDataFetch = function() {
        $scope.data = $scope.defaultData;
        $scope.labels = [];

        $scope.dataFetch = true;
        socket.on("newData", parseData);
    };

    function parseData(newData) {
        if (newData !== null && newData !== undefined) {
            newData = JSON.parse(newData);

            if (Array.isArray(newData)) {
                addValuesToGraph(newData);
            }
        }
    }

    $scope.stopDataFetch = function(){
        $scope.dataFetch = false;
        $scope.data = [[],[],[],[]];
        $scope.labels = [];
        socket.removeListener("newData", parseData);
    };

    $scope.addRand = function () {
        "use strict";
        addValuesToGraph([Math.random(), Math.random(), Math.random(), Math.random()]);
    };

    $scope.labels = [];
    $scope.series = ["Num 1", "Num 2", "Num 3", "Num 4"];

    $scope.options = {
        scales: {
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'Values'
                }
            }],
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'Time (HH:MM:SS)'
                }
            }]
        },
        elements : {
            line: {
                tension: 0
            }
        },
        responsive: false,
        animation: false,
    };

    function addValuesToGraph(newData) {
        "use strict";
        if ($scope.data[0].length > 20) {
            /*$scope.data.forEach(function(array){
                array.shift();
            });
            $scope.labels.shift();*/
        }

        $scope.data.forEach(function(array, index){
            array.push(newData[index]);
        });
        $scope.labels.push(new Date().toLocaleTimeString());
    }


});

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