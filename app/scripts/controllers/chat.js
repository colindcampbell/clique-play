'use strict';

angular.module('cliquePlayApp')
.controller('ChatCtrl', function ($scope, RootRef, ChatRoomsRef, ChatTextsRef, PresenceRef, ConnectionRef, Idle, $firebaseArray, $firebaseObject, $timeout, $interval, Auth, $modal, $alert, $location) {

  var chatScope = this;

  chatScope.focusChat;
  chatScope.search = {};
  chatScope.pwProtected = false;
  chatScope.showUserSearch = false;
  chatScope.showChatSearch = false;
  chatScope.userChats = [];
  chatScope.userMessageBlocks = {};
  chatScope.userLoaded = false;
  chatScope.touchChatsToggle = false;
  chatScope.touchUsersToggle = false;
  chatScope.newMessage = false;
  chatScope.usersToAdd = [];
  chatScope.stagedAddUsers = [];
  chatScope.newUsers = {};
  chatScope.chatRooms = $firebaseArray(ChatRoomsRef.orderByChild('privateChat').equalTo(false));
  var amOnline = ConnectionRef, userPresence, profile;

  chatScope.newChatModal = $modal({
    scope: $scope,
    template: '../../views/newChatModal.html',
    show: false,
    title:'New Chatroom',
    placement:'center'
  });

  chatScope.newUserModal = $modal({
    scope: $scope,
    template: '../../views/newUserModal.html',
    show: false,
    title:'Add Users',
    placement:'center'
  });

  chatScope.init = function(){
    chatScope.user = Auth.$getAuth()?Auth.$getAuth():null;
    if (chatScope.user && !chatScope.userLoaded) {
      chatScope.loadUserInfo();
      chatScope.userLoaded = true;
    }
    Auth.$onAuth(function(authData){
      if(!authData && chatScope.user){
        // user logs out
        chatScope.userLoaded=false;
        chatScope.userChats=[];
        chatScope.unbindProfile();
        $scope.profile=null;
        chatScope.user=null;
      }
      if(authData && !chatScope.userLoaded){
        chatScope.user = authData;
        chatScope.loadUserInfo();
      }
    });
  }

  // Load Chats and Games that user belongs too and set user status
  chatScope.loadUserInfo = function(){
    chatScope.setPresence();
    // Get User's Chats
    chatScope.userChatKeysArray = $firebaseArray(RootRef.child('users/'+chatScope.user.uid+'/chatRooms').orderByPriority());
    chatScope.userChatKeysArray.$loaded().then(function(chatKeys){
      angular.forEach(chatKeys, function(val,key){
        chatScope.getChats(val.$id,false,val.$priority);
        chatScope.updateChatPriorities(val.$id);
      });
      chatScope.userChatKeysArray.$watch(function(event){
        if ( event.event==='child_added' ) {
          chatScope.getChats(event.key,true,0);
        }else if(event.event === 'child_moved'){
          // var pos = chatScope.userChats.map(function(e) { return e.$id; }).indexOf(event.key);
          // chatScope.userChats[pos].priority
        }else{
          // Add ablility to leave a chatroom
          console.log('child removed');
        }
      });
    });
    // Get User's Games
  };

  chatScope.getChats = function(currentChatKey,newChat,priority){
    var userChatTextMessages = $firebaseArray(ChatTextsRef.child(currentChatKey).child('messageBlocks').limitToLast(20)),
        chatRoomRef = $firebaseObject(ChatRoomsRef.child(currentChatKey)),
        chatMembers = RootRef.child('chatMembers/'+currentChatKey);
    chatRoomRef.$loaded().then(function(ref){
      chatScope.userChats.push(ref);
      var pos = chatScope.userChats.length - 1;
      chatMembers.on('value',function(snapshot){
        chatScope.userChats[pos]._members = $firebaseObject(chatMembers);
      })
      chatScope.userChats[pos]._open = false;
      chatScope.userChats[pos]._newMessage = false;
      chatScope.userChats[pos]._priority = priority;
      userChatTextMessages.$loaded().then(function(ref){
        chatScope.userMessageBlocks[currentChatKey] = ref;
        chatRoomRef.$watch(function(event){
          var keyRef = RootRef.child('users/'+chatScope.user.uid+'/chatRooms/'+event.key);
          keyRef.once('value',function(){
            var priority = 0-Date.now();
            keyRef.setPriority(priority);
          })
          chatScope.scrollBot(true);
          var newPos = chatScope.userChats.map(function(e) { return e.$id; }).indexOf(event.key);
          if(chatRoomRef.lastUserID !== chatScope.user.uid && !chatScope.userChats[newPos]._open){
            chatScope.userChats[newPos]._newMessage = true;
            chatScope.userChats[newPos]._priority = 0 - Date.now();
          }
          if(!chatScope.touchChatsToggle){
            chatScope.newMessage = true;
          }
        })
      });
    });
  };

  chatScope.setPresence = function(){
    // Load user profile and update presence
    profile = $firebaseObject(RootRef.child('users/'+chatScope.user.uid));
    profile.$bindTo($scope, 'profile').then(function(unbind){chatScope.unbindProfile = unbind;});
    profile.$loaded()
      .then(function(){
        if(chatScope.user.provider == 'anonymous'){return;};
        chatScope.user._presenceSet = true;
        chatScope.userLoaded = true;
        chatScope.userFullName = ($scope.profile.firstName && $scope.profile.lastName)?
        $scope.profile.firstName+' '+$scope.profile.lastName:$scope.profile.userName;
        Idle.watch();
        userPresence = PresenceRef.child(chatScope.user.uid);
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
          userPresence.setPriority(0);
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
      chatScope.users = $firebaseObject(users);
      chatScope.usersArray = $firebaseArray(users);
    })
  }

  chatScope.updateChatPriorities = function(chatID){
    var userChatKey = RootRef.child('users/'+chatScope.user.uid+'/chatRooms/'+chatID);
    var chatRoomRef = RootRef.child('chatRooms/'+chatID);
    userChatKey.once('value',function(userSnap){
      chatRoomRef.once('value',function(chatSnap){
        var priority = 0-chatSnap.val().lastMessageTime;
        userChatKey.setPriority(priority);
      })
    })
  }

  chatScope.createChat = function(chatName, description, privateChat, userIDs){
    if(!privateChat){privateChat=false}
    chatScope.chatRooms.$add({
      name:chatName,
      description:description,
      creator:chatScope.user.uid,
      lastUserID:'',
      lastMessageTime:0,
      privateChat:privateChat
    })
    .then(function(ref){
      var chatKey = ref.key(),
          newChatMember = $firebaseObject(RootRef.child('chatMembers/'+chatKey)),
          newChatTexts = $firebaseObject(RootRef.child('chatTexts/'+chatKey)),
          newUserChat = $firebaseObject(RootRef.child('users/'+chatScope.user.uid+'/chatRooms/'+chatKey));
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
      newChatTexts.creator = chatScope.user.uid;
      newChatTexts.$save();
      newChatMember[chatScope.user.uid] = ({member:true});
      newChatMember.$save();
      newUserChat.member = true;
      newUserChat.$priority = 0 - Date.now();
      newUserChat.$save();
      chatScope.chatName = '';
      chatScope.description = '';
      chatScope.pass = '';
      chatScope.confirm = '';
    });
  };

  // provide a method for adding a message
  chatScope.addMessage = function(message,chat,index) {
    if(message) {
      var chatRoomRef = RootRef.child('chatRooms/'+chat.$id);
      if (chat.lastUserID === chatScope.user.uid){
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
          userName:chatScope.user.uid,
          lastUpdated:Date.now()
        })
        .then(function(ref){
          chatRoomRef.once('value',function(){
            chatRoomRef.update({
              lastUserID: chatScope.user.uid,
              lastMessageBlockID: ref.key(),
              lastMessageTime: Date.now()
            })
          })
        }).catch(alert);
      }
    }
  };

  chatScope.toggleChat = function(chatID){
    var pos = chatScope.userChats.map(function(e) { return e.$id; }).indexOf(chatID),
        panel = angular.element(document.getElementById('panel-right'));
    chatScope.userChats[pos]._newMessage = false;
    if (!chatScope.userChats[pos]._open) {
      angular.forEach(chatScope.userChats, function(el){
        if(el._open){
          el._priority = 0-Date.now()+1;
        }
        el._open=false;
      });
      chatScope.userChats[pos]._open = true;
      chatScope.userChats[pos]._priority = 0 - Date.now();
      panel.scrollTopAnimated(0);
      chatScope.scrollBot(false);
    }else{
      chatScope.userChats[pos]._open = false;
    }
  };

  chatScope.joinChat = function(chat){
    var chatMembers = RootRef.child('chatMembers/'+chat.$id+'/'+chatScope.user.uid);
    var memberChats = RootRef.child('users/'+chatScope.user.uid+'/chatRooms/'+chat.$id)
    chatMembers.on('value',function(snapshot){
      chatMembers.update({member:true});
    })
    memberChats.on('value',function(snapshot){
      memberChats.update({member:true},chatSuccessAlert);
    })
  };

  chatScope.setFocusChat = function(chat){
    chatScope.focusChat = chat;
    chatScope.availableUsers = angular.copy(chatScope.usersArray);
    chatScope.currentUsers = angular.copy(chat._members);
    angular.forEach(chat._members, function(el, id){
      var pos = chatScope.availableUsers.map(function(e) { return e.$id; }).indexOf(id);
      chatScope.availableUsers.splice(pos, 1);
    })
    angular.forEach(chatScope.availableUsers, function(el,id){
      el.userSelected = false;
    });
  }

  chatScope.selectUser = function(index){
    var user = chatScope.availableUsers[index];
    user.userSelected = !user.userSelected;
    if(user.userSelected){
      chatScope.stagedAddUsers.push(user);
    }else{
      var pos = chatScope.stagedAddUsers.indexOf(user)
      if(pos != -1){
        chatScope.stagedAddUsers.splice(pos, 1);
      }
    }
  }

  chatScope.addMembers = function(){
    var elements = [];
    angular.forEach(chatScope.stagedAddUsers, function(el, index){
      chatScope.currentUsers[el.$id] = {member:true};
      chatScope.newUsers[el.$id] = {member:true};
      elements.push(el);
    })
    for (var i=0; i<elements.length; i++){
      var pos = chatScope.availableUsers.indexOf(elements[i]);
      chatScope.availableUsers.splice(pos, 1);
    }
    chatScope.stagedAddUsers = [];
  }

  chatScope.saveMembers = function(){
    angular.forEach(chatScope.newUsers, function(el,index){
      chatScope.focusChat._members[index] = {member:true};
      var userChats = RootRef.child('users/'+index+'/chatRooms/'+chatScope.focusChat.$id),
          chatMembers = RootRef.child('chatMembers/'+chatScope.focusChat.$id+'/'+index);
      userChats.update({member:true});
      chatMembers.update({member:true});
    })
  }

  var chatSuccessAlert = function(error){
    if (error) {
      $alert({title:'Failed',placement:'bottom-right',content:error.message,type:'danger',duration:3,show:true});
    } else {
      $alert({title:'Successfully Joined',placement:'bottom-right',type:'success',duration:3,dissmissable:false,show:true});
    }
  }

  chatScope.scrollBot = function(animated){
    var boxes = document.getElementsByClassName('chat-box');
    window.setTimeout(function(){
      angular.forEach(boxes, function(el){
        if(el.scrollHeight){
          if(animated){
            angular.element(el).scrollTopAnimated(el.scrollHeight);
          }else{
            el.scrollTop = el.scrollHeight;
          }
        }
      });
    }, 50)
  };

  chatScope.getMessageRange = function(index, messages){
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

  chatScope.log = function(item){
    console.log(item);
  };


  function alert(msg) {
    chatScope.err = msg;
    $timeout(function() {
      chatScope.err = null;
    }, 5000);
  }

  chatScope.logout = function() {
    if(chatScope.user.provider == 'anonymous'){
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

  chatScope.openPanel = function(openPanel,closePanel){
    if(openPanel === 'users'){
      chatScope.touchUsersToggle = !chatScope.touchUsersToggle;
      chatScope.touchChatsToggle = false;
    }else{
      chatScope.touchChatsToggle = !chatScope.touchChatsToggle;
      chatScope.touchUsersToggle = false;
      chatScope.newMessage = false;
    }
    var newClass = 'open-'+openPanel,
        oldClass = 'open-'+closePanel;
    if(chatScope.touchChatsToggle || chatScope.touchUsersToggle){
      $('body').removeClass(oldClass).addClass(newClass);
    }else{
      $('body').removeClass(newClass)
    }
  }

  chatScope.navSwipe = function(direction){
    if(direction == 'users'){
     if(chatScope.touchChatsToggle){
       chatScope.openPanel('chats','users')
     }else if(!chatScope.touchChatsToggle && !chatScope.touchUsersToggle){
       chatScope.openPanel('users','chats')
     }else{
       return;
     }
    }else if(direction == 'chats'){
     if(chatScope.touchUsersToggle){
       chatScope.openPanel('users','chats')
     }else if(!chatScope.touchChatsToggle && !chatScope.touchUsersToggle){
       chatScope.openPanel('chats','users')
     }else{
       return;
     }
    }
  }

  chatScope.init();

})
.config(function(IdleProvider) {
    // configure Idle settings
    IdleProvider.idle(900); // in seconds
    IdleProvider.timeout(86400); // in seconds
});
