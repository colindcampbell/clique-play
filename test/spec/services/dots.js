'use strict';

describe('Service: dots', function () {

  // load the service's module
  beforeEach(module('cliquePlayApp'));

  // instantiate service
  var dots;
  beforeEach(inject(function (_dots_) {
    dots = _dots_;
  }));

  it('should do something', function () {
    expect(!!dots).toBe(true);
  });

});
