const fs = require('fs');

const resources = ['customers', 'items', 'suppliers', 'taxes'];

resources.forEach(res => {
  // 1. Controller
  const controllerPath = `apps/api/src/${res}/${res}.controller.ts`;
  if (fs.existsSync(controllerPath)) {
    let content = fs.readFileSync(controllerPath, 'utf8');
    if (!content.includes('bulk-delete')) {
      const singularName = res === 'taxes' ? 'tax' : res.slice(0, -1);
      
      const matchRegex = new RegExp(`remove\\(@Param\\('id'\\) id: string\\) \\{\\s*return this.${res}Service.remove\\(id\\);\\s*\\}`);
      
      content = content.replace(matchRegex, (m) => `${m}\n\n  @Post('bulk-delete')\n  @Roles(Role.ADMIN, Role.MANAGER)\n  bulkRemove(@Body() body: { ids: string[] }) {\n    if (!body.ids || !Array.isArray(body.ids)) return [];\n    return this.${res}Service.bulkRemove(body.ids);\n  }`);
      fs.writeFileSync(controllerPath, content);
      console.log(`Updated ${controllerPath}`);
    }
  }

  // 2. Service
  const servicePath = `apps/api/src/${res}/${res}.service.ts`;
  if (fs.existsSync(servicePath)) {
    let content = fs.readFileSync(servicePath, 'utf8');
    const singularName = res === 'taxes' ? 'tax' : res.slice(0, -1);
    if (!content.includes('bulkRemove')) {
      
      // Extract the exact 'data' block from the remove function
      const removeMatch = content.match(/async remove\(id: string\) \{[\s\S]*?return this\.prisma\.\w+\.update\(\{[\s\S]*?where: \{ id \},[\s\S]*?data:\s*(\{[\s\S]*?\})[\s\S]*?\}\);/);
      
      let dataObjectStr = `isActive: false`;
      if (removeMatch && removeMatch[1]) {
        let extractedData = removeMatch[1];
        // Replace Date.now() with timestamp to avoid duplicates in bulk, and append random string
        extractedData = extractedData.replace(/Date\.now\(\)/g, "timestamp + '_' + index + '_' + Math.random().toString(36).substring(7)");
        // Remove the outer braces
        dataObjectStr = extractedData.replace(/^\{|\}$/g, '').trim();
      }

      content = content.replace(/\}\s*$/, `
  async bulkRemove(ids: string[]) {
    const records = await this.prisma.${singularName}.findMany({
      where: { id: { in: ids } },
    });

    if (records.length === 0) return;

    const timestamp = Date.now();
    
    return this.prisma.$transaction(
      records.map((record, index) => 
        this.prisma.${singularName}.update({
          where: { id: record.id },
          data: {
            ${dataObjectStr}
          }
        })
      )
    );
  }
}
`);
      fs.writeFileSync(servicePath, content);
      console.log(`Updated ${servicePath}`);
    }
  }

  // 3. Frontend
  const frontendPath = `apps/web/app/(dashboard)/masters/${res}/page.tsx`;
  if (fs.existsSync(frontendPath)) {
    let content = fs.readFileSync(frontendPath, 'utf8');
    const regex = new RegExp(`await Promise\\.all\\(${res}\\.map\\(\\w+ => api\\.delete\\(\`\\/${res}\\/\\$\\{\\w+\\.id\\}\`\\)\\)\\);`);
    if (regex.test(content)) {
      content = content.replace(regex, `const ids = ${res}.map(item => item.id);\n      await api.post('/${res}/bulk-delete', { ids });`);
      fs.writeFileSync(frontendPath, content);
      console.log(`Updated ${frontendPath}`);
    }
  }
});
