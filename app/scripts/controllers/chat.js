'use strict';

angular.module('cliquePlayApp')
.controller('ChatCtrl', function ($scope, RootRef, ChatRoomsRef, ChatTextsRef, PresenceRef, ConnectionRef, Idle, $firebaseArray, $firebaseObject, $timeout, $interval, Auth, $modal, $alert, $location) {

  $scope.pwProtected = false;
  $scope.userChats = [];
  $scope.userMessageBlocks = [];
  $scope.userLoaded = false;
  $scope.chatRooms = $firebaseArray(ChatRoomsRef);
  var amOnline = ConnectionRef, userPresence;

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
      $scope.loadChats();
      $scope.setPresence();
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
        $scope.loadChats();
        setTimeout($scope.setPresence, 100)
      }
    });
  }

  $scope.setPresence = function(){
    // Load user profile and update presence
    var profile = $firebaseObject(RootRef.child('users/'+$scope.user.uid));
    profile.$bindTo($scope, 'profile').then(function(unbind){$scope.unbindProfile = unbind;});
    profile.$loaded()
      .then(function(){
        $scope.userFullName = ($scope.profile.firstName && $scope.profile.lastName)?
        $scope.profile.firstName+' '+$scope.profile.lastName:$scope.profile.userName;
        $scope.userLoaded = true;
        Idle.watch();
        userPresence = PresenceRef.child($scope.user.uid);
        amOnline.on('value', function(snapshot) {
          if (snapshot.val()) {
            userPresence.onDisconnect().setWithPriority({
              status:'offline',
              avatarURL:$scope.profile.avatarURL,
              userName:$scope.profile.userName},3);
            if($scope.profile.avatarURL){userPresence.update({avatarURL:$scope.profile.avatarURL})};
            if($scope.profile.userName){userPresence.update({userName:$scope.profile.userName})};
            userPresence.update({status:'online'});
            userPresence.setPriority(1)
          }
        });
        $scope.$on('IdleStart', function () {
          userPresence.update({status:'idle'});
          userPresence.setPriority(2);
        });
        $scope.$on('IdleTimeout', function () {
          userPresence.update({status:'offline'});
          userPresence.setPriority(3);
          Auth.$unauth();
        });
        $scope.$on('IdleEnd', function (isIdle, isAway) {
          userPresence.update({status:'online'});
          userPresence.setPriority(1);
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
        userChatRoom = $firebaseObject(ChatRoomsRef.child(currentChatKey)),
        chatMembers = RootRef.child('chatMembers/'+currentChatKey);
    userChatRoom.$loaded().then(function(ref){
      $scope.userChats[index] = ref;
      chatMembers.on('value',function(snapshot){
        $scope.userChats[index]['_members'] = $firebaseObject(chatMembers);
      })
      $scope.userChats[index]['_open'] = false;
      $scope.userChats[index]['_newMessage'] = false;
      userChatTextMessages.$loaded().then(function(ref){
        $scope.userMessageBlocks[index] = ref;
        userChatTextMessages.$watch(function(event){
          $scope.scrollBot();
          // Watch for added or changed children to notify the current user of a new message
          if( event.event==='child_added' ){
            var block = $firebaseObject(ChatRoomsRef.child($scope.userChats[index].$id));
            block.$loaded().then(function(ref){
              if (ref.lastUserID !== $scope.user.uid) {
                $scope.userChats[index]._newMessage = true;
              }
            });
          }else if( event.event==='child_changed' && $scope.userChats[index].lastUserID !== $scope.user.uid){
            $scope.userChats[index]._newMessage = true;
          }
        });
      });
    });
  };
  
  $scope.loadChats = function(){
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
        pwProtected:$scope.pwProtected,
        password:pass
      })
      .then(function(ref){
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


  function alert(msg) {
    $scope.err = msg;
    $timeout(function() {
      $scope.err = null;
    }, 5000);
  }

  $scope.logout = function() {
    Auth.$unauth();
    $location.path('/home');
    userPresence.update({status:'offline'});
    userPresence.setPriority(3);
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
