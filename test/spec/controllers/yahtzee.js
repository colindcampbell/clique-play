'use strict';

describe('Controller: YahtzeeCtrl', function () {

  // load the controller's module
  beforeEach(module('cliquePlayApp'));

  var YahtzeeCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    YahtzeeCtrl = $controller('YahtzeeCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
