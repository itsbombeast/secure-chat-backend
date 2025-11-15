export const isStrongPassword = (pwd: string): boolean => {
  // simple example: >= 8 chars with letters and numbers
  return /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    pwd.length >= 8;
};
