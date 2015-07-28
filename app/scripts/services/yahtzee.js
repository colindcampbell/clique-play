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

	service.init = function(){
		service.diceState = [];
		service.gameID = $routeParams.id;
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
				for (var i = 0; i < service.dice.length; i++) {
					service.dice.$add({value:''});
				};
			};
		});
		service.setScoreboard();
	}

	service.setScoreboard = function(){
		service.ones = '';
		service.twos = '';
		service.threes = '';
		service.fours = '';
		service.fives = '';
		service.sixes = '';
		service.smallStraight = '';
		service.largeStraight = '';
		service.fullHouse = '';
		service.threeKind = '';
		service.fourKind = '';
		service.chance = '';
		service.yahtzee = '';
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
			service.updateDiceState();
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
			for (var i = 0; i < service.dice.length; i++) {
				if (service.dice[i].value===0) {
					service.dice[i].value = service.savedDice[index].value;
					break;
				};
			};
			service.dice.$save(index);
			service.savedDice.$remove(index);		
		};
	}

	service.updateDiceState = function(){
		service.diceState = [];
		for (var i = 0; i < service.dice.length; i++) {
			if (service.dice[i].value !== 0) {service.diceState.push(service.dice[i].value)};
		};
		for (var i = 0; i < service.savedDice.length; i++) {
			service.diceState.push(service.savedDice[i].value);
		};
		service.diceState.sort();
		// service.savedDice.sort(function(a,b){return a.value-b.value});
	};

	service.finishTurn = function(){
		// stuff to do when finishing your turn
		service.diceState = [];
		service.game.roll = 1;
		service.game.$save();
		for (var i = 0; i < 5; i++) {
			service.dice[i].value = '';
			service.dice.$save(i);
			service.savedDice.$remove(i);
		};
	}

	service.scoreCheck = {
		diceTotal: function(number){
			var total = 0;
			for (var i = 0; i < service.diceState.length; i++) {
				if (number) {
					if (service.diceState[i] === number) {total += number};
				}else{
					total += service.diceState[i];
				};
			};
			return total;
		},
		ofAKind: function(number){
			var oak = false;
			for (var i = 0; i <= service.diceState.length-number; i++) {
				var total = 0;
				for (var j = 0; j < number; j++) {
					if (service.diceState[i] === service.diceState[j]) {total+=1};
					if (total === number) {oak = true;break;};
				};
			};
			if (oak) {
				return service.scoreCheck.diceTotal();
			}else{
				return 0;
			};
		},
		smallStraight: function(){
			// first step remove any duplicates
			var diceNoDupes = [];
			for (var i = 0; i < service.diceState.length; i++) {
				if ( service.diceState[i] !== service.diceState[i+1] ) {
					diceNoDupes.push(service.diceState[i]);
				}else if ( i === service.diceState.length-1 ) {
					diceNoDupes.push(service.diceState[i]);
				};
			};
			switch(diceNoDupes.length){
				case 5:
					if ( diceNoDupes[0]+1 === diceNoDupes[1] ) {
						var total = 0;
						for (var i = 0; i < 3; i++) {
							if ( (diceNoDupes[i]+1) === diceNoDupes[i+1] ) {
								total += 1;
							};
						};
						if(total===3){return 30}else{return 0};
					}else if ( diceNoDupes[1]+1 === diceNoDupes[2] ) {
						var total = 0;
						for (var i = 1; i < 4; i++) {
							if ( (diceNoDupes[i]+1) === diceNoDupes[i+1] ) {
								total += 1;
							};
						};
						if(total===3){return 30}else{return 0};
					}else{
						return 0;
					}
					break;
				case 4:
					var total = 0;
					for (var i = 0; i < diceNoDupes.length-1; i++) {
						if ( (diceNoDupes[i]+1) === diceNoDupes[i+1] ) {
							total += 1;
						};
					};
					if(total===3){return 30}else{return 0};
					break;
				default:
					return 0;
					break;
			}
		},
		largeStraight: function(){
			var total = 0;
			for (var i = 0; i < service.diceState.length-1; i++) {
				if ( (service.diceState[i]+1) === service.diceState[i+1] ) {
					total += 1;
				};
			};
			if(total===4){return 40}else{return 0};
		},
		fullHouse: function(){
			if ( service.diceState[0] === service.diceState[1] ) {
				if ( service.diceState[0] === service.diceState[2] ) {
					if ( service.diceState[3] === service.diceState[4] ) {
						return 25;
					}else{
						return 0;
					}
				}else{
					if ( service.diceState[2] === service.diceState[3] && service.diceState[3] === service.diceState[4] ) {
						return 25;
					}else{
						return 0;
					};
				};
			}else{
				return 0;
			}
		},
		yahtzee: function(){
			var total = 0;
			for (var i = 0; i < service.diceState.length-1; i++) {
				if (service.diceState[i] === service.diceState[i+1]) {
					total += 1;
				};
			};
			if(total===4){return 50}else{return 0};
		}
	};
});
