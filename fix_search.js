const fs = require('fs');
const path = 'e:/manav/project/automation-crm/crm-automation-back/controller/lead.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /if\s*\(\s*search\s*\)\s*\{\s*query\.\$or\s*=\s*\[([\s\S]*?)\];\s*\}/g;

const replacement = (match, inner) => {
  return "if (search) {\n" +
"      const escapedSearch = search.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');\n" +
"      query.$or = [\n" +
"        { fullName: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { email: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { contact: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { countryCode: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { $expr: { $regexMatch: { input: { $concat: [\"$countryCode\", \"$contact\"] }, regex: escapedSearch, options: \"i\" } } },\n" +
"        { companyName: { $regex: escapedSearch, $options: \"i\" } },\n" +
"        { priority: { $regex: escapedSearch, $options: \"i\" } },\n" +
"      ];\n" +
"    }";
};

content = content.replace(regex, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Done replacing search blocks.');
