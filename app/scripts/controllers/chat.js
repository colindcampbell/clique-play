'use strict';
/**
 * @ngdoc function
 * @name cliquePlayApp.controller:ChatCtrl
 * @description
 * # ChatCtrl
 * A demo of using AngularFire to manage a synchronized list.
 */
angular.module('cliquePlayApp')
  .controller('ChatCtrl', function ($scope, user, Ref, $aside, $firebaseArray, $firebaseObject, $timeout) {
    $scope.user = user;
    var profile = $firebaseObject(Ref.child('users/'+user.uid));
    profile.$bindTo($scope, 'profile');
    profile.$loaded()
      .then(function(data){
        $scope.userFullName = (data.firstName && data.lastName)?
        data.firstName+' '+
        data.lastName:
        data.userName;
      }).catch(alert);

    $scope.chatOpen = false;
    $scope.pwProtected = false;
    $scope.openChats = [];
    $scope.messages = $firebaseArray(Ref.child('messages').limitToLast(30));

    $scope.chats = $firebaseArray(Ref.child('chats'));
    $scope.chats.$loaded()
      .then(function(){
        angular.forEach($scope.chats, function(){
          $scope.openChats.push({open:false,newMessage:false});
        });
        $scope.chats.$watch(function(event){
          var chatIndex = $scope.chats.$indexFor(event.key);
          if($scope.chats.length > $scope.openChats.length){
            $scope.openChats.push({open:false});
          };
          if ( event.event=='child_changed' ) {
            $scope.openChats[chatIndex].newMessage = true;
          };
        });
      });

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
          firstName = $scope.profile.userName;

      if( newMessage ) {
        if( (chat.lastUserID) === ($scope.user.uid) ){
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
            avatarURL:$scope.profile.avatarURL,
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

    $scope.toggleChat = function(index){
      $scope.openChats[index].newMessage = false;
      if (!$scope.openChats[index].open) {
        angular.forEach($scope.openChats, function(element){
          element.open=false;
        });
        $scope.openChats[index].open = true;
      }else{
        $scope.openChats[index].open = false;
      }
      // $scope.scrollBot();
    };

    // $scope.chatAside = $aside({
    //   "title": 'My Chats',
    //   scope: $scope, 
    //   template: 'views/chatAside.html',
    //   show: false
    // });

    // $scope.chatAside.$promise.then(function() {
    //   // $scope.chatAside.show();
    //   $scope.chatAsideReady = true;
    // });

    function alert(msg) {
      $scope.err = msg;
      $timeout(function() {
        $scope.err = null;
      }, 5000);
    }
  });
