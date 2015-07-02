'use strict';

describe('Service: Yahtzee', function () {

  // load the service's module
  beforeEach(module('cliquePlayApp'));

  // instantiate service
  var Yahtzee;
  beforeEach(inject(function (_Yahtzee_) {
    Yahtzee = _Yahtzee_;
  }));

  it('should do something', function () {
    expect(!!Yahtzee).toBe(true);
  });

});
