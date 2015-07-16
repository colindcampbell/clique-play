angular.module('firebase.ref', ['firebase', 'firebase.config'])
  .factory('RootRef', ['$window', 'FBURL', function($window, FBURL) {
    'use strict';
    return new $window.Firebase(FBURL);
  }])
  .factory('ChatRoomsRef', ['$window', 'FBURL', function($window, FBURL) {
    'use strict';
    return new $window.Firebase(FBURL+'/chatRooms');
  }])
  .factory('ChatTextsRef', ['$window', 'FBURL', function($window, FBURL) {
    'use strict';
    return new $window.Firebase(FBURL+'/chatTexts');
  }])
  .factory('YahtzeeGamesRef', ['$window', 'FBURL', function($window, FBURL) {
    'use strict';
    return new $window.Firebase(FBURL+'/yahtzeeGames');
  }])
  .factory('YahtzeeRoomsRef', ['$window', 'FBURL', function($window, FBURL) {
    'use strict';
    return new $window.Firebase(FBURL+'/yahtzeeRooms');
  }])
  .factory('DotsRoomsRef', ['$window', 'FBURL', function($window, FBURL) {
    'use strict';
    return new $window.Firebase(FBURL+'/dotsRooms');
  }])
  .factory('PresenceRef', ['$window', 'FBURL', function($window, FBURL) {
    'use strict';
    return new $window.Firebase(FBURL+'/presence');
  }])
  .factory('ConnectionRef', ['$window', 'FBURL', function($window, FBURL) {
    'use strict';
    return new $window.Firebase(FBURL+'/.info/connected');
  }]);
