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
    'ngIdle'
  ]);


$(function() {

  $('.user-chat').click(function(){
    console.log('message');
  })

   // var $scene = $('#scene').parallax({
   //    invertX:false,
   //    invertY:false,
   //    scalarX:4,
   //    scalarY:3
   //  });
   //  setInterval(function(){ 
   //    $('#scene .layer').each(function(){
   //     var zInd = $(this).children('div').css('z-index');
   //     var depth = (zInd * (100/12))/100;
   //     $(this).attr('data-depth',depth);
   //    })
   //    $scene.parallax('updateLayers');
   //  }, 5000);

});
