'use strict';

describe('Controller: DotsCtrl', function () {

  // load the controller's module
  beforeEach(module('cliquePlayApp'));

  var DotsCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    DotsCtrl = $controller('DotsCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
