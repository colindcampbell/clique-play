'use strict';

/**
 * @ngdoc service
 * @name cliquePlayApp.Yahtzee
 * @description
 * # Yahtzee
 * Service in the cliquePlayApp.
 */
angular.module('cliquePlayApp')
.service('YahtzeeService', function (RootRef, $firebaseArray, $firebaseObject, $routeParams) {
     
	var service = this;

	service.gameID = $routeParams.id;

	service.init = function(){
		service.game = $firebaseObject(RootRef.child('yahtzeeGames/'+service.gameID));
		service.game.$loaded().then(function(){
			if(!service.game.roll){
				service.game.roll = 1;
				service.game.$save();
			}
		})
		service.savedDice = $firebaseArray(RootRef.child('yahtzeeGames/'+service.gameID+'/savedDice'));
		service.dice = $firebaseArray(RootRef.child('yahtzeeGames/'+service.gameID+'/dice'));
		service.dice.$loaded().then(function(){
			if (!service.dice[0]) {
				for (var i = 0; i < 5; i++) {
					service.dice.$add({value:''});
				};
			};
		})
	}

	service.getRand = function(){
		var rand =  1 + Math.floor(Math.random() * 6);
		return rand;
	}

	service.rollDice = function(){
		if (service.game.roll<4) {
			service.game.roll++;
			service.game.$save();
			angular.forEach(service.dice, function(el, index){
				if(el.value!==0){
					var rand = service.getRand();
					el.value = rand;
					service.dice.$save(index);
				}
			})
			if (service.game.roll===4) {
				angular.forEach(service.dice,function(el,index) {
					if(el.value !== 0){
						service.savedDice.$add({value:service.dice[index].value});
					}
					el.value='';
					service.dice.$save(index);
				});
			};
		}else{
			service.finishTurn();
		};
	}

	service.saveDye = function(id,index){
		service.savedDice.$add({value:service.dice[index].value});
		service.dice[index].value = 0;
		service.dice.$save(index);
	}

	service.unsaveDye = function(id,index){
		if (service.game.roll !== 4) {
			service.dice[index].value = service.savedDice[index].value;
			service.dice.$save(index);
			service.savedDice.$remove(index);		
		};
	}

	service.finishTurn = function(){
		// stuff to do when finishing your turn
		service.game.roll = 1;
		service.game.$save();
		for (var i = 0; i < 5; i++) {
			service.dice[i].value = '';
			service.dice.$save(i);
			service.savedDice.$remove(i);
		};
	}
 
 });
