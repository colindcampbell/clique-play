'use strict';

describe('Filter: messageRange', function () {

  // load the filter's module
  beforeEach(module('cliquePlayApp'));

  // initialize a new instance of the filter before each test
  var messageRange;
  beforeEach(inject(function ($filter) {
    messageRange = $filter('messageRange');
  }));

  it('should return the input prefixed with "messageRange filter:"', function () {
    var text = 'angularjs';
    expect(messageRange(text)).toBe('messageRange filter: ' + text);
  });

});
