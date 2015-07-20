'use strict';

angular.module('cliquePlayApp')
.controller('YahtzeeCtrl', function ($scope,$modal,YahtzeeService) {

	this.yahtzeeService = YahtzeeService;

	this.userInit = function(){
    this.yahtzeeService.init();
  }

  this.userInit();

});
