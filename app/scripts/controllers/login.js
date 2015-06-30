'use strict';

angular.module('cliquePlayApp')
  .controller('LoginCtrl', function($scope, Auth, $location, $q, RootRef, PresenceRef, $timeout, $firebaseObject) {

    $scope.oauthLogin = function(provider) {
      $scope.err = null;
      Auth.$authWithOAuthPopup(provider, {rememberMe: true}).then(function(auth){
        redirect(auth);
      }).catch(function(err){
        if (err.code === "TRANSPORT_UNAVAILABLE") {
          // fall-back to browser redirects, and pick up the session
          // automatically when we come back to the origin page
          Auth.$authWithOAuthRedirect(provider, {rememberMe: true}).then(function(auth){
            redirect(auth);
          }, showError);
        }else{
          showError(err);
        }
      });
    };

    $scope.anonymousLogin = function() {
      $scope.err = null;
      Auth.$authAnonymously({rememberMe: true}).then(function(auth){
        redirect(auth);
      }, showError);
    };

    $scope.passwordLogin = function(email, pass) {
      $scope.err = null;
      Auth.$authWithPassword({email: email, password: pass}, {rememberMe: true}).then(function(auth){
        redirect(auth);
      }, showError);
    };

    $scope.createAccount = function(email, pass, confirm) {
      $scope.err = null;
      if( !pass ) {
        $scope.err = 'Please enter a password';
      }
      else if( pass !== confirm ) {
        $scope.err = 'Passwords do not match';
      }
      else {
        Auth.$createUser({email: email, password: pass})
          .then(function () {
            // authenticate so we have permission to write to Firebase
            return Auth.$authWithPassword({email: email, password: pass}, {rememberMe: true});
          })
          // .then(createProfile)
          .then(redirect, showError);
      }

      function createProfile(user) {
        var ref = RootRef.child('users/'+user.uid), def = $q.defer();
        ref.set({email: email, name: firstPartOfEmail(email)}, function(err) {
          $timeout(function() {
            if( err ) {
              def.reject(err);
            }
            else {
              def.resolve(ref);
            }
          });
        });
        return def.promise;
      }
    };

    function firstPartOfEmail(email) {
      return ucfirst(email.substr(0, email.indexOf('@'))||'');
    }

    function ucfirst (str) {
      str += '';
      var f = str.charAt(0).toUpperCase();
      return f + str.substr(1);
    }

    function redirect(user) {
      $location.path('/gamedash');
    }

    function showError(err) {
      $scope.err = err;
    }


  });
