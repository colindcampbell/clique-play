angular.module('firebase.config', [])
  .constant('FBURL', 'https://clique-play.firebaseio.com')
  .constant('SIMPLE_LOGIN_PROVIDERS', ['password','anonymous','facebook','google'])

  .constant('loginRedirectPath', '/login');
