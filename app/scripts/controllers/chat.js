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
    $scope.chatOpen = false;
    $scope.pwProtected = false;
    // $scope.pass = '';
    // $scope.password = '';
    // console.log(user);
    // synchronize a read-only, synchronized array of messages, limit to most recent 10
    // $scope.myChats = $firebaseArray(Ref.child('chats').orderByChild('users/uid').equalTo(user.uid));
    // $scope.allChats = $firebaseArray(Ref.child('chats'));
    $scope.messages = $firebaseArray(Ref.child('messages').limitToLast(30));
    $scope.chats = $firebaseArray(Ref.child('chats'));
    // $scope.chats.userIDs = $firebaseArray($scope.chats.child('userIDs'));
    // $scope.messages.$loaded().then(function(){
    //   $scope.scrollBot();
    // })


    // display any errors
    $scope.messages.$loaded().catch(alert);
    // $scope.chats.$loaded().catch(alert);

    $scope.createChat = function(pass, confirm){
      if( $scope.chatName ) {
        if( $scope.pwProtected && !pass ) {
          $scope.err = 'Please enter a password';
        }
        else if( $scope.pwProtected && (pass !== confirm) ) {
          $scope.err = 'Passwords do not match';
        }
        if ( !$scope.pwProtected ){
          pass = null;
        }
        // pass = $scope.pwProtected?pass:null;
        $scope.chats.$add({
          name:$scope.chatName,
          description:$scope.description,
          creator:$scope.user.uid,
          pwProtected:$scope.pwProtected,
          password:pass
        })
        .then(function(){
          $scope.chatName = '';
          $scope.pass = '';
          $scope.confirm = '';
        })
        // $scope.chats.userIDs.$add({id:$scope.user.uid})
      }
    }

    // provide a method for adding a message
    $scope.addMessage = function(newMessage) {
      if( newMessage ) {
        // push a message to the end of the array
        $scope.messages.$add({
          text: newMessage,
          userName:$scope.user.facebook.cachedUserProfile.first_name,
          avatarURL:$scope.user.facebook.cachedUserProfile.picture.data.url
        })
        .then($scope.scrollBot())
        // display any errors
        .catch(alert);
      }
    };

    $scope.scrollBot = function(){
      var elem = document.getElementById('chat-box');
      elem.scrollTop = elem.scrollHeight;
    }

    $scope.toggleChat = function(){
      $scope.chatOpen = !$scope.chatOpen;
    }

    function alert(msg) {
      $scope.err = msg;
      $timeout(function() {
        $scope.err = null;
      }, 5000);
    }
  });
