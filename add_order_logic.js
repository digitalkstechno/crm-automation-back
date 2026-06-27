const fs = require('fs');
const path = require('path');

const controllers = [
    { file: 'taskStatus.js', model: 'TASKSTATUS', cap: 'TaskStatus' },
    { file: 'leadStatus.js', model: 'LEADSTATUS', cap: 'LeadStatus' },
    { file: 'leadSources.js', model: 'LEADSOURCES', cap: 'LeadSources' },
    { file: 'leadLabel.js', model: 'LEADLABEL', cap: 'LeadLabel' },
];

controllers.forEach(({ file, model, cap }) => {
    const filePath = path.join('e:/manav/project/automation-crm/crm-automation-back/controller', file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add auto-order generation to create
    // Find: let [model]Create = req.body;
    // Replace with logic to fetch max order.
    const createRegex = new RegExp(`let\\s+([a-zA-Z]+Create)\\s*=\\s*req\\.body;`);
    content = content.replace(createRegex, (match, varName) => {
        return `let ${varName} = req.body;
        if (${varName}.order === undefined || ${varName}.order === null || ${varName}.order === "") {
            const maxItem = await ${model}.findOne().sort({ order: -1 });
            ${varName}.order = maxItem && maxItem.order != null ? maxItem.order + 1 : 1;
        }`;
    });

    // 2. Add bulkReorder endpoint
    // Append to the bottom of the file
    if (!content.includes('exports.bulkReorder')) {
        content += `\n
exports.bulkReorder = async (req, res) => {
    try {
        const { items } = req.body; // [{ _id, order }]
        if (!Array.isArray(items)) {
            return res.status(400).json({ status: "Fail", message: "Invalid payload format" });
        }
        
        // Step 1: Assign temporary negative orders to avoid unique constraint violations
        const bulkOps1 = items.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: { order: -item.order - 1000000 } }
            }
        }));
        await ${model}.bulkWrite(bulkOps1);

        // Step 2: Assign final actual orders
        const bulkOps2 = items.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: { order: item.order } }
            }
        }));
        await ${model}.bulkWrite(bulkOps2);

        res.status(200).json({ status: "Success", message: "Reordered successfully" });
    } catch (error) {
        res.status(400).json({ status: "Fail", message: error.message });
    }
};
`;
    }

    fs.writeFileSync(filePath, content, 'utf8');
});
console.log("Updated controllers with auto-order and bulkReorder logic.");
