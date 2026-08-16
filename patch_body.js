const fs = require('fs');

const resources = ['categories', 'customers', 'items', 'suppliers', 'taxes'];

resources.forEach(res => {
  const controllerPath = `apps/api/src/${res}/${res}.controller.ts`;
  if (fs.existsSync(controllerPath)) {
    let content = fs.readFileSync(controllerPath, 'utf8');
    if (content.includes('bulkRemove(@Body() body: { ids: string[] })')) {
      content = content.replace('bulkRemove(@Body() body: { ids: string[] })', 'bulkRemove(@Body() body: any)');
      fs.writeFileSync(controllerPath, content);
      console.log(`Updated ${controllerPath}`);
    }
  }
});
