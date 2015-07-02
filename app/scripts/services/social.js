'use strict';

/**
 * @ngdoc service
 * @name cliquePlayApp.User
 * @description
 * # User
 * Service in the cliquePlayApp.
 */
angular.module('cliquePlayApp')
  .service('SocialService', function ($rootScope,RootRef, ChatRoomsRef, ChatTextsRef, PresenceRef, ConnectionRef, Idle, $firebaseArray, $firebaseObject, $timeout, $interval, Auth, $alert, $location) {

  var service = this;

	service.userProfile = null;
	service.amOnline = ConnectionRef;
  service.focusChat;
  service.search = {};
  service.pwProtected = false;
  service.showUserSearch = false;
  service.showChatSearch = false;
  service.userChats = [];
  service.userMessageBlocks = {};
  service.userLoaded = false;
  service.touchChatsToggle = false;
  service.touchUsersToggle = false;
  service.newMessage = false;
  service.usersToAdd = [];
  service.stagedAddUsers = [];
  service.newUsers = {};
  service.chatRooms = $firebaseArray(ChatRoomsRef.orderByChild('privateChat').equalTo(false));
  service.user = Auth.$getAuth()?Auth.$getAuth():null;

  service.init = function(){
    if (service.user && !service.userLoaded) {
      service.loadUserInfo();
      service.userLoaded = true;
    }
    Auth.$onAuth(function(authData){
      if(!authData && service.user){
        // user logs out
        service.userLoaded=false;
        service.userChats=[];
        service.userProfile=null;
        service.user=null;
      }
      if(authData && !service.userLoaded){
        service.user = authData;
        service.loadUserInfo();
      }
    });
  }

  // Load Chats and Games that user belongs too and set user status
  service.loadUserInfo = function(){
    service.setPresence();
    // Get User's Chats
    service.userChatKeysArray = $firebaseArray(RootRef.child('users/'+service.user.uid+'/chatRooms').orderByPriority());
    service.userChatKeysArray.$loaded().then(function(chatKeys){
      angular.forEach(chatKeys, function(val,key){
        service.getChats(val.$id,false,val.$priority);
        service.updateChatPriorities(val.$id);
      });
      service.userChatKeysArray.$watch(function(event){
        if ( event.event==='child_added' ) {
          service.getChats(event.key,true,0);
        }else if(event.event === 'child_moved'){
          // var pos = service.userChats.map(function(e) { return e.$id; }).indexOf(event.key);
          // service.userChats[pos].priority
        }else{
          // Add ablility to leave a chatroom
          console.log('child removed');
        }
      });
    });
    // Get User's Games
  };

  service.getChats = function(currentChatKey,newChat,priority){
    var userChatTextMessages = $firebaseArray(ChatTextsRef.child(currentChatKey).child('messageBlocks').limitToLast(20)),
        chatRoomRef = $firebaseObject(ChatRoomsRef.child(currentChatKey)),
        chatMembers = RootRef.child('chatMembers/'+currentChatKey);
    chatRoomRef.$loaded().then(function(ref){
      service.userChats.push(ref);
      var pos = service.userChats.length - 1;
      chatMembers.on('value',function(snapshot){
        service.userChats[pos]._members = $firebaseObject(chatMembers);
      })
      service.userChats[pos]._open = false;
      service.userChats[pos]._newMessage = false;
      service.userChats[pos]._priority = priority;
      userChatTextMessages.$loaded().then(function(ref){
        service.userMessageBlocks[currentChatKey] = ref;
        chatRoomRef.$watch(function(event){
          var keyRef = RootRef.child('users/'+service.user.uid+'/chatRooms/'+event.key);
          keyRef.once('value',function(){
            var priority = 0-Date.now();
            keyRef.setPriority(priority);
          })
          service.scrollBot(true);
          var newPos = service.userChats.map(function(e) { return e.$id; }).indexOf(event.key);
          if(chatRoomRef.lastUserID !== service.user.uid && !service.userChats[newPos]._open){
            service.userChats[newPos]._newMessage = true;
            service.userChats[newPos]._priority = 0 - Date.now();
          }
          if(!service.touchChatsToggle){
            service.newMessage = true;
          }
        })
      });
    });
  };

  service.userStatus = function(){
    if(service.user.provider == 'anonymous'){return;};
    service.user._presenceSet = true;
    service.userLoaded = true;
    service.userFullName = (service.userProfile.firstName && service.userProfile.lastName)?
    service.userProfile.firstName+' '+service.userProfile.lastName:service.userProfile.userName;
    Idle.watch();
    service.userPresence = PresenceRef.child(service.user.uid);
    service.amOnline.on('value', function(snapshot) {
      if (snapshot.val()) {
        service.userPresence.onDisconnect().setWithPriority({
          status:'offline',
          avatarURL:service.userProfile.avatarURL,
          userName:service.userProfile.userName,
          lastOnline:Date.now()},0-Date.now());
        if(service.userProfile.avatarURL){service.userPresence.update({avatarURL:service.userProfile.avatarURL})};
        if(service.userProfile.userName){service.userPresence.update({userName:service.userProfile.userName})};
        service.userPresence.update({status:'online'});
        service.userPresence.setPriority(null)
      }
    });
    $rootScope.$on('IdleStart', function () {
      service.userPresence.update({status:'idle'});
      service.userPresence.setPriority( (0-Date.now())*100 );
    });
    $rootScope.$on('IdleTimeout', function () {
      service.userPresence.update({status:'offline'});
      service.userPresence.setPriority(0-Date.now());
      Auth.$unauth();
    });
    $rootScope.$on('IdleEnd', function (isIdle, isAway) {
      service.userPresence.update({status:'online'});
      service.userPresence.setPriority(null);
    });
  }

  service.setPresence = function(){
    // Load user profile and update presence
    service.userProfile = $firebaseObject(RootRef.child('users/'+service.user.uid));
    service.userProfile.$loaded()
      .then(function(){
      	if(!service.userProfile.avatarURL){
      		service.createProfile();
      	}else{
      		service.userStatus();      		
      	}
      }).catch(alert);
    // Will eventually be friends
    var users = PresenceRef;
    users.orderByPriority().on('value', function(){
      service.users = $firebaseObject(users);
      service.usersArray = $firebaseArray(users);
    })
  }

  service.updateChatPriorities = function(chatID){
    var userChatKey = RootRef.child('users/'+service.user.uid+'/chatRooms/'+chatID);
    var chatRoomRef = RootRef.child('chatRooms/'+chatID);
    userChatKey.once('value',function(userSnap){
      chatRoomRef.once('value',function(chatSnap){
        var priority = 0-chatSnap.val().lastMessageTime;
        userChatKey.setPriority(priority);
      })
    })
  }

  service.createChat = function(chatName, description, privateChat, userIDs){
    if(!privateChat){privateChat=false}
    service.chatRooms.$add({
      name:chatName,
      description:description,
      creator:service.user.uid,
      lastUserID:'',
      lastMessageTime:0,
      privateChat:privateChat
    })
    .then(function(ref){
      var chatKey = ref.key(),
          newChatMember = $firebaseObject(RootRef.child('chatMembers/'+chatKey)),
          newChatTexts = $firebaseObject(RootRef.child('chatTexts/'+chatKey)),
          newUserChat = $firebaseObject(RootRef.child('users/'+service.user.uid+'/chatRooms/'+chatKey));
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
      newChatTexts.creator = service.user.uid;
      newChatTexts.$save();
      newChatMember[service.user.uid] = ({member:true});
      newChatMember.$save();
      newUserChat.member = true;
      newUserChat.$priority = 0 - Date.now();
      newUserChat.$save();
      service.chatName = '';
      service.description = '';
      service.pass = '';
      service.confirm = '';
    });
  };

  // provide a method for adding a message
  service.addMessage = function(message,chat,index) {
    if(message) {
      var chatRoomRef = RootRef.child('chatRooms/'+chat.$id);
      if (chat.lastUserID === service.user.uid){
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
          userName:service.user.uid,
          lastUpdated:Date.now()
        })
        .then(function(ref){
          chatRoomRef.once('value',function(){
            chatRoomRef.update({
              lastUserID: service.user.uid,
              lastMessageBlockID: ref.key(),
              lastMessageTime: Date.now()
            })
          })
        }).catch(alert);
      }
    }
  };

  service.toggleChat = function(chatID, index){
    var pos = service.userChats.map(function(e) { return e.$id; }).indexOf(chatID),
        panel = angular.element(document.getElementById('panel-right'));
    service.userChats[pos]._newMessage = false;
    if (!service.userChats[pos]._open) {
      angular.forEach(service.userChats, function(el){
        if(el._open){
          $timeout(function(){
            el._priority = 0-Date.now();
          }, 500)
        }
        el._open=false;
      });
      $timeout(function(){
        var noTouch = document.getElementsByTagName('html')[0].getAttribute('class').search('no-touch');
        if(noTouch != -1){
          angular.element('#input'+index).focus();
        }
      });
      service.userChats[pos]._open = true;
      panel.scrollTopAnimated(0);
      service.scrollBot(false);
    }else{
      $timeout(function(){
        service.userChats[pos]._priority = 0 - Date.now();
      }, 500);
      service.userChats[pos]._open = false;
    }
  };

  service.joinChat = function(chat){
    var chatMembers = RootRef.child('chatMembers/'+chat.$id+'/'+service.user.uid);
    var memberChats = RootRef.child('users/'+service.user.uid+'/chatRooms/'+chat.$id)
    chatMembers.on('value',function(snapshot){
      chatMembers.update({member:true});
    })
    memberChats.on('value',function(snapshot){
      memberChats.update({member:true},chatSuccessAlert);
    })
  };

  service.setFocusChat = function(chat){
    service.focusChat = chat;
    service.availableUsers = angular.copy(service.usersArray);
    service.currentUsers = angular.copy(chat._members);
    angular.forEach(chat._members, function(el, id){
      var pos = service.availableUsers.map(function(e) { return e.$id; }).indexOf(id);
      service.availableUsers.splice(pos, 1);
    })
    angular.forEach(service.availableUsers, function(el,id){
      el.userSelected = false;
    });
  }

  service.selectUser = function(index){
    var user = service.availableUsers[index];
    user.userSelected = !user.userSelected;
    if(user.userSelected){
      service.stagedAddUsers.push(user);
    }else{
      var pos = service.stagedAddUsers.indexOf(user)
      if(pos != -1){
        service.stagedAddUsers.splice(pos, 1);
      }
    }
  }

  service.addMembers = function(){
    var elements = [];
    angular.forEach(service.stagedAddUsers, function(el, index){
      service.currentUsers[el.$id] = {member:true};
      service.newUsers[el.$id] = {member:true};
      elements.push(el);
    })
    for (var i=0; i<elements.length; i++){
      var pos = service.availableUsers.indexOf(elements[i]);
      service.availableUsers.splice(pos, 1);
    }
    service.stagedAddUsers = [];
  }

  service.saveMembers = function(){
    angular.forEach(service.newUsers, function(el,index){
      service.focusChat._members[index] = {member:true};
      var userChats = RootRef.child('users/'+index+'/chatRooms/'+service.focusChat.$id),
          chatMembers = RootRef.child('chatMembers/'+service.focusChat.$id+'/'+index);
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

  service.scrollBot = function(animated){
    var boxes = document.getElementsByClassName('chat-box');
    $timeout(function(){
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

  service.getMessageRange = function(index, messages){
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

  service.log = function(item){
    console.log(item);
  };


  function alert(msg) {
    service.err = msg;
    $timeout(function() {
      service.err = null;
    }, 5000);
  }

  service.logout = function() {
    if(service.user.provider == 'anonymous'){
      profile.$remove().then(function(){
        // anonymous user removed
      }, function(error){
        console.log(error);
      });
    }else{
      service.userPresence.update({status:'offline',lastOnline:Date.now()});
      service.userPresence.setPriority(0-Date.now());
    }
    Auth.$unauth();
    $location.path('/home');
  };

  service.openPanel = function(openPanel,closePanel){
    if(openPanel === 'users'){
      service.touchUsersToggle = !service.touchUsersToggle;
      service.touchChatsToggle = false;
    }else{
      service.touchChatsToggle = !service.touchChatsToggle;
      service.touchUsersToggle = false;
      service.newMessage = false;
    }
    var newClass = 'open-'+openPanel,
        oldClass = 'open-'+closePanel;
    if(service.touchChatsToggle || service.touchUsersToggle){
      $('body').removeClass(oldClass).addClass(newClass);
    }else{
      $('body').removeClass(newClass)
    }
  }

  service.navSwipe = function(direction){

    if(direction == 'users' && service.user){
     if(service.touchChatsToggle){
       service.openPanel('chats','users')
     }else if(!service.touchChatsToggle && !service.touchUsersToggle){
       service.openPanel('users','chats')
     }else{
       return;
     }
    }else if(direction == 'chats' && service.user){
     if(service.touchUsersToggle){
       service.openPanel('users','chats')
     }else if(!service.touchChatsToggle && !service.touchUsersToggle){
       service.openPanel('chats','users')
     }else{
       return;
     }
    }
  }

  service.createProfile = function(){
    switch (service.user.provider) {
      case 'facebook':
        service.userProfile.firstName = service.user.facebook.cachedUserProfile.first_name;
        service.userProfile.lastName = service.user.facebook.cachedUserProfile.last_name;
        if (!service.userProfile.userName) {
          service.userProfile.userName = service.user.facebook.displayName;
        }
        if (!service.userProfile.avatarURL) {
          service.userProfile.avatarURL = service.user.facebook.cachedUserProfile.picture.data.url;
        }
        break;
      case 'google':
        service.userProfile.name = service.user.google.cachedUserProfile.name;
        service.userProfile.firstName = service.user.google.cachedUserProfile.given_name;
        service.userProfile.lastName = service.user.google.cachedUserProfile.family_name;
        if (!service.userProfile.userName) {
          service.userProfile.userName = service.user.google.displayName;
        }
        if (!service.userProfile.avatarURL) {
          service.userProfile.avatarURL = service.user.google.cachedUserProfile.picture;
        }
        break;
      case 'password':
        service.userProfile.email = service.user.password.email;
        if (!service.userProfile.userName) {
          service.userProfile.userName = service.user.password.email;
        }
        if (!service.userProfile.avatarURL) {
          service.userProfile.avatarURL = '../images/default_profile_picture.png';
        }
        break;
      case 'anonymous':
        if (!service.userProfile.userName) {
          service.userProfile.userName = 'anonymous';
        }
        if (!service.userProfile.avatarURL) {
          service.userProfile.avatarURL = '../images/default_profile_picture.png';
        }
        break;
    }
    service.userProfile.$save();
    service.userStatus();
  }

  })
	.config(function(IdleProvider) {
	    // configure Idle settings
	    IdleProvider.idle(900); // in seconds
	    IdleProvider.timeout(86400); // in seconds
	});
