'use strict';
/**
 * @ngdoc function
 * @name cliquePlayApp.controller:ChatCtrl
 * @description
 * # ChatCtrl
 * A demo of using AngularFire to manage a synchronized list.
 */
angular.module('cliquePlayApp')
  .controller('ChatCtrl', function ($scope, user, Ref, $firebaseArray, $timeout) {
    $scope.user = user;
    // console.log(user);
    // synchronize a read-only, synchronized array of messages, limit to most recent 10
    $scope.messages = $firebaseArray(Ref.child('messages').limitToLast(30));

    // display any errors
    $scope.messages.$loaded().catch(alert);

    // provide a method for adding a message
    $scope.addMessage = function(newMessage) {
      if( newMessage ) {
        // push a message to the end of the array
        $scope.messages.$add({
          text: newMessage,
          userName:$scope.user.facebook.cachedUserProfile.first_name,
          avatarURL:$scope.user.facebook.cachedUserProfile.picture.data.url
        })
          // display any errors
          .catch(alert);
      }
    };

    function alert(msg) {
      $scope.err = msg;
      $timeout(function() {
        $scope.err = null;
      }, 5000);
    }
  });
