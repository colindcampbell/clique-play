'use strict';

angular.module('cliquePlayApp')
.controller('ChatCtrl', function ($scope, RootRef, ChatRoomsRef, ChatTextsRef, PresenceRef, ConnectionRef, Idle, $firebaseArray, $firebaseObject, $timeout, $interval, Auth, $modal, $location) {

  $scope.pwProtected = false;
  $scope.userChats = [];
  $scope.userMessageBlocks = [];
  $scope.userLoaded = false;
  $scope.chatRooms = $firebaseArray(ChatRoomsRef);
  $scope.userPresence;
  var amOnline = ConnectionRef;

  $scope.newChatModal = $modal({
    scope: $scope,
    template: '../../views/newChatModal.html',
    show: false,
    title:'New Chatroom',
    placement:'center'
  });

  $scope.loadProfile = function(){
    Idle.watch();
    $scope.userPresence = PresenceRef.child($scope.user.uid);
    amOnline.on('value', function(snapshot) {
      if (snapshot.val()) {
        $scope.$apply(function(){
          $scope.userPresence.onDisconnect().set('offline');
          $scope.userPresence.set('online');
        })
      }
    });
    $scope.$on('IdleStart', function () {
      $scope.userPresence.set('idle');
    });
    $scope.$on('IdleTimeout', function () {
      $scope.userPresence.set('offline');
      Auth.$unauth();
    });
    $scope.$on('IdleEnd', function (isIdle, isAway) {
      $scope.userPresence.set('online');
    });

    var profile = $firebaseObject(RootRef.child('users/'+$scope.user.uid));
    profile.$bindTo($scope, 'profile').then(function(unbind){$scope.unbindProfile = unbind;});
    profile.$loaded()
      .then(function(){
        $scope.userFullName = ($scope.profile.firstName && $scope.profile.lastName)?
        $scope.profile.firstName+' '+$scope.profile.lastName:$scope.profile.userName;
      }).catch(alert);
    $scope.userLoaded = true;
  };

  $scope.getChats = function(currentChatKey,key){
    var userChatTextMessages = $firebaseArray(ChatTextsRef.child(currentChatKey).child('messageBlocks').limitToLast(20)),
        userChatRoom = $firebaseObject(ChatRoomsRef.child(currentChatKey));
    userChatRoom.$loaded().then(function(ref){
      $scope.userChats[key] = ref;
      $scope.userChats[key]['_open'] = false;
      $scope.userChats[key]['_newMessage'] = false;
      userChatTextMessages.$loaded().then(function(ref){
        $scope.userMessageBlocks[key] = ref;
        userChatTextMessages.$watch(function(event){
          $scope.scrollBot();
          // Watch for added or changed children to notify the current user of a new message
          if( event.event==='child_added' ){
            var block = $firebaseObject(ChatRoomsRef.child($scope.userChats[key].$id));
            block.$loaded().then(function(ref){
              if (ref.lastUserID !== $scope.user.uid) {
                $scope.userChats[key]._newMessage = true;
              }
            });
          }else if( event.event==='child_changed' && $scope.userChats[key].lastUserID !== $scope.user.uid){
            $scope.userChats[key]._newMessage = true;
          }
        });
      });
    });
  };
  
  $scope.loadChats = function(){
    // Eventually load only chats for current user as well using fullChats
    $scope.userChatKeys = $firebaseArray(RootRef.child('users/'+$scope.user.uid+'/chatRooms'));
    $scope.userChatKeys.$loaded().then(function(chatKeys){
      angular.forEach(chatKeys, function(val,key){
        $scope.getChats(val.chatKey,key);
      });
      $scope.userChatKeys.$watch(function(event){
        if ( event.event==='child_added' ) {
          var key = $scope.userChats.length,
              chatKey = $firebaseObject(RootRef.child('users/'+$scope.user.uid+'/chatRooms/'+event.key));
          chatKey.$loaded().then(function(ref){
            $scope.getChats(ref.chatKey,key);
          });
        }else{
          console.log('child removed');
        }
      });
    });
  };

  $scope.user = Auth.$getAuth()?Auth.$getAuth():null;
  if ($scope.user && !$scope.userLoaded) {
    $scope.loadProfile();
    $scope.loadChats();
    $scope.userLoaded = true;
  }

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
  });

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
            newChatMember = $firebaseArray(RootRef.child('chatMembers/'+chatKey)),
            newChatTexts = $firebaseObject(RootRef.child('chatTexts/'+chatKey));
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
  $scope.addMessage = function(message,chat,index) {
    var chatRoomsRef = $firebaseObject(RootRef.child('chatRooms/'+chat.$id)),
        chatTextsMessageRef = $firebaseArray(RootRef.child('chatTexts/'+chat.$id+'/messageBlocks')),
        userName = $scope.profile.userName;
    if( message ) {
      if ( chat.lastUserID === $scope.user.uid ) {
        var currentMessageRef = $firebaseArray(RootRef.child('chatTexts/'+chat.$id+'/messageBlocks/'+chat.lastMessageBlockID+'/messages'));
        currentMessageRef.$loaded().then(function(){
          currentMessageRef.$add({message:message});
        });
      }else{
        chatTextsMessageRef.$add({
          messages:{'-JpO':{message:message}},
          avatarURL:$scope.profile.avatarURL,
          userName:$scope.user.uid
        })
        .then(function(ref){
          chatRoomsRef.lastUserID = $scope.user.uid;
          chatRoomsRef.lastMessageBlockID = ref.key();
          chatRoomsRef.$save();
        }).catch(alert);
      }
    }
  };

  $scope.joinChat = function(chat){
    $scope.userChatKeys.$add({chatKey:chat.$id});
  };

  $scope.scrollBot = function(){
    var boxes = document.getElementsByClassName('chat-box');
    window.setTimeout(function(){
      angular.forEach(boxes, function(el){
        if(el.scrollHeight){
          el.scrollTop = el.scrollHeight;
        }
      });
    }, 100)
  };

  $scope.toggleChat = function(index){
    $scope.userChats[index]._newMessage = false;
    if (!$scope.userChats[index]._open) {
      angular.forEach($scope.userChats, function(el){
        el._open=false;
      });
      $scope.userChats[index]._open = true;
      $scope.scrollBot();
    }else{
      $scope.userChats[index]._open = false;
    }
  };

  $scope.getMessageRange = function(index, messages){
    var newUser = false, i=index+1, range = [];
    range.push(messages[index]);
    while( newUser===false && i<messages.length ){
      if ( messages[i].userName===messages[i-1].userName ) {
        range.push(messages[i]);
        i++;
      }else{
        newUser = true;
      }
    }
    return range;
  };

  $scope.log = function(item){
    console.log(item);
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

  $scope.logout = function() {
    Auth.$unauth();
    $location.path('/home');
    $scope.userPresence.set('offline');
  };





})
.config(function(IdleProvider) {
    // configure Idle settings
    IdleProvider.idle(900); // in seconds
    IdleProvider.timeout(86400); // in seconds
});
