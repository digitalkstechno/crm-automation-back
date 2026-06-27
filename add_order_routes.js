const fs = require('fs');
const path = require('path');

const routes = [
    { file: 'taskStatus.js', controller: 'taskStatus' },
    { file: 'leadStatus.js', controller: 'leadStatus' },
    { file: 'leadSources.js', controller: 'leadSources' },
    { file: 'leadLabel.js', controller: 'leadLabel' },
];

routes.forEach(({ file }) => {
    const filePath = path.join('e:/manav/project/automation-crm/crm-automation-back/routes', file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // add `bulkReorder` to imports
    if (!content.includes('bulkReorder,')) {
        content = content.replace(/\} = require\("\.\.\/controller\/[a-zA-Z]+"\);/, '  bulkReorder,\n$&');
    }
    
    // add router.put("/reorder", ... bulkReorder);
    if (!content.includes('"/reorder"')) {
        // try finding a good spot, like before /create or at the end
        if (content.includes('router.post("/"')) {
            content = content.replace(/router\.post\("\/"/, 'router.put("/reorder", authMiddleware, bulkReorder);\n$&');
        } else if (content.includes('router.post("/create"')) {
            content = content.replace(/router\.post\("\/create"/, 'router.put("/reorder", authMiddleware, bulkReorder);\n$&');
        } else {
            content += '\nrouter.put("/reorder", authMiddleware, bulkReorder);\n';
        }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
});
console.log("Updated routes.");
