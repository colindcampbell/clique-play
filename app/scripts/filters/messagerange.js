'use strict';

angular.module('cliquePlayApp')
  .filter('messageRange', function () {
    return function (input,start) {
    	console.log(input);
      return 'messageRange filter: ' + input;
    };
  });

