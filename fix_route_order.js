const fs = require('fs');
const path = require('path');

const routes = [
    { file: 'taskStatus.js' },
    { file: 'leadStatus.js' },
    { file: 'leadSources.js' },
    { file: 'leadLabel.js' },
];

routes.forEach(({ file }) => {
    const filePath = path.join('e:/manav/project/automation-crm/crm-automation-back/routes', file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('module.exports = router;\n\nrouter.put("/reorder", authMiddleware, bulkReorder);\n')) {
        content = content.replace('module.exports = router;\n\nrouter.put("/reorder", authMiddleware, bulkReorder);\n', 'router.put("/reorder", authMiddleware, bulkReorder);\n\nmodule.exports = router;\n');
    } else if (content.includes('router.put("/reorder"')) {
        // Find it and move it before module.exports
        const regex = /\n*router\.put\("\/reorder", authMiddleware, bulkReorder\);\n*/;
        content = content.replace(regex, '\n\n');
        content = content.replace('module.exports = router;', 'router.put("/reorder", authMiddleware, bulkReorder);\n\nmodule.exports = router;');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
});
console.log("Fixed module.exports location for /reorder");
