'use strict';

angular.module('cliquePlayApp')
.controller('ChatCtrl', function ($scope, RootRef, ChatRoomsRef, ChatTextsRef, PresenceRef, ConnectionRef, Idle, $firebaseArray, $firebaseObject, $timeout, $interval, Auth, $modal, $alert, $location) {

  $scope.search = {};
  $scope.pwProtected = false;
  $scope.showUserSearch = false;
  $scope.showChatSearch = false;
  $scope.userChats = [];
  $scope.userMessageBlocks = [];
  $scope.userLoaded = false;
  $scope.chatRooms = $firebaseArray(ChatRoomsRef.orderByPriority());
  var amOnline = ConnectionRef, userPresence, profile;

  $scope.newChatModal = $modal({
    scope: $scope,
    template: '../../views/newChatModal.html',
    show: false,
    title:'New Chatroom',
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
              lastOnline:Firebase.ServerValue.TIMESTAMP},0-Date.now());
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

  $scope.getChats = function(currentChatKey,index){
    var userChatTextMessages = $firebaseArray(ChatTextsRef.child(currentChatKey).child('messageBlocks').limitToLast(20)),
        chatRoomRef = $firebaseObject(ChatRoomsRef.child(currentChatKey)),
        chatMembers = RootRef.child('chatMembers/'+currentChatKey);
    chatRoomRef.$loaded().then(function(ref){
      $scope.userChats[index] = ref;
      chatMembers.on('value',function(snapshot){
        $scope.userChats[index]['_members'] = $firebaseObject(chatMembers);
      })
      $scope.userChats[index]['_open'] = false;
      $scope.userChats[index]['_newMessage'] = false;
      userChatTextMessages.$loaded().then(function(ref){
        $scope.userMessageBlocks[index] = ref;
        chatRoomRef.$watch(function(event){
          $scope.scrollBot();
          if(chatRoomRef.lastUserID !== $scope.user.uid){
            $scope.userChats[index]._newMessage = true;
          }
        })
      });
    });
  };
  
  // Load Chats and Games that user belongs too and set user status
  $scope.loadUserInfo = function(){
    $scope.setPresence();
    // Get User's Chats
    $scope.userChatKeys = $firebaseArray(RootRef.child('users/'+$scope.user.uid+'/chatRooms'));
    $scope.userChatKeys.$loaded().then(function(chatKeys){
      angular.forEach(chatKeys, function(val,key){
        $scope.getChats(val.$id,key);
      });
      $scope.userChatKeys.$watch(function(event){
        if ( event.event==='child_added' ) {
          var index = $scope.userChats.length;
          $scope.getChats(event.key,index);
        }else{
          // Add ablility to leave a chatroom
          console.log('child removed');
        }
      });
    });
    // Get User's Games
  };

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
        lastMessageTime:0,
        pwProtected:$scope.pwProtected,
        password:pass
      })
      .then(function(ref){
        // ref.setPriority(0 - Date.now());
        var chatKey = ref.key(),
            newChatMember = $firebaseObject(RootRef.child('chatMembers/'+chatKey)),
            newChatTexts = $firebaseObject(RootRef.child('chatTexts/'+chatKey)),
            newUserChat = $firebaseObject(RootRef.child('users/'+$scope.user.uid+'/chatRooms/'+chatKey));
        newChatTexts.name = chatName;
        newChatTexts.description = description;
        newChatTexts.creator = $scope.user.uid;
        newChatTexts.$save();
        newChatMember[$scope.user.uid] = ({member:true});
        newChatMember.$save();
        newUserChat.member = true;
        newUserChat.$save();
        $scope.chatName = '';
        $scope.description = '';
        $scope.pass = '';
        $scope.confirm = '';
      });
    }
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
          currentMessageBlockRef.update({lastUpdated:Firebase.ServerValue.TIMESTAMP});
        })
        chatRoomRef.once('value', function(dataSnapshot) {
          chatRoomRef.update({lastMessageTime:Firebase.ServerValue.TIMESTAMP});
          // chatRoomRef.setPriority(0 - Date.now());
        });
      }else{
        var chatTextsMessageRef = $firebaseArray(RootRef.child('chatTexts/'+chat.$id+'/messageBlocks'));
        chatTextsMessageRef.$add({
          messages:{'-JpO':{message:message}},
          userName:$scope.user.uid,
          lastUpdated:Firebase.ServerValue.TIMESTAMP
        })
        .then(function(ref){
          chatRoomRef.once('value',function(){
            chatRoomRef.update({
              lastUserID: $scope.user.uid,
              lastMessageBlockID: ref.key(),
              lastMessageTime: Firebase.ServerValue.TIMESTAMP
            })
            // chatRoomRef.setPriority(0 - Date.now());
          })
        }).catch(alert);
      }
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
      userPresence.update({status:'offline',lastOnline:Firebase.ServerValue.TIMESTAMP});
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
