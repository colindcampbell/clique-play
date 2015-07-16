'use strict';

/**
 * @ngdoc service
 * @name cliquePlayApp.Yahtzee
 * @description
 * # Yahtzee
 * Service in the cliquePlayApp.
 */
angular.module('cliquePlayApp')
.service('YahtzeeService', function () {
     
	var service = this;

	service.dice = ['','','','',''];
	service.savedDice = [];
	service.rolls = 1;

	service.getRand = function(){
		var rand =  1 + Math.floor(Math.random() * 6);
		return rand;
	}

	service.rollDice = function(){
		if (service.rolls<4) {
			for(var i = 0; i < service.dice.length; i++){
				var rand = service.getRand();
				service.dice[i] = rand;
			}
			service.rolls++;
			if (service.rolls===4) {
				angular.forEach(service.dice,function(el,index) {
					service.savedDice.push(service.dice[index]);
				});
				service.dice = [];
			};
		}else{
			// stuff to do when finishing your turn
			service.rolls = 1;
			service.dice = ['','','','',''];
			service.savedDice = [];
		};
	}

	service.saveDye = function(index){
		service.savedDice.push(service.dice[index]);
		service.dice.splice(index,1);
	}

	service.unsaveDye = function(index){
		service.dice.push(service.savedDice[index]);
		service.savedDice.splice(index,1);		
	}
 
 });
