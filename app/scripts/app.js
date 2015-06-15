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

document.addEventListener("DOMContentLoaded", function(event) { 
  // Create the measurement node
  var scrollDiv = document.createElement("div");
  scrollDiv.className = "scrollbar-measure";
  document.body.appendChild(scrollDiv);

  // Get the scrollbar width
  var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  if(scrollbarWidth !== 17){
    document.body.className += ' scroll-narrow';
  }
  // console.warn(scrollbarWidth); // Mac:  15
  // window.scrollWidth = scrollbarWidth;

  // Delete the DIV 
  document.body.removeChild(scrollDiv);
});