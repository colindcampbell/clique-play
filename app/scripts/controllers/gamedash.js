'use strict';

angular.module('cliquePlayApp')
.controller('GameDashCtrl', function ($scope, user, RootRef, YahtzeeService, SocialService, YahtzeeGamesRef, YahtzeeRoomsRef, DotsRoomsRef, $firebaseArray, $firebaseObject, $location, $modal) {

	$scope.games = [
		{name:'yahtzee'},
		{name:'dots'},
		{name:'battleships'},
		{name:'memory'}
	]

	$scope.user = user;
	$scope.yahtzeeRooms = $firebaseArray(YahtzeeRoomsRef);
	$scope.dotsRooms = $firebaseArray(DotsRoomsRef);
	$scope.profile = $firebaseObject(RootRef.child('users/'+$scope.user.uid));

	$scope.init = function(){
		$scope.userGames = $firebaseArray(RootRef.child('users/'+$scope.user.uid+'/games'));
		$scope.userGames.$loaded().then(function(userGames){
			console.log(userGames);
	    angular.forEach(userGames, function(val,key){
	    	angular.forEach(val, function(status, gameID){
	    		if(gameID !== '$id' && gameID !== '$priority'){
	    			$scope.loadGame(val.$id, gameID);
	    		}
	    	})
	      // $scope.getGames(val.$id,false,val.$priority);
	      // $scope.updateChatPriorities(val.$id);
	    });
	  //   service.userChatKeysArray.$watch(function(event){
	  //     if ( event.event==='child_added' ) {
	  //       service.getChats(event.key,true,0);
	  //     }else if(event.event === 'child_moved'){
	  //       // var pos = service.userChats.map(function(e) { return e.$id; }).indexOf(event.key);
	  //       // service.userChats[pos].priority
	  //     }else{
	  //       // Add ablility to leave a chatroom
	  //       console.log('child removed');
	  //     }
	  //   });
			// console.log($scope.userYahtzeeKeys);
		})
	}


	$scope.newGameModal = $modal({
    scope: $scope,
    template: '../../views/newGameModal.html',
    show: false,
    title:'New Chatroom',
    placement:'center'
  });

	$scope.createGame = function(gameType, gameName, description){
		switch (gameType) {
			case 'yahtzee':
				$scope.yahtzeeRooms.$add({
					owner:$scope.profile.userName,
					name:gameName,
					description:description
				}).then(function(ref){
					var gameKey = ref.key(),
							newGame = $firebaseObject(YahtzeeGamesRef.child(gameKey));
					newGame.name = gameName;
					newGame.description = description;
					newGame.$save();
					$scope.joinGame(gameType,gameKey);
				});
			break;
			case 'dots':
				$scope.dotsRooms.$add({
					owner:$scope.profile.userName,
					name:gameName,
					description:description
				}).then(function(ref){
					var gameKey = ref.key(),
							newGame = $firebaseObject(YahtzeeGamesRef.child(gameKey));
					newGame.name = gameName;
					newGame.description = description;
					newGame.$save();
					$scope.joinGame(gameType,gameKey);
				});
			break;
		}
	}

	$scope.joinGame = function(gameType, gameKey){
		
		if($scope.userGames){

		}else{
			var newGamePlayers = $firebaseObject(RootRef.child(gameType+'Games/'+gameKey+'/players/'+$scope.user.uid)),
				newUserGame = $firebaseObject(RootRef.child('users/'+$scope.user.uid+'/games/'+gameType+'Rooms/'+gameKey));
			newGamePlayers.member = true;
			newGamePlayers.$save();
	    newUserGame.member = true;
	    newUserGame.$priority = 0 - Date.now();
	    newUserGame.$save();
			$location.path('/'+gameType+'/'+gameKey);
		}
	}


	$scope.loadGame = function(gameType, gameID){
		console.log(gameType, gameID);
	}

	$scope.init();

});
