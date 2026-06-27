const fs = require('fs');
const path = require('path');
const dir = 'e:/manav/project/automation-crm/crm-automation-back/controller';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the bad replace string using simple string split/join
  const searchStr = "search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\{ $regex: search,')";
  const replaceStr = "search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')";
  
  content = content.split(searchStr).join(replaceStr);

  fs.writeFileSync(filePath, content, 'utf8');
});
console.log('Done fixing the bad replace.');
