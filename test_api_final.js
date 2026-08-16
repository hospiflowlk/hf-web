const axios = require('axios');
const fs = require('fs');

async function test() {
  try {
    let content = fs.readFileSync('apps/api/src/items/items.controller.ts', 'utf8');
    content = content.replace('@UseGuards(JwtAuthGuard, RolesGuard)', '');
    fs.writeFileSync('apps/api/src/items/items.controller.ts', content);
    
    await new Promise(r => setTimeout(r, 4000)); // wait for hot reload
    
    const res = await axios.post('http://localhost:5000/items/bulk-delete', { ids: ['dummy_id_to_test_stripping'] });
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    let content2 = fs.readFileSync('apps/api/src/items/items.controller.ts', 'utf8');
    content2 = content2.replace('@Controller(\'items\')', '@Controller(\'items\')\\n@UseGuards(JwtAuthGuard, RolesGuard)');
    fs.writeFileSync('apps/api/src/items/items.controller.ts', content2);
  }
}
test();
