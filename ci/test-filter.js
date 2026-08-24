const assert = require('assert');
const { filterColors } = require('../src/static/lib/filter');

function test(){
  const colors = [
    {name:'Red', hex:'#ff0000', family:'Red'},
    {name:'Blue', hex:'#0000ff', family:'Blue'},
    {name:'LightBlue', hex:'#87CEEB', family:'Blue'}
  ];

  // filter by family
  let r = filterColors(colors, '', 'Blue');
  assert.strictEqual(r.length, 2);

  // search by name
  r = filterColors(colors, 'light', '');
  assert.strictEqual(r.length, 1);

  // search by hex
  r = filterColors(colors, '#ff', '');
  assert.strictEqual(r.length, 1);

  console.log('filter tests passed');
}

test();
