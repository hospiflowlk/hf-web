const axios = require('axios');
const fs = require('fs');

async function test() {
  try {
    let content = fs.readFileSync('src/items/items.controller.ts', 'utf8');
    content = content.replace('if (!body.ids || !Array.isArray(body.ids)) return [];', 'console.log(\'BODY RECEIVED:\', body); if (!body.ids || !Array.isArray(body.ids)) return [];');
    fs.writeFileSync('src/items/items.controller.ts', content);
    
    await new Promise(r => setTimeout(r, 4000));
    
    await axios.post('http://localhost:5000/items/bulk-delete', { ids: ['dummy'] });
  } catch (err) {
  } finally {
    let content2 = fs.readFileSync('src/items/items.controller.ts', 'utf8');
    content2 = content2.replace('console.log(\'BODY RECEIVED:\', body); ', '');
    fs.writeFileSync('src/items/items.controller.ts', content2);
  }
}
test();
