'use strict';

/**
 * @ngdoc filter
 * @name cliquePlayApp.filter:messageRange
 * @function
 * @description
 * # messageRange
 * Filter in the cliquePlayApp.
 */
angular.module('cliquePlayApp')
  .filter('messageRange', function () {
    return function (input,start) {
    	console.log(input);
      return 'messageRange filter: ' + input;
    };
  });

