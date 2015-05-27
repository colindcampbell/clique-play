'use strict';

/**
 * @ngdoc function
 * @name cliquePlayApp.controller:GamedashCtrl
 * @description
 * # GamedashCtrl
 * Controller of the cliquePlayApp
 */
angular.module('cliquePlayApp')
  .controller('GameDashCtrl', function ($scope, user) {
  	$scope.user = user;
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
