/**
 * Created by cole2 on 5/15/2017.
 */

//import * as io from "socket.io/lib/client";
const angularApp = angular.module('angularApp', ['ngMaterial']);
//let socket = io();

angularApp.controller('angularController', function($scope, socket) {
    "use strict";

    socket.on("newData", function(newData){
        if (newData !== null && newData !== undefined) {
            newData = JSON.parse(newData);

            if (Array.isArray(newData))
                $scope.data += "[" + newData + "]\n";
        }
    });


    $scope.$watch('checkingBox', function(value){
        socket.emit("newData", value);
    });


});

angularApp.factory('socket', function ($rootScope) {
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