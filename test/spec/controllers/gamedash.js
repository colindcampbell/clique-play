'use strict';

describe('Controller: GamedashCtrl', function () {

  // load the controller's module
  beforeEach(module('cliquePlayApp'));

  var GamedashCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    GamedashCtrl = $controller('GamedashCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
