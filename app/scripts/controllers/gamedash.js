'use strict';

angular.module('cliquePlayApp')
.controller('GameDashCtrl', function ($scope, user, RootRef, YahtzeeGamesRef, YahtzeeRoomsRef, $firebaseArray, $firebaseObject, $location, $modal) {

	$scope.games = [
		{name:'yahtzee'},
		{name:'dots'},
		{name:'battleships'},
		{name:'memory'}
	]

	$scope.user = user;
	$scope.yahtzeeRooms = $firebaseArray(YahtzeeRoomsRef);
	$scope.profile = $firebaseObject(RootRef.child('users/'+$scope.user.uid));
	$scope.userYahtzeeKeys = $firebaseArray(RootRef.child('users/'+$scope.user.uid+'/yahtzeeRooms'));

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
							newGame = $firebaseArray(YahtzeeGamesRef.child(gameKey)),
							newGamePlayers = $firebaseArray(YahtzeeGamesRef.child(gameKey).child('players'));
					newGame.$loaded().then(function(){
						newGame.name = gameName;
						newGame.description = description;
						newGame.$save();
					})
					newGamePlayers.$add({userID:$scope.user.uid});
					$scope.userYahtzeeKeys.$add({gameKey:gameKey});
					$location.path('/yahtzee/'+ref.key());
				});
			break;
		}
	}

});
