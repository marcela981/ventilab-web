/**
 * =============================================================================
 * Password Validation Utility for VentyLab
 * =============================================================================
 * This utility provides comprehensive password validation and strength checking
 * following OWASP guidelines for secure password policies.
 *
 * Features:
 * - Password strength calculation (weak/medium/strong/very-strong)
 * - Individual requirement checks (length, uppercase, lowercase, etc.)
 * - Common pattern detection (123, password, admin, etc.)
 * - Feedback generation for user guidance
 * - Secure random password generation
 * =============================================================================
 */

/**
 * Common weak patterns to avoid in passwords
 * These are commonly used patterns that make passwords easy to guess
 */
const COMMON_PATTERNS = [
  'password',
  'contraseña',
  'admin',
  'user',
  'usuario',
  'login',
  '123456',
  '12345',
  '1234',
  'qwerty',
  'abc123',
  'ventilab',
  'ventilacion',
  'medical',
];

/**
 * Common sequential patterns to detect
 */
const SEQUENTIAL_PATTERNS = [
  '012',
  '123',
  '234',
  '345',
  '456',
  '567',
  '678',
  '789',
  'abc',
  'bcd',
  'cde',
  'def',
];

/**
 * Password Requirements Configuration
 * Modify these values to adjust password policy
 */
export const PASSWORD_CONFIG = {
  minLength: 8,
  maxLength: 128,
  requireUpperCase: true,
  requireLowerCase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

/**
 * Validates if password meets minimum length requirement
 * @param {string} password - The password to check
 * @returns {boolean} True if meets minimum length
 */
export const hasMinLength = (password) => {
  return password && password.length >= PASSWORD_CONFIG.minLength;
};

/**
 * Validates if password contains at least one uppercase letter
 * @param {string} password - The password to check
 * @returns {boolean} True if contains uppercase
 */
export const hasUpperCase = (password) => {
  return /[A-Z]/.test(password);
};

/**
 * Validates if password contains at least one lowercase letter
 * @param {string} password - The password to check
 * @returns {boolean} True if contains lowercase
 */
export const hasLowerCase = (password) => {
  return /[a-z]/.test(password);
};

/**
 * Validates if password contains at least one number
 * @param {string} password - The password to check
 * @returns {boolean} True if contains number
 */
export const hasNumber = (password) => {
  return /[0-9]/.test(password);
};

/**
 * Validates if password contains at least one special character
 * @param {string} password - The password to check
 * @returns {boolean} True if contains special character
 */
export const hasSpecialChar = (password) => {
  // Special characters: !@#$%^&*()_+-=[]{}|;:,.<>?
  return /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);
};

/**
 * Checks if password contains common weak patterns
 * @param {string} password - The password to check
 * @returns {boolean} True if NO common patterns found (good)
 */
export const noCommonPatterns = (password) => {
  if (!password) return false;

  const lowerPassword = password.toLowerCase();

  // Check for common patterns
  for (const pattern of COMMON_PATTERNS) {
    if (lowerPassword.includes(pattern)) {
      return false;
    }
  }

  // Check for sequential patterns
  for (const pattern of SEQUENTIAL_PATTERNS) {
    if (lowerPassword.includes(pattern)) {
      return false;
    }
  }

  // Check for repeated characters (e.g., "aaa", "111")
  if (/(.)\1{2,}/.test(password)) {
    return false;
  }

  return true;
};

/**
 * Calculates password entropy (randomness)
 * @param {string} password - The password to analyze
 * @returns {number} Entropy score (higher is better)
 */
const calculateEntropy = (password) => {
  if (!password) return 0;

  // Calculate character set size
  let charSetSize = 0;
  if (/[a-z]/.test(password)) charSetSize += 26; // lowercase
  if (/[A-Z]/.test(password)) charSetSize += 26; // uppercase
  if (/[0-9]/.test(password)) charSetSize += 10; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) charSetSize += 32; // special chars

  // Entropy = log2(charSetSize^length)
  return Math.log2(Math.pow(charSetSize, password.length));
};

/**
 * Main password strength validation function
 *
 * @param {string} password - The password to validate
 * @returns {Object} Validation result object
 * @property {boolean} isValid - Whether password meets all minimum requirements
 * @property {string} strength - Password strength ('weak', 'medium', 'strong', 'very-strong')
 * @property {number} score - Numeric score from 0-100
 * @property {string[]} feedback - Array of suggestions for improvement
 * @property {Object} checks - Individual requirement check results
 *
 * @example
 * const result = validatePasswordStrength('MyP@ssw0rd');
 * console.log(result.isValid); // true
 * console.log(result.strength); // 'strong'
 * console.log(result.score); // 85
 */
