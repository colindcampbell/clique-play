'use strict';

angular.module('cliquePlayApp')
.controller('ChatCtrl', function ($scope, SocialService, $modal) {

  this.socialService = SocialService;

  this.newChatModal = $modal({
    scope: $scope,
    template: '../../views/newChatModal.html',
    show: false,
    title:'New Chatroom',
    placement:'center'
  });

  this.newUserModal = $modal({
    scope: $scope,
    template: '../../views/newUserModal.html',
    show: false,
    title:'Add Users',
    placement:'center'
  });

  this.userInit = function(){
    this.socialService.init();
  }

  this.userInit();

});
