'use strict';

angular.module('cliquePlayApp')
  .controller('AccountCtrl', function($scope, user, Auth, RootRef, PresenceRef, $firebaseObject, $timeout, $location) {

    $scope.user = user;
    $scope.messages = [];
    var userPresence = PresenceRef.child($scope.user.uid);
    // userPresence.on('value',function(){
    //   var userPres = $firebaseObject(userPresence);
    //   console.log(userPres);
    // })

    var profile = $firebaseObject(RootRef.child('users/' + user.uid));
    profile.$bindTo($scope, 'profile');
    profile.$loaded()
      .then(function() {
        switch ($scope.user.provider) {
          case 'facebook':
            $scope.profile.firstName = $scope.user.facebook.cachedUserProfile.first_name;
            $scope.profile.lastName = $scope.user.facebook.cachedUserProfile.last_name;
            if (!$scope.profile.userName) {
              $scope.profile.userName = $scope.user.facebook.displayName;
            }
            if (!$scope.profile.avatarURL) {
              $scope.profile.avatarURL = $scope.user.facebook.cachedUserProfile.picture.data.url;
            }
            break;
          case 'google':
            $scope.profile.name = $scope.user.google.cachedUserProfile.name;
            $scope.profile.firstName = $scope.user.google.cachedUserProfile.given_name;
            $scope.profile.lastName = $scope.user.google.cachedUserProfile.family_name;
            if (!$scope.profile.userName) {
              $scope.profile.userName = $scope.user.google.displayName;
            }
            if (!$scope.profile.avatarURL) {
              $scope.profile.avatarURL = $scope.user.google.cachedUserProfile.picture;
            }
            break;
          case 'password':
            $scope.profile.email = $scope.user.password.email;
            if (!$scope.profile.userName) {
              $scope.profile.userName = $scope.user.password.email;
            }
            if (!$scope.profile.avatarURL) {
              $scope.profile.avatarURL = 'http://freelanceme.net/Images/default%20profile%20picture.png';
            }
            break;
          case 'anonymous':
            if (!$scope.profile.userName) {
              $scope.profile.userName = 'anonymous';
            }
            if (!$scope.profile.avatarURL) {
              $scope.profile.avatarURL = 'http://freelanceme.net/Images/default%20profile%20picture.png';
            }
            break;
        }
        if($scope.user.provider !== 'anonymous'){
          userPresence.update({
            status:'online',
            avatarURL:$scope.profile.avatarURL,
            userName:$scope.profile.userName
          })
        }
      }).catch(alert);

    $scope.changePassword = function(oldPass, newPass, confirm) {
      $scope.err = null;
      if (!oldPass || !newPass) {
        error('Please enter all fields');
      } else if (newPass !== confirm) {
        error('Passwords do not match');
      } else {
        Auth.$changePassword({
            email: profile.email,
            oldPassword: oldPass,
            newPassword: newPass
          })
          .then(function() {
            success('Password changed');
          }, error);
      }
    };

    $scope.changeEmail = function(pass, newEmail) {
      $scope.err = null;
      Auth.$changeEmail({
          password: pass,
          newEmail: newEmail,
          oldEmail: profile.email
        })
        .then(function() {
          profile.email = newEmail;
          profile.$save();
          success('Email changed');
        })
        .catch(error);
    };

    function error(err) {
      alert(err, 'danger');
    }

    function success(msg) {
      alert(msg, 'success');
    }

    function alert(msg, type) {
      var obj = {
        text: msg + '',
        type: type
      };
      $scope.messages.unshift(obj);
      $timeout(function() {
        $scope.messages.splice($scope.messages.indexOf(obj), 1);
      }, 10000);
    }

  });