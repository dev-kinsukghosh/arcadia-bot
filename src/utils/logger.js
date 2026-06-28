const dayjs = require('dayjs');
const pc = require('picocolors');
const gradient = require('gradient-string').default;

/**
 * Cyber-Style Logger
 * High-contrast, clean, and futuristic terminal output with neon gradients.
 */

const levels = {
  DEBUG: 0,
  INFO: 1,
  SYSTEM: 2,
  SUCCESS: 3,
  WARNING: 4,
  ERROR: 5,
  CRITICAL: 6,
};

const rawLevel = (process.env.LOG_LEVEL || 'DEBUG').toUpperCase().trim();
const currentLevel = levels[rawLevel] !== undefined ? rawLevel : 'DEBUG';

const gradients = {
  DEBUG: gradient(['#E0E0E0', '#FFFFFF']), // White/Silver
  INFO: gradient(['#0000FF', '#00008B']), // Blue to Dark Blue
  SYSTEM: gradient(['#7f00ff', '#e100ff']), // Purple to Pink
  SUCCESS: gradient(['#00ff00', '#00ff99']), // Green to Teal
  WARNING: gradient(['#ff9900', '#ffcc00']), // Orange to Yellow
  ERROR: gradient(['#ff0000', '#ff6666']), // Red to Coral
  CRITICAL: gradient(['#ff0000', '#ff0000']), // Solid Red
};

const icons = {
  DEBUG: '⚙️',
  INFO: '🔹',
  SYSTEM: '📡',
  SUCCESS: '✅',
  WARNING: '⚠️',
  ERROR: '❌',
  CRITICAL: '💀',
};

function log(level, message, ...args) {
  if (levels[level] >= levels[currentLevel]) {
    const timestamp = pc.gray(dayjs().format('HH:mm:ss'));
    const gradientFn = gradients[level] || gradients.DEBUG;
    const icon = icons[level] || '•';

    const levelDisplay = `${icon} ${level}`;
    const paddedLevel = levelDisplay.padEnd(11);

    const prefix = `${pc.gray('[')}${timestamp}${pc.gray(']')} ${pc.gray('⟫')} ${pc.gray('[')}${gradientFn(paddedLevel)}${pc.gray(']')} ${pc.gray('⁝')}`;

    const formattedMessage = typeof message === 'string' ? gradientFn(message) : message;

    const logFn =
      {
        DEBUG: console.debug,
        INFO: console.info,
        SYSTEM: console.info,
        SUCCESS: console.info,
        WARNING: console.warn,
        ERROR: console.error,
        CRITICAL: console.error,
      }[level] || console.log;

    logFn(prefix, formattedMessage, ...args);

    // Handle Error objects specifically for stack traces
    args.forEach((arg) => {
      if (arg instanceof Error) {
        console.log(gradients.ERROR(`         ⁝ ${arg.stack}`));
      }
    });
  }
}

module.exports = {
  debug: (msg, ...args) => log('DEBUG', msg, ...args),
  info: (msg, ...args) => log('INFO', msg, ...args),
  system: (msg, ...args) => log('SYSTEM', msg, ...args),
  success: (msg, ...args) => log('SUCCESS', msg, ...args),
  warn: (msg, ...args) => log('WARNING', msg, ...args),
  error: (msg, ...args) => log('ERROR', msg, ...args),
  critical: (msg, ...args) => log('CRITICAL', msg, ...args),
};
