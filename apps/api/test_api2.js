const axios = require('axios');
const fs = require('fs');

async function test() {
  try {
    let content = fs.readFileSync('src/items/items.controller.ts', 'utf8');
    content = content.replace('bulkRemove(@Body() body: { ids: string[] }) {', 'bulkRemove(@Body() body: any) {');
    content = content.replace('@UseGuards(JwtAuthGuard, RolesGuard)', '');
    fs.writeFileSync('src/items/items.controller.ts', content);
    
    await new Promise(r => setTimeout(r, 4000));
    
    const res = await axios.post('http://localhost:5000/items/bulk-delete', { ids: ['dummy1', 'dummy2'] });
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    let content2 = fs.readFileSync('src/items/items.controller.ts', 'utf8');
    content2 = content2.replace('bulkRemove(@Body() body: any) {', 'bulkRemove(@Body() body: { ids: string[] }) {');
    content2 = content2.replace('@Controller(\'items\')', '@Controller(\'items\')\\n@UseGuards(JwtAuthGuard, RolesGuard)');
    fs.writeFileSync('src/items/items.controller.ts', content2);
  }
}
test();