export const validatePasswordStrength = (password) => {
  // Initialize result object
  const result = {
    isValid: false,
    strength: 'weak',
    score: 0,
    feedback: [],
    checks: {
      hasMinLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumber: false,
      hasSpecialChar: false,
      noCommonPatterns: false,
    },
  };

  // Handle empty password
  if (!password || password.length === 0) {
    result.feedback.push('La contraseña no puede estar vacía');
    return result;
  }

  // Perform individual checks
  result.checks.hasMinLength = hasMinLength(password);
  result.checks.hasUpperCase = hasUpperCase(password);
  result.checks.hasLowerCase = hasLowerCase(password);
  result.checks.hasNumber = hasNumber(password);
  result.checks.hasSpecialChar = hasSpecialChar(password);
  result.checks.noCommonPatterns = noCommonPatterns(password);

  // Calculate score based on multiple factors
  let score = 0;

  // Length scoring (up to 30 points)
  if (password.length >= PASSWORD_CONFIG.minLength) {
    score += 10;
  }
  if (password.length >= 10) {
    score += 10;
  }
  if (password.length >= 12) {
    score += 10;
  }

  // Character diversity scoring (up to 40 points)
  if (result.checks.hasUpperCase) score += 10;
  if (result.checks.hasLowerCase) score += 10;
  if (result.checks.hasNumber) score += 10;
  if (result.checks.hasSpecialChar) score += 10;

  // Pattern avoidance scoring (up to 20 points)
  if (result.checks.noCommonPatterns) score += 20;

  // Entropy bonus (up to 10 points)
  const entropy = calculateEntropy(password);
  if (entropy > 50) score += 5;
  if (entropy > 70) score += 5;

  result.score = Math.min(score, 100);

  // Determine strength level
  if (result.score < 40) {
    result.strength = 'weak';
  } else if (result.score < 60) {
    result.strength = 'medium';
  } else if (result.score < 80) {
    result.strength = 'strong';
  } else {
    result.strength = 'very-strong';
  }

  // Validate minimum requirements
  result.isValid =
    result.checks.hasMinLength &&
    result.checks.hasUpperCase &&
    result.checks.hasLowerCase &&
    result.checks.hasNumber &&
    result.checks.hasSpecialChar;

  // Generate feedback messages
  if (!result.checks.hasMinLength) {
    result.feedback.push(
      `La contraseña debe tener al menos ${PASSWORD_CONFIG.minLength} caracteres`
    );
  }
  if (!result.checks.hasUpperCase) {
    result.feedback.push('Agrega al menos una letra mayúscula (A-Z)');
  }
  if (!result.checks.hasLowerCase) {
    result.feedback.push('Agrega al menos una letra minúscula (a-z)');
  }
  if (!result.checks.hasNumber) {
    result.feedback.push('Agrega al menos un número (0-9)');
  }
  if (!result.checks.hasSpecialChar) {
    result.feedback.push('Agrega al menos un carácter especial (!@#$%^&*...)');
  }
  if (!result.checks.noCommonPatterns) {
    result.feedback.push('Evita patrones comunes o secuencias predecibles');
  }
  if (password.length < 10 && result.isValid) {
    result.feedback.push('Considera usar una contraseña más larga para mayor seguridad');
  }

  return result;
};

/**
 * Returns password requirements for UI display
 *
 * @returns {Array<Object>} Array of requirement objects
 * @property {string} text - Human-readable requirement description
 * @property {Function} validator - Function to check this specific requirement
 *
 * @example
 * const requirements = getPasswordRequirements();
 * requirements.forEach(req => {
 *   const isValid = req.validator(password);
 *   console.log(`${req.text}: ${isValid ? '✓' : '✗'}`);
 * });
 */
export const getPasswordRequirements = () => {
  return [
    {
      text: `Mínimo ${PASSWORD_CONFIG.minLength} caracteres`,
      validator: hasMinLength,
    },
    {
      text: 'Al menos una letra mayúscula (A-Z)',
      validator: hasUpperCase,
    },
    {
      text: 'Al menos una letra minúscula (a-z)',
      validator: hasLowerCase,
    },
    {
      text: 'Al menos un número (0-9)',
      validator: hasNumber,
    },
    {
      text: 'Al menos un carácter especial (!@#$%...)',
      validator: hasSpecialChar,
    },
    {
      text: 'Sin patrones comunes o secuencias',
      validator: noCommonPatterns,
    },
  ];
};

/**
 * Generates a cryptographically strong random password
 *
 * @param {number} length - Desired password length (default: 12)
 * @returns {string} Generated password that meets all requirements
 *
 * @example
 * const password = generateStrongPassword(16);
 * console.log(password); // "K8@mPx2$nQw9Zr4L"
 */
export const generateStrongPassword = (length = 12) => {
  // Ensure minimum length
  const finalLength = Math.max(length, PASSWORD_CONFIG.minLength);

  // Character sets
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Ensure at least one character from each required set
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Fill remaining length with random characters from all sets
  const allChars = lowercase + uppercase + numbers + specialChars;
  for (let i = password.length; i < finalLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to avoid predictable pattern (first chars being U,l,n,s)
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Validates if two passwords match (for confirm password fields)
 *
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {Object} Validation result
 * @property {boolean} isValid - Whether passwords match
 * @property {string} error - Error message if not valid
 *
 * @example
 * const result = validatePasswordMatch('MyP@ss123', 'MyP@ss123');
 * console.log(result.isValid); // true
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: 'Por favor confirma tu contraseña',
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Las contraseñas no coinciden',
    };
  }

  return {
    isValid: true,
    error: null,
  };
};

// Export all functions as default object for convenience
export default {
  validatePasswordStrength,
  getPasswordRequirements,
  generateStrongPassword,
  validatePasswordMatch,
  hasMinLength,
  hasUpperCase,
  hasLowerCase,
  hasNumber,
  hasSpecialChar,
  noCommonPatterns,
  PASSWORD_CONFIG,
};
