// Sanitize MongoDB queries to prevent NoSQL injection
const sanitizeQuery = (query) => {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  if (Array.isArray(query)) {
    return query.map(item => sanitizeQuery(item));
  }

  const sanitized = {};
  for (const key in query) {
    // Remove MongoDB operators from user input
    if (key.startsWith('$')) {
      continue;
    }
    
    const value = query[key];
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      // Check if value contains MongoDB operators
      if (Object.keys(value).some(k => k.startsWith('$'))) {
        continue;
      }
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

module.exports = { sanitizeQuery };
