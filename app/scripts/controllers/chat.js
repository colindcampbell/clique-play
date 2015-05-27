'use strict';
/**
 * @ngdoc function
 * @name cliquePlayApp.controller:ChatCtrl
 * @description
 * # ChatCtrl
 * A demo of using AngularFire to manage a synchronized list.
 */
angular.module('cliquePlayApp')
  .controller('ChatCtrl', function ($scope, Ref, $firebaseArray, $firebaseObject, $timeout, $interval,Auth) {

    $scope.chatOpen = false;
    $scope.pwProtected = false;
    $scope.openChats = [];
    $scope.userChats = [];
    $scope.userMessageBlocks = [];
    $scope.userLoaded = false;
    $scope.chatRooms = $firebaseArray(Ref.child('chatRooms'));

    // $interval(function(){
    //   console.log($scope.userChats)
    // }, 10000);

    $scope.loadProfile = function(){
      var profile = $firebaseObject(Ref.child('users/'+$scope.user.uid));
      profile.$bindTo($scope, 'profile').then(function(unbind){$scope.unbindProfile = unbind;});
      profile.$loaded()
        .then(function(){
          $scope.userFullName = ($scope.profile.firstName && $scope.profile.lastName)?
          $scope.profile.firstName+' '+$scope.profile.lastName:$scope.profile.userName;
        }).catch(alert);
      $scope.userLoaded = true;
    }

    $scope.getChats = function(currentChatKey,key){
      var userChatTextMessages = $firebaseArray(Ref.child('chatTexts').child(currentChatKey).child('messageBlocks').limitToLast(20)),
          userChatText = $firebaseObject(Ref.child('chatRooms').child(currentChatKey));
      userChatText.$loaded().then(function(ref){
        $scope.userChats[key] = ref;
        $scope.openChats[key] = ({open:false,newMessage:false});
        userChatTextMessages.$loaded().then(function(ref){
          $scope.userMessageBlocks[key] = ref;
          console.log($scope.userMessageBlocks);
        })
      })
    }
    
    $scope.loadChats = function(){
      // Eventually load only chats for current user as well using fullChats
      $scope.userChatKeys = $firebaseArray(Ref.child('users/'+$scope.user.uid+'/chatRooms'));
      $scope.userChatKeys.$loaded().then(function(chatKeys){
        angular.forEach(chatKeys, function(val,key){
          $scope.getChats(val.chatKey,key);
        })
        $scope.userChatKeys.$watch(function(event){
          if ( event.event==='child_added' ) {
            var key = $scope.userChats.length,
                chatKey = $firebaseObject(Ref.child('users/'+$scope.user.uid+'/chatRooms/'+event.key));
            chatKey.$loaded().then(function(ref){
              $scope.getChats(ref.chatKey,key);
            })
          }else{
            console.log('child removed');
          };
        })
      })
    }

    $scope.user = Auth.$getAuth()?Auth.$getAuth():null;
    if ($scope.user && !$scope.userLoaded) {
      $scope.loadProfile();
      $scope.loadChats();
      $scope.userLoaded = true;
    };

    Auth.$onAuth(function(authData){
      if(!authData && $scope.user){
        $scope.userLoaded=false;
        $scope.userChats=[];
        $scope.unbindProfile();
        $scope.profile=null;
        $scope.user=null;
      }
      if(authData && !$scope.userLoaded){
        $scope.user = authData;
        $scope.loadProfile();
        $scope.loadChats();
      }
    })

    $scope.createChat = function(pass, confirm, chatName, description){
      if( chatName ) {
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
        $scope.chatRooms.$add({
          name:chatName,
          description:description,
          creator:$scope.user.uid,
          lastUserID:'',
          pwProtected:$scope.pwProtected,
          password:pass
        })
        .then(function(ref){
          var chatKey = ref.key(),
              newChatMember = $firebaseArray(Ref.child('chatMembers/'+chatKey)),
              newChatTexts = $firebaseObject(Ref.child('chatTexts/'+chatKey));
          newChatTexts.name = chatName;
          newChatTexts.description = description;
          newChatTexts.creator = $scope.user.uid;
          newChatTexts.$save();
          newChatMember.$add({userID:$scope.user.uid});
          $scope.userChatKeys.$add({chatKey:chatKey});
          $scope.chatName = '';
          $scope.description = '';
          $scope.pass = '';
          $scope.confirm = '';
        });
        // $scope.chats.userIDs.$add({id:$scope.user.uid})
      }
    };

    // provide a method for adding a message
    $scope.addMessage = function(newMessage,chat,index) {
      var chatRoomsRef = $firebaseObject(Ref.child('chatRooms/'+chat.$id)),
          chatTextsMessageRef = $firebaseArray(Ref.child('chatTexts/'+chat.$id+'/messageBlocks')),
          userName = $scope.profile.userName;
      if( newMessage ) {
        if ( chat.lastUserID === $scope.user.uid ) {
          var currentMessageRef = $firebaseArray(Ref.child('chatTexts/'+chat.$id+'/messageBlocks/'+chat.lastMessageBlockID+'/messages'))
          currentMessageRef.$loaded().then(function(){
            currentMessageRef.$add({message:newMessage})
          })
        }else{
          chatTextsMessageRef.$add({
            messages:{'-JpO':{message:newMessage}},
            avatarURL:$scope.profile.avatarURL,
            userName:$scope.user.uid
          })
          .then(function(ref){
            chatRoomsRef.lastUserID = $scope.user.uid;
            chatRoomsRef.lastMessageBlockID = ref.key();
            chatRoomsRef.$save();
          }).catch(alert);
        };
      }
    };

    $scope.joinChat = function(chat){
      $scope.userChatKeys.$add({chatKey:chat.$id});
    }

    $scope.scrollBot = function(){
      var boxes = document.getElementsByClassName('chat-box');
      angular.forEach(boxes, function(el){
        if(el.scrollHeight){
          el.scrollTop = el.scrollHeight;
        }
      });
    };

    $scope.toggleChat = function(index){
      $scope.openChats[index].newMessage = false;
      if (!$scope.openChats[index].open) {
        angular.forEach($scope.openChats, function(el){
          el.open=false;
        });
        $scope.openChats[index].open = true;
        $scope.scrollBot();
      }else{
        $scope.openChats[index].open = false;
      }
    };

    $scope.getMessageRange = function(index, messages){
      var newUser = false, i=index+1, range = [];
      range.push(messages[index]);
      while(newUser==false && i<messages.length){
        if (messages[i].userName == messages[i-1].userName) {
          range.push(messages[i]);
          i++;
        }else{
          newUser = true;
        };
      }
      return range
    }

    $scope.log = function(item){
      console.log(item);
    }

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
