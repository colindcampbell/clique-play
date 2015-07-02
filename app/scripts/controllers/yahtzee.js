'use strict';

angular.module('cliquePlayApp')
.controller('YahtzeeCtrl', function ($scope,$modal) {

	$scope.dice = [];

	$scope.getRand = function(){
		var rand =  1 + Math.floor(Math.random() * 6);
		return rand;
	}

	$scope.rollDice = function(){
		$scope.dice = [];
		for(var i = 0; i < 6; i++){
			var rand = $scope.getRand();
			$scope.dice.push(rand);
		}
	}

});
