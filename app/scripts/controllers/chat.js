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
    $scope.userFullName = 
      $scope.user.facebook.cachedUserProfile.first_name+' '+
      $scope.user.facebook.cachedUserProfile.last_name;
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
          lastUserID:'',
          lastMessageBlockKey:'',
          password:pass
        })
        .then(function(){
          $scope.chatName = '';
          $scope.pass = '';
          $scope.confirm = '';
        });
        // $scope.chats.userIDs.$add({id:$scope.user.uid})
      }
    };

    // provide a method for adding a message
    $scope.addMessage = function(newMessage,chat,index) {
      var messageBlocksRef = $firebaseArray(Ref.child('chats/'+chat.$id+'/messageBlocks')),
          currentMessageRef = $firebaseArray(Ref.child('chats/'+chat.$id+'/messageBlocks/'+chat.lastMessageBlockKey+'/messages')),
          firstName = $scope.user.userName?
            $scope.user.userName:$scope.user.facebook.cachedUserProfile.first_name;

      if( newMessage ) {
        if( (chat.lastUserID) == ($scope.user.uid) ){
          // If the same user enters more text, it will be added to the current block
          currentMessageRef.$add({
            text:newMessage
          })
          .then(function(){
            $scope.scrollBot();
          })
          // display any errors
          .catch(alert);
        }else{
          // push a message to the end of the array
          messageBlocksRef.$add({
            firstName:firstName,
            fullName:$scope.userFullName,
            userID:$scope.user.uid,
            avatarURL:$scope.user.facebook.cachedUserProfile.picture.data.url,
            messages:{'-JpO':{text:newMessage}}
          })
          .then(function(ref){
            $scope.chats[index].lastUserID = $scope.user.uid;
            $scope.chats[index].lastMessageBlockKey = ref.key();
            $scope.chats.$save(index);
            $scope.scrollBot();
          })
          // display any errors
          .catch(alert);
        }
      }
    };

    $scope.scrollBot = function(){
      var elem = document.getElementById('chat-box');
      elem.scrollTop = elem.scrollHeight;
    };

    $scope.toggleChat = function(){
      $scope.chatOpen = !$scope.chatOpen
      // angular.forEach($scope.chats,function(value,key){
      //   $scope.chats[key].open = false;
      // });
    };

    function alert(msg) {
      $scope.err = msg;
      $timeout(function() {
        $scope.err = null;
      }, 5000);
    }
  });
