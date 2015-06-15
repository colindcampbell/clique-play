'use strict';

angular.module('cliquePlayApp')
.controller('ChatCtrl', function ($scope, RootRef, ChatRoomsRef, ChatTextsRef, PresenceRef, ConnectionRef, Idle, $firebaseArray, $firebaseObject, $timeout, $interval, Auth, $modal, $alert, $location) {

  $scope.focusChat;
  $scope.search = {};
  $scope.pwProtected = false;
  $scope.showUserSearch = false;
  $scope.showChatSearch = false;
  $scope.userChats = [];
  $scope.userMessageBlocks = {};
  $scope.userLoaded = false;
  $scope.chatRooms = $firebaseArray(ChatRoomsRef.orderByChild('privateChat').equalTo(false));
  var amOnline = ConnectionRef, userPresence, profile;

  $scope.newChatModal = $modal({
    scope: $scope,
    template: '../../views/newChatModal.html',
    show: false,
    title:'New Chatroom',
    placement:'center'
  });

  $scope.newUserModal = $modal({
    scope: $scope,
    template: '../../views/newUserModal.html',
    show: false,
    title:'Add Users',
    placement:'center'
  });

  $scope.init = function(){
    $scope.user = Auth.$getAuth()?Auth.$getAuth():null;
    if ($scope.user && !$scope.userLoaded) {
      $scope.loadUserInfo();
      $scope.userLoaded = true;
    }
    Auth.$onAuth(function(authData){
      if(!authData && $scope.user){
        // user logs out
        $scope.userLoaded=false;
        $scope.userChats=[];
        $scope.unbindProfile();
        $scope.profile=null;
        $scope.user=null;
      }
      if(authData && !$scope.userLoaded){
        $scope.user = authData;
        $scope.loadUserInfo();
      }
    });
  }

  // Load Chats and Games that user belongs too and set user status
  $scope.loadUserInfo = function(){
    $scope.setPresence();
    // Get User's Chats
    $scope.userChatKeysArray = $firebaseArray(RootRef.child('users/'+$scope.user.uid+'/chatRooms').orderByPriority());
    $scope.userChatKeysArray.$loaded().then(function(chatKeys){
      angular.forEach(chatKeys, function(val,key){
        $scope.getChats(val.$id,false,val.$priority);
        $scope.updateChatPriorities(val.$id);
      });
      $scope.userChatKeysArray.$watch(function(event){
        // console.log($scope.userChatKeys);
        if ( event.event==='child_added' ) {
          $scope.getChats(event.key,true,0);
        }else if(event.event === 'child_moved'){
          // var pos = $scope.userChats.map(function(e) { return e.$id; }).indexOf(event.key);
          // $scope.userChats[pos].priority
        }else{
          // Add ablility to leave a chatroom
          console.log('child removed');
        }
      });
    });
    // Get User's Games
  };

  $scope.getChats = function(currentChatKey,newChat,priority){
    var userChatTextMessages = $firebaseArray(ChatTextsRef.child(currentChatKey).child('messageBlocks').limitToLast(20)),
        chatRoomRef = $firebaseObject(ChatRoomsRef.child(currentChatKey)),
        chatMembers = RootRef.child('chatMembers/'+currentChatKey);
    chatRoomRef.$loaded().then(function(ref){
      $scope.userChats.push(ref);
      var pos = $scope.userChats.length - 1;
      chatMembers.on('value',function(snapshot){
        $scope.userChats[pos]._members = $firebaseObject(chatMembers);
      })
      $scope.userChats[pos]._open = false;
      $scope.userChats[pos]._newMessage = false;
      $scope.userChats[pos]._priority = priority;
      userChatTextMessages.$loaded().then(function(ref){
        $scope.userMessageBlocks[currentChatKey] = ref;
        chatRoomRef.$watch(function(event){
          var keyRef = RootRef.child('users/'+$scope.user.uid+'/chatRooms/'+event.key);
          keyRef.once('value',function(){
            var priority = 0-Date.now();
            keyRef.setPriority(priority);
          })
          $scope.scrollBot();
          var newPos = $scope.userChats.map(function(e) { return e.$id; }).indexOf(event.key);
          if(chatRoomRef.lastUserID !== $scope.user.uid && !$scope.userChats[newPos]._open){
            $scope.userChats[newPos]._newMessage = true;
            $scope.userChats[newPos]._priority = 0 - Date.now();
          }
        })
      });
    });
  };

  $scope.setPresence = function(){
    // Load user profile and update presence
    profile = $firebaseObject(RootRef.child('users/'+$scope.user.uid));
    profile.$bindTo($scope, 'profile').then(function(unbind){$scope.unbindProfile = unbind;});
    profile.$loaded()
      .then(function(){
        if($scope.user.provider == 'anonymous'){return;};
        $scope.user._presenceSet = true;
        $scope.userLoaded = true;
        $scope.userFullName = ($scope.profile.firstName && $scope.profile.lastName)?
        $scope.profile.firstName+' '+$scope.profile.lastName:$scope.profile.userName;
        Idle.watch();
        userPresence = PresenceRef.child($scope.user.uid);
        amOnline.on('value', function(snapshot) {
          if (snapshot.val()) {
            userPresence.onDisconnect().setWithPriority({
              status:'offline',
              avatarURL:$scope.profile.avatarURL,
              userName:$scope.profile.userName,
              lastOnline:Date.now()},0-Date.now());
            if($scope.profile.avatarURL){userPresence.update({avatarURL:$scope.profile.avatarURL})};
            if($scope.profile.userName){userPresence.update({userName:$scope.profile.userName})};
            userPresence.update({status:'online'});
            userPresence.setPriority(null)
          }
        });
        $scope.$on('IdleStart', function () {
          userPresence.update({status:'idle'});
          userPresence.setPriority(Date.now());
        });
        $scope.$on('IdleTimeout', function () {
          userPresence.update({status:'offline'});
          userPresence.setPriority(0-Date.now());
          Auth.$unauth();
        });
        $scope.$on('IdleEnd', function (isIdle, isAway) {
          userPresence.update({status:'online'});
          userPresence.setPriority(null);
        });
      }).catch(alert);

    // Will eventually be friends
    var users = PresenceRef;
    users.orderByPriority().on('value', function(){
      $scope.users = $firebaseObject(users);
      $scope.usersArray = $firebaseArray(users);
    })
  }

  $scope.updateChatPriorities = function(chatID){
    var userChatKey = RootRef.child('users/'+$scope.user.uid+'/chatRooms/'+chatID);
    var chatRoomRef = RootRef.child('chatRooms/'+chatID);
    userChatKey.once('value',function(userSnap){
      chatRoomRef.once('value',function(chatSnap){
        var priority = 0-chatSnap.val().lastMessageTime;
        userChatKey.setPriority(priority);
      })
    })
  }

  $scope.createChat = function(chatName, description, privateChat, userIDs){
    if(!privateChat){privateChat=false}
    $scope.chatRooms.$add({
      name:chatName,
      description:description,
      creator:$scope.user.uid,
      lastUserID:'',
      lastMessageTime:0,
      privateChat:privateChat
    })
    .then(function(ref){
      var chatKey = ref.key(),
          newChatMember = $firebaseObject(RootRef.child('chatMembers/'+chatKey)),
          newChatTexts = $firebaseObject(RootRef.child('chatTexts/'+chatKey)),
          newUserChat = $firebaseObject(RootRef.child('users/'+$scope.user.uid+'/chatRooms/'+chatKey));
      if (userIDs[0]){
        angular.forEach(userIDs, function(id){
          var otherUserChat = $firebaseObject(RootRef.child('users/'+id+'/chatRooms/'+chatKey));
          otherUserChat.member = true;
          otherUserChat.$priority = 0-Date.now();
          otherUserChat.$save();
          newChatMember[id] = ({member:true});
          newChatMember.$save();
        })
      }
      newChatTexts.name = chatName;
      newChatTexts.description = description;
      newChatTexts.creator = $scope.user.uid;
      newChatTexts.$save();
      newChatMember[$scope.user.uid] = ({member:true});
      newChatMember.$save();
      newUserChat.member = true;
      newUserChat.$priority = 0 - Date.now();
      newUserChat.$save();
      $scope.chatName = '';
      $scope.description = '';
      $scope.pass = '';
      $scope.confirm = '';
    });
  };

  // provide a method for adding a message
  $scope.addMessage = function(message,chat,index) {
    if(message) {
      var chatRoomRef = RootRef.child('chatRooms/'+chat.$id);
      if (chat.lastUserID === $scope.user.uid){
        var currentMessageRef = RootRef.child('chatTexts/'+chat.$id+'/messageBlocks/'+chat.lastMessageBlockID+'/messages'),
            currentMessageBlockRef = RootRef.child('chatTexts/'+chat.$id+'/messageBlocks/'+chat.lastMessageBlockID);
        currentMessageRef.once('value',function(){
          currentMessageRef.push({message:message});
        });
        currentMessageBlockRef.once('value',function(){
          currentMessageBlockRef.update({lastUpdated:Date.now()});
        })
        chatRoomRef.once('value', function(dataSnapshot) {
          chatRoomRef.update({lastMessageTime:Date.now()});
          // chatRoomRef.setPriority(0 - Date.now());
        });
      }else{
        var chatTextsMessageRef = $firebaseArray(RootRef.child('chatTexts/'+chat.$id+'/messageBlocks'));
        chatTextsMessageRef.$add({
          messages:{'-JpO':{message:message}},
          userName:$scope.user.uid,
          lastUpdated:Date.now()
        })
        .then(function(ref){
          chatRoomRef.once('value',function(){
            chatRoomRef.update({
              lastUserID: $scope.user.uid,
              lastMessageBlockID: ref.key(),
              lastMessageTime: Date.now()
            })
          })
        }).catch(alert);
      }
    }
  };

  $scope.toggleChat = function(chatID){
    var pos = $scope.userChats.map(function(e) { return e.$id; }).indexOf(chatID),
        panel = document.getElementById('panel-right');
    $scope.userChats[pos]._newMessage = false;
    if (!$scope.userChats[pos]._open) {
      angular.forEach($scope.userChats, function(el){
        if(el._open){
          el._priority = 0-Date.now();
        }
        el._open=false;
      });
      $scope.userChats[pos]._open = true;
      $scope.userChats[pos]._priority = 0 - Date.now();
      panel.scrollTop = 0;
      $scope.scrollBot();
    }else{
      $scope.userChats[pos]._open = false;
      $scope.userChats[pos]._priority = 0-Date.now();
    }
  };

  $scope.joinChat = function(chat){
    var chatMembers = RootRef.child('chatMembers/'+chat.$id+'/'+$scope.user.uid);
    var memberChats = RootRef.child('users/'+$scope.user.uid+'/chatRooms/'+chat.$id)
    chatMembers.on('value',function(snapshot){
      chatMembers.update({member:true});
    })
    memberChats.on('value',function(snapshot){
      memberChats.update({member:true},chatSuccessAlert);
    })
  };

  $scope.addUsersToChat = function(){
    console.log($scope.focusChat);
  }

  $scope.setFocusChat = function(chat){
    $scope.focusChat = chat;
  }

  var chatSuccessAlert = function(error){
    if (error) {
      $alert({title:'Failed',placement:'bottom-right',content:error.message,type:'danger',duration:3,show:true});
    } else {
      $alert({title:'Successfully Joined',placement:'bottom-right',type:'success',duration:3,dissmissable:false,show:true});
    }
  }

  $scope.scrollBot = function(){
    var boxes = document.getElementsByClassName('chat-box');
    window.setTimeout(function(){
      angular.forEach(boxes, function(el){
        if(el.scrollHeight){
          el.scrollTop = el.scrollHeight;
        }
      });
    }, 50)
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
    console.log('worked');
  };


  function alert(msg) {
    $scope.err = msg;
    $timeout(function() {
      $scope.err = null;
    }, 5000);
  }

  $scope.logout = function() {
    if($scope.user.provider == 'anonymous'){
      profile.$remove().then(function(){
        // anonymous user removed
      }, function(error){
        console.log(error);
      });
    }else{
      userPresence.update({status:'offline',lastOnline:Date.now()});
      userPresence.setPriority(0-Date.now());
    }
    Auth.$unauth();
    $location.path('/home');
  };

  $scope.init();

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

})
.config(function(IdleProvider) {
    // configure Idle settings
    IdleProvider.idle(900); // in seconds
    IdleProvider.timeout(86400); // in seconds
});
