const ACCOUNTMASTER = require("../model/accountMaster");
const STAFF = require("../model/staff");
const ExcelJS = require('exceljs');
const { generateSampleExcel, generateExportExcel, parseImportExcel } = require("../utils/excelHelper");
const { validateEmail, validatePhone, validateWebsite, validateRequiredField } = require("../utils/validation");

exports.createAccountMaster = async (req, res) => {
  try {
    const {
      companyName,
      clientName,
      address,
      mobile,
      email,
      website,
      sourcebyTypeOfClient,
      sourceFrom,
      assignBy,
      remark,
    } = req.body;

    // Validation - Only Company Name and Mobile are required
    if (!validateRequiredField(companyName)) {
      throw new Error("Company name is required");
    }
    if (!validatePhone(mobile)) {
      throw new Error("Mobile number must be exactly 12 digits (91 + 10 digits)");
    }

    // Optional field validations
    if (email && !validateEmail(email)) {
      throw new Error("Invalid email address");
    }
    if (website && !validateWebsite(website)) {
      throw new Error("Invalid website URL");
    }

    // Check for duplicate mobile
    const verify = await ACCOUNTMASTER.findOne({
      mobile,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    });

    if (verify) throw new Error("Account already exists with this mobile number");

    // Prepare data - convert empty strings to null for ObjectId fields
    const accountData = {
      companyName,
      clientName: clientName || null,
      address,
      mobile,
      email: email || null,
      website: website || null,
      sourcebyTypeOfClient: sourcebyTypeOfClient || null,
      sourceFrom: sourceFrom || null,
      assignBy: assignBy || null,
      remark: remark || null,
    };

    const account = await ACCOUNTMASTER.create(accountData);

    const populatedAccount = await ACCOUNTMASTER.findById(account._id)
      .populate("assignBy")
      .populate("sourcebyTypeOfClient")
      .populate("sourceFrom");

    return res.status(201).json({
      status: "Success",
      message: "Account Master created successfully",
      data: populatedAccount,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllAccountMaster = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const noLeadsOnly = req.query.noLeadsOnly === "true";

    const query = {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        {
          $or: [
            { companyName: { $regex: search, $options: "i" } },
            { clientName: { $regex: search, $options: "i" } },
            { mobile: { $regex: search } },
            { email: { $regex: search, $options: "i" } },
            { website: { $regex: search, $options: "i" } },
          ],
        },
      ],
    };

    // Filter by assignBy if view_own
    if (req.accountMasterViewType === 'view_own') {
      query.$and.push({ assignBy: req.user._id });
    }

    const totalRecords = await ACCOUNTMASTER.countDocuments(query);

    const accounts = await ACCOUNTMASTER.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("assignBy")
      .populate("sourcebyTypeOfClient")
      .populate("sourceFrom");

    const LEAD = require("../model/lead");
    const accountsWithLeadCount = await Promise.all(
      accounts.map(async (account) => {
        const leadCount = await LEAD.countDocuments({ accountMaster: account._id });
        return {
          ...account.toObject(),
          leadCount,
        };
      })
    );

    let filteredAccounts = accountsWithLeadCount;
    if (noLeadsOnly) {
      filteredAccounts = accountsWithLeadCount.filter(acc => acc.leadCount === 0);
    }

    return res.status(200).json({
      status: "Success",
      message: "Account Master data fetched successfully",
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        limit,
      },
      data: filteredAccounts,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAccountMasterById = async (req, res) => {
  try {
    const id = req.params.id;

    const account = await ACCOUNTMASTER.findById(id)
      .populate("assignBy")
      .populate("sourcebyTypeOfClient")
      .populate("sourceFrom");

    if (!account) throw new Error("Account Master not found");

    return res.status(200).json({
      status: "Success",
      message: "Account Master fetched successfully",
      data: account,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.updateAccountMaster = async (req, res) => {
  try {
    const id = req.params.id;
    const { email, mobile, website } = req.body;

    // Validation
    if (email && !validateEmail(email)) {
      throw new Error("Invalid email address");
    }
    if (mobile && !validatePhone(mobile)) {
      throw new Error("Mobile number must be exactly 12 digits (91 + 10 digits)");
    }
    if (website && !validateWebsite(website)) {
      throw new Error("Invalid website URL");
    }

    const oldAccount = await ACCOUNTMASTER.findById(id);
    if (!oldAccount) throw new Error("Account Master not found");

    // Check for duplicate email/mobile if changed
    if (email && email !== oldAccount.email) {
      const existingEmail = await ACCOUNTMASTER.findOne({ email, isDeleted: false, _id: { $ne: id } });
      if (existingEmail) throw new Error("Email already exists");
    }
    if (mobile && mobile !== oldAccount.mobile) {
      const existingMobile = await ACCOUNTMASTER.findOne({ mobile, isDeleted: false, _id: { $ne: id } });
      if (existingMobile) throw new Error("Mobile number already exists");
    }

    const updatedAccount = await ACCOUNTMASTER.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    )
      .populate("assignBy")
      .populate("sourcebyTypeOfClient")
      .populate("sourceFrom");

    return res.status(200).json({
      status: "Success",
      message: "Account Master updated successfully",
      data: updatedAccount,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.deleteAccountMaster = async (req, res) => {
  try {
    const id = req.params.id;

    const oldAccount = await ACCOUNTMASTER.findById(id);
    if (!oldAccount) throw new Error("Account Master not found");

    await ACCOUNTMASTER.findByIdAndUpdate(id, { isDeleted: true });

    return res.status(200).json({
      status: "Success",
      message: "Account Master deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.downloadSampleExcel = async (req, res) => {
  try {
    const workbook = await generateSampleExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=AccountMaster_Sample.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.exportAccountMaster = async (req, res) => {
  try {
    const noLeadsOnly = req.query.noLeadsOnly === "true";

    const accounts = await ACCOUNTMASTER.find({ isDeleted: false })
      .populate('assignBy')
      .populate('sourcebyTypeOfClient')
      .populate('sourceFrom')
      .sort({ createdAt: -1 });

    let filteredAccounts = accounts;
    if (noLeadsOnly) {
      const LEAD = require("../model/lead");
      const accountsWithLeadCount = await Promise.all(
        accounts.map(async (account) => {
          const leadCount = await LEAD.countDocuments({ accountMaster: account._id });
          return { account, leadCount };
        })
      );
      filteredAccounts = accountsWithLeadCount
        .filter(item => item.leadCount === 0)
        .map(item => item.account);
    }

    const workbook = await generateExportExcel(filteredAccounts);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=AccountMaster_Export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.importAccountMaster = async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const { accounts, errors: parseErrors } = await parseImportExcel(req.file.buffer);

    const results = {
      success: 0,
      failed: parseErrors.length,
      errors: [...parseErrors],
      failedRecords: parseErrors.map(err => ({ issue: err }))
    };

    for (let i = 0; i < accounts.length; i++) {
      try {
        const accountData = accounts[i];

        // Mobile validation
        if (!validatePhone(accountData.mobile)) {
          throw new Error("Mobile number must be exactly 12 digits (91 + 10 digits)");
        }

        // Check for duplicate mobile
        const verify = await ACCOUNTMASTER.findOne({
          mobile: accountData.mobile,
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
        });

        if (verify) throw new Error("Account already exists with this mobile number");

        let assignBy = null;
        if (accountData.assignBy) {
          assignBy = accountData.assignBy;
        }

        await ACCOUNTMASTER.create({
          companyName: accountData.companyName,
          clientName: accountData.clientName,
          address: accountData.address,
          mobile: accountData.mobile,
          email: accountData.email,
          website: accountData.website,
          sourcebyTypeOfClient: accountData.sourcebyTypeOfClient,
          sourceFrom: accountData.sourceFrom,
          assignBy: assignBy,
          remark: accountData.remark
        });

        results.success++;
      } catch (err) {
        results.failed++;
        const errorMsg = err.message;
        const rowNum = accounts[i].rowNumber || (i + 2);
        results.errors.push(`Row ${rowNum}: ${errorMsg}`);
        results.failedRecords.push({
          ...accounts[i],
          issue: errorMsg
        });
      }
    }

    // Generate error Excel if there are failed records
    if (results.failedRecords.length > 0) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Failed Records');
      
      sheet.columns = [
        { header: 'Row Number', key: 'rowNumber', width: 12 },
        { header: 'Company Name', key: 'companyName', width: 25 },
        { header: 'Client Name', key: 'clientName', width: 20 },
        { header: 'Mobile', key: 'mobile', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Error', key: 'issue', width: 50 }
      ];
      
      results.failedRecords.forEach(record => {
        sheet.addRow({
          rowNumber: record.rowNumber,
          companyName: record.companyName,
          clientName: record.clientName,
          mobile: record.mobile,
          email: record.email,
          issue: record.issue
        });
      });
      
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
      
      const buffer = await workbook.xlsx.writeBuffer();
      results.errorFile = buffer.toString('base64');
    }

    return res.status(200).json({
      status: "Success",
      message: `Import completed. Success: ${results.success}, Failed: ${results.failed}`,
      data: results
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.createPublicAccountMaster = async (req, res) => {
  try {
    const { companyName, clientName, mobile, email, website, address } = req.body;

    if (!companyName || !clientName || !mobile) {
      throw new Error("Company Name, Client Name, and Mobile are required");
    }

    if (!validatePhone(mobile)) {
      throw new Error("Mobile number must be exactly 12 digits (91 + 10 digits)");
    }

    if (email && !validateEmail(email)) {
      throw new Error("Invalid email address");
    }

    if (website && !validateWebsite(website)) {
      throw new Error("Invalid website URL");
    }

    const verify = await ACCOUNTMASTER.findOne({
      $and: [
        { $or: [{ email }, { mobile }] },
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      ],
    });

    if (verify) throw new Error("Account already exists with this email or mobile");

    const account = await ACCOUNTMASTER.create({
      companyName,
      clientName,
      address,
      mobile,
      email,
      website,
    });

    return res.status(201).json({
      status: "Success",
      message: "Form submitted successfully",
      data: account,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};
