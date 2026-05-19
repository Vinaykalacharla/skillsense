const sanitizeUserForResponse = (userDoc) => {
  if (!userDoc) {
    return null;
  }
  const user = typeof userDoc.toObject === 'function'
    ? userDoc.toObject({ getters: true, virtuals: false })
    : { ...userDoc };
  if (user.password) {
    delete user.password;
  }
  return user;
};

module.exports = { sanitizeUserForResponse };
