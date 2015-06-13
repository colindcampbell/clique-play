'use strict';

/**
 * @ngdoc overview
 * @name cliquePlayApp
 * @description
 * # cliquePlayApp
 *
 * Main module of the application.
 */
angular.module('cliquePlayApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'firebase',
    'firebase.ref',
    'firebase.auth',
    'mgcrea.ngStrap',
    'ngIdle',
    'angularMoment'
  ]);


Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};