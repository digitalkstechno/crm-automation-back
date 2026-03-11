const ExcelJS = require('exceljs');

/* ==================== LEADS REPORT ==================== */
exports.generateLeadsReport = async (leads) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads Report');
  
  sheet.columns = [
    { header: 'Lead ID', key: 'leadId', width: 25 },
    { header: 'Lead Date', key: 'leadDate', width: 15 },
    { header: 'Company Name', key: 'companyName', width: 25 },
    { header: 'Client Name', key: 'clientName', width: 20 },
    { header: 'Mobile', key: 'mobile', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Address Line 1', key: 'line1', width: 30 },
    { header: 'Address Line 2', key: 'line2', width: 30 },
    { header: 'City', key: 'cityName', width: 15 },
    { header: 'State', key: 'stateName', width: 15 },
    { header: 'Country', key: 'countryName', width: 15 },
    { header: 'Lead Status', key: 'leadStatus', width: 20 },
    { header: 'Client Type', key: 'clientType', width: 15 },
    { header: 'Total Amount', key: 'totalAmount', width: 15 },
    { header: 'Paid Amount', key: 'paidAmount', width: 15 },
    { header: 'Pending Amount', key: 'pendingAmount', width: 15 },
    { header: 'Delivery Date', key: 'deliveryDate', width: 15 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
    { header: 'Source From', key: 'sourceFrom', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 20 }
  ];

  leads.forEach(lead => {
    const paidAmount = (lead.paymentHistory || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalAmount = parseFloat(lead.totalAmount || 0);
    
    sheet.addRow({
      leadId: lead._id.toString(),
      leadDate: lead.leadDate ? new Date(lead.leadDate).toLocaleDateString() : '',
      companyName: lead.accountMaster?.companyName || '',
      clientName: lead.accountMaster?.clientName || '',
      mobile: lead.accountMaster?.mobile || '',
      email: lead.accountMaster?.email || '',
      line1: lead.accountMaster?.address?.line1 || '',
      line2: lead.accountMaster?.address?.line2 || '',
      cityName: lead.accountMaster?.address?.cityName || '',
      stateName: lead.accountMaster?.address?.stateName || '',
      countryName: lead.accountMaster?.address?.countryName || '',
      leadStatus: lead.leadStatus,
      clientType: lead.clientType || '',
      totalAmount: totalAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      pendingAmount: (totalAmount - paidAmount).toFixed(2),
      deliveryDate: lead.deliveryDate ? new Date(lead.deliveryDate).toLocaleDateString() : '',
      assignedTo: lead.accountMaster?.assignBy?.fullName || '',
      sourceFrom: lead.accountMaster?.sourceFrom?.name || '',
      createdAt: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  return workbook;
};

/* ==================== LEAD ITEMS REPORT ==================== */
exports.generateLeadItemsReport = async (leads) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Lead Items Report');
  
  sheet.columns = [
    { header: 'Lead ID', key: 'leadId', width: 25 },
    { header: 'Company Name', key: 'companyName', width: 25 },
    { header: 'Lead Status', key: 'leadStatus', width: 20 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Model No', key: 'modelNo', width: 20 },
    { header: 'Color', key: 'color', width: 15 },
    { header: 'Customization', key: 'customization', width: 20 },
    { header: 'Quantity', key: 'qty', width: 12 },
    { header: 'Rate', key: 'rate', width: 12 },
    { header: 'GST', key: 'gst', width: 12 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Is Done', key: 'isDone', width: 12 },
    { header: 'Personalized', key: 'isPersonalized', width: 15 }
  ];

  leads.forEach(lead => {
    (lead.items || []).forEach(item => {
      const customizationTypes = Array.isArray(item.customizationType) 
        ? item.customizationType.map(ct => ct.name || ct).join(', ') 
        : (item.customizationType?.name || item.customizationType || '');
      
      sheet.addRow({
        leadId: lead._id.toString(),
        companyName: lead.accountMaster?.companyName || '',
        leadStatus: lead.leadStatus,
        category: item.inquiryCategory?.name || '',
        modelNo: item.modelSuggestion?.modelNo || '',
        color: typeof item.modelSuggestion?.color === 'object' ? item.modelSuggestion?.color?.name : item.modelSuggestion?.color || '',
        customization: customizationTypes,
        qty: item.qty || '',
        rate: item.rate || '',
        gst: item.gst || '',
        total: item.total || '',
        isDone: item.isDone ? 'Yes' : 'No',
        isPersonalized: item.personalization?.isPersonalized ? 'Yes' : 'No'
      });
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
  sheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  return workbook;
};

/* ==================== PAYMENT REPORT ==================== */
exports.generatePaymentReport = async (leads) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payment Report');
  
  sheet.columns = [
    { header: 'Lead ID', key: 'leadId', width: 25 },
    { header: 'Company Name', key: 'companyName', width: 25 },
    { header: 'Client Name', key: 'clientName', width: 20 },
    { header: 'Lead Status', key: 'leadStatus', width: 20 },
    { header: 'Total Amount', key: 'totalAmount', width: 15 },
    { header: 'Payment Date', key: 'paymentDate', width: 15 },
    { header: 'Payment Amount', key: 'paymentAmount', width: 15 },
    { header: 'Mode of Payment', key: 'modeOfPayment', width: 15 },
    { header: 'Payment Remark', key: 'paymentRemark', width: 30 },
    { header: 'Total Paid', key: 'totalPaid', width: 15 },
    { header: 'Pending Amount', key: 'pendingAmount', width: 15 }
  ];

  leads.forEach(lead => {
    const totalAmount = parseFloat(lead.totalAmount || 0);
    let totalPaid = 0;

    if (lead.paymentHistory && lead.paymentHistory.length > 0) {
      lead.paymentHistory.forEach(payment => {
        totalPaid += parseFloat(payment.amount || 0);
        sheet.addRow({
          leadId: lead._id.toString(),
          companyName: lead.accountMaster?.companyName || '',
          clientName: lead.accountMaster?.clientName || '',
          leadStatus: lead.leadStatus,
          totalAmount: totalAmount.toFixed(2),
          paymentDate: payment.date ? new Date(payment.date).toLocaleDateString() : '',
          paymentAmount: parseFloat(payment.amount || 0).toFixed(2),
          modeOfPayment: payment.modeOfPayment || '',
          paymentRemark: payment.remark || '',
          totalPaid: totalPaid.toFixed(2),
          pendingAmount: (totalAmount - totalPaid).toFixed(2)
        });
      });
    } else {
      sheet.addRow({
        leadId: lead._id.toString(),
        companyName: lead.accountMaster?.companyName || '',
        clientName: lead.accountMaster?.clientName || '',
        leadStatus: lead.leadStatus,
        totalAmount: totalAmount.toFixed(2),
        paymentDate: '',
        paymentAmount: '0.00',
        modeOfPayment: '',
        paymentRemark: 'No Payment',
        totalPaid: '0.00',
        pendingAmount: totalAmount.toFixed(2)
      });
    }
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
  sheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  return workbook;
};

/* ==================== FOLLOW UP REPORT ==================== */
exports.generateFollowUpReport = async (leads) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Follow Up Report');
  
  sheet.columns = [
    { header: 'Lead ID', key: 'leadId', width: 25 },
    { header: 'Company Name', key: 'companyName', width: 25 },
    { header: 'Client Name', key: 'clientName', width: 20 },
    { header: 'Mobile', key: 'mobile', width: 15 },
    { header: 'Lead Status', key: 'leadStatus', width: 20 },
    { header: 'Follow Up Date', key: 'followUpDate', width: 15 },
    { header: 'Follow Up Description', key: 'description', width: 40 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 20 }
  ];

  leads.forEach(lead => {
    if (lead.followUps && lead.followUps.length > 0) {
      lead.followUps.forEach(followUp => {
        sheet.addRow({
          leadId: lead._id.toString(),
          companyName: lead.accountMaster?.companyName || '',
          clientName: lead.accountMaster?.clientName || '',
          mobile: lead.accountMaster?.mobile || '',
          leadStatus: lead.leadStatus,
          followUpDate: followUp.date ? new Date(followUp.date).toLocaleDateString() : '',
          description: followUp.description || '',
          assignedTo: lead.accountMaster?.assignBy?.fullName || '',
          createdAt: followUp.createdAt ? new Date(followUp.createdAt).toLocaleDateString() : ''
        });
      });
    }
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
  sheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  return workbook;
};

/* ==================== ACCOUNT MASTER REPORT ==================== */
exports.generateAccountMasterReport = async (accounts) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Account Master Report');
  
  sheet.columns = [
    { header: 'Account ID', key: 'accountId', width: 25 },
    { header: 'Company Name', key: 'companyName', width: 25 },
    { header: 'Client Name', key: 'clientName', width: 20 },
    { header: 'Mobile', key: 'mobile', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Website', key: 'website', width: 25 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'State', key: 'state', width: 15 },
    { header: 'Country', key: 'country', width: 15 },
    { header: 'Source Type', key: 'sourceType', width: 20 },
    { header: 'Source From', key: 'sourceFrom', width: 20 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
    { header: 'Is Converted', key: 'isConverted', width: 15 },
    { header: 'Remark', key: 'remark', width: 30 },
    { header: 'Created At', key: 'createdAt', width: 20 }
  ];

  accounts.forEach(account => {
    const address = account.address ? 
      `${account.address.line1 || ''} ${account.address.line2 || ''}`.trim() : '';
    
    sheet.addRow({
      accountId: account._id.toString(),
      companyName: account.companyName || '',
      clientName: account.clientName || '',
      mobile: account.mobile || '',
      email: account.email || '',
      website: account.website || '',
      address: address,
      city: account.address?.cityName || '',
      state: account.address?.stateName || '',
      country: account.address?.countryName || '',
      sourceType: account.sourcebyTypeOfClient?.name || '',
      sourceFrom: account.sourceFrom?.name || '',
      assignedTo: account.assignBy?.fullName || '',
      isConverted: account.isConverted ? 'Yes' : 'No',
      remark: account.remark || '',
      createdAt: account.createdAt ? new Date(account.createdAt).toLocaleDateString() : ''
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF44546A' } };
  sheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  return workbook;
};

/* ==================== STAFF PERFORMANCE REPORT ==================== */
exports.generateStaffPerformanceReport = async (staffData) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Staff Performance');
  
  sheet.columns = [
    { header: 'Staff Name', key: 'staffName', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Total Accounts', key: 'totalAccounts', width: 15 },
    { header: 'Total Leads', key: 'totalLeads', width: 15 },
    { header: 'Completed Leads', key: 'convertedLeads', width: 15 },
    { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
    // { header: 'Pending Follow Ups', key: 'pendingFollowUps', width: 18 }
  ];

  staffData.forEach(staff => {
    sheet.addRow({
      staffName: staff.fullName,
      email: staff.email,
      role: staff.role,
      totalAccounts: staff.totalAccounts,
      totalLeads: staff.totalLeads,
      convertedLeads: staff.convertedLeads,
      totalRevenue: staff.totalRevenue,
      // pendingFollowUps: staff.pendingFollowUps
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
  sheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  return workbook;
};

/* ==================== SUMMARY REPORT ==================== */
exports.generateSummaryReport = async (summaryData) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Summary Report');
  
  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const metrics = [
    { metric: 'Total Accounts', value: summaryData.totalAccounts },
    { metric: 'Total Leads', value: summaryData.totalLeads },
    { metric: 'Converted Accounts', value: summaryData.convertedAccounts },
    { metric: 'Not Converted Accounts', value: summaryData.notConvertedAccounts },
    { metric: 'Total Revenue', value: summaryData.totalRevenue },
    { metric: 'Total Paid', value: summaryData.totalPaid },
    { metric: 'Total Pending', value: summaryData.totalPending },
    { metric: 'Today Follow Ups', value: summaryData.todayFollowUps }
  ];

  metrics.forEach(m => sheet.addRow(m));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7030A0' } };
  sheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  // Add status breakdown
  sheet.addRow({});
  sheet.addRow({ metric: 'Lead Status Breakdown', value: '' });
  sheet.getRow(sheet.rowCount).font = { bold: true };
  
  Object.entries(summaryData.statusCounts || {}).forEach(([status, count]) => {
    sheet.addRow({ metric: status, value: count });
  });

  return workbook;
};
