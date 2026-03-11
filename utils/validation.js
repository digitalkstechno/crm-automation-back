// Backend validation utility functions

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{12}$/;
  return phoneRegex.test(String(phone).replace(/\s/g, ''));
};

const validateWebsite = (website) => {
  if (!website) return true; // Optional field
  const websiteRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  return websiteRegex.test(website);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validatePositiveNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
};

const validateRequiredField = (value) => {
  return value !== undefined && value !== null && String(value).trim() !== '';
};

module.exports = {
  validateEmail,
  validatePhone,
  validateWebsite,
  validatePassword,
  validatePositiveNumber,
  validateRequiredField
};
