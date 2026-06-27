const fs = require('fs');
const path = require('path');
const dir = 'e:/manav/project/automation-crm/crm-automation-back/controller';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace block-level search queries where query object has $or
  // This matches `if (search) { ... $or = [ ... ]; }`
  const blockRegex = /if\s*\(\s*search\s*\)\s*\{\s*([a-zA-Z0-9_]+)\.\$or\s*=\s*\[([\s\S]*?)\];\s*\}/g;
  content = content.replace(blockRegex, (match, varName, inner) => {
    return "if (search) {\n" +
"      const escapedSearch = search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');\n" +
"      " + varName + ".$or = [\n" +
"        { fullName: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { email: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { contact: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { countryCode: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { $expr: { $regexMatch: { input: { $concat: [\"$countryCode\", \"$contact\"] }, regex: escapedSearch, options: \"i\" } } },\n" +
"        { companyName: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { priority: { $regex: escapedSearch, $options: \"i\" } },\n" +
"      ];\n" +
"    }";
  });

  // Also catch simple single line assignments like `query.subject = { $regex: search, $options: "i" };`
  // Actually, some places just have `{ name: { $regex: search, $options: "i" } }` without if(search) wrapping it in the same way.
  // Instead of complex AST parsing, I will just globally replace `{ $regex: search, ` with `{ $regex: search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), `
  
  content = content.replace(/\{\s*\$regex:\s*search\s*,/g, "{ $regex: search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'),");
  
  // Also replace `regex: search.replace(/\+/g, "\\+"),` with `regex: search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'),` just in case it's still there
  content = content.replace(/regex:\s*search\.replace\(\/\\\+\/g,\s*"\\\\"\)/g, "regex: search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')");

  fs.writeFileSync(filePath, content, 'utf8');
});
console.log('Done replacing all files.');
