
var assert = require('assert');
var fs = require('co-fs');
var Pack = require('..');
var vm = require('vm');

describe('Pack', function(){
  it('should pack a module', function *(){
    var pack = Pack();
    var js = yield pack({ id: 'a', src: 'module.exports = "a"', deps: {} }, true);
    assert('a' == evaluate(js)(1));
  })

  it('should pack multiple modules', function *(){
    var pack = Pack();
    var js = '';

    js += yield pack({ id: 'a', src: 'module.exports = "a"', deps: {} });
    js += yield pack({ id: 'b', src: 'module.exports = "b"', deps: { a: 'a' } }, true);

    assert('b' == evaluate(js)(2));
  })

  it('should work with deps', function *(){
    var pack = Pack();
    var js = '';

    js += yield pack({ id: 'a', src: 'module.exports = "a"', deps: {} });
    js += yield pack({ id: 'b', src: 'module.exports = require("a")', deps: { a: 'a' } }, true);

    assert('a' == evaluate(js)(2));
  })

  it('should stream to `path` if given', function *(){
    var pack = Pack(__dirname + '/a.js');
    var js = yield pack({ id: 'a', src: 'module.exports = "a"', deps: {} }, true);
    assert(js == (yield fs.readFile('test/a.js', 'utf8')));
    yield fs.unlink('test/a.js');
  })

  it('should expose all named modules, so we can require from outside the build', function*(){
    var pack = Pack();
    var js = '';
    js += yield pack({ name: 'boot', id: 'module', entry: true, src: 'module.exports = [require("./utils"), require("dep")]', deps: { dep: 'dep', './utils': './utils' }});
    js += yield pack({ name: 'boot-utils', id: './utils', src: 'module.exports = "utils"', deps: { dep: 'dep' }});
    js += yield pack({ name: 'dep', id: 'dep', src: 'module.exports = "dep"', deps: {} }, true);
    var require = evaluate(js);
    assert.deepEqual(['utils', 'dep'], require('boot'));
    assert('utils' == require('boot-utils'));
    assert('dep' == require('dep'));
  })
})

function evaluate(js){
  var box = { console: console };
  vm.runInNewContext('out =' + js, box, 'vm');
  return box.out;
}
