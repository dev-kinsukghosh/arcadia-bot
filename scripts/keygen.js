const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pc = require('picocolors');

/**
 * Calculates the Shannon entropy of a string (bits of entropy per character)
 * @param {string} str
 * @returns {number}
 */
function calculateEntropy(str) {
  if (!str || typeof str !== 'string') return 0;
  const len = str.length;
  const frequencies = {};

  for (let i = 0; i < len; i++) {
    const ch = str[i];
    frequencies[ch] = (frequencies[ch] || 0) + 1;
  }

  let entropy = 0;
  for (const ch in frequencies) {
    const p = frequencies[ch] / len;
    entropy -= p * Math.log2(p);
  }

  return Number(entropy.toFixed(3));
}

/**
 * Generates a cryptographically secure random key
 * @param {object} [options={}]
 * @param {number} [options.bytes=32] Number of random bytes (32 bytes = 64 hex chars)
 * @param {'hex'|'base64'|'base64url'} [options.format='hex'] Format of output string
 * @returns {string}
 */
function generateKey(options = {}) {
  const bytes = options.bytes || 32;
  const format = options.format || 'hex';

  const buffer = crypto.randomBytes(bytes);

  if (format === 'base64') {
    return buffer.toString('base64');
  }
  if (format === 'base64url') {
    return buffer.toString('base64url');
  }
  return buffer.toString('hex');
}

/**
 * Validates a key for security strength, character variety, and entropy
 * @param {string} key
 * @param {object} [options={}]
 * @param {number} [options.minLength=16] Minimum character length
 * @param {number} [options.minEntropy=3.0] Minimum Shannon entropy
 * @returns {{ valid: boolean, level: 'STRONG'|'MODERATE'|'WEAK'|'CRITICAL', entropy: number, length: number, reasons: string[] }}
 */
function validateKey(key, options = {}) {
  const minLength = options.minLength || 16;
  const minEntropy = options.minEntropy || 3.0;

  const reasons = [];

  if (!key || typeof key !== 'string') {
    return {
      valid: false,
      level: 'CRITICAL',
      entropy: 0,
      length: 0,
      reasons: ['Key cannot be empty.'],
    };
  }

  const length = key.trim().length;
  const trimmed = key.trim();
  const entropy = calculateEntropy(trimmed);

  if (length < minLength) {
    reasons.push(
      `Key is too short (${length} chars). Minimum recommended is ${minLength} characters.`
    );
  }

  // Check character diversity
  const hasLower = /[a-z]/.test(trimmed);
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasDigit = /[0-9]/.test(trimmed);
  const hasSpecial = /[^a-zA-Z0-9]/.test(trimmed);

  const diversityScore = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  let level = 'STRONG';

  if (length < 16 || entropy < 2.2) {
    level = 'CRITICAL';
    reasons.push(
      'Key entropy is critically low. Highly vulnerable to brute-force or dictionary guessing.'
    );
  } else if (length < 24 || entropy < minEntropy || diversityScore < 2) {
    level = 'WEAK';
    if (entropy < minEntropy) {
      reasons.push(`Entropy score (${entropy}) is lower than recommended minimum (${minEntropy}).`);
    }
  } else if (entropy < 3.8 && diversityScore < 3 && length < 32) {
    level = 'MODERATE';
  } else {
    level = 'STRONG';
  }

  const valid = level === 'STRONG' || level === 'MODERATE';

  return {
    valid,
    level,
    entropy,
    length,
    reasons,
  };
}

/**
 * Saves or updates an environmental variable in a .env file
 * @param {string} keyName Variable name (e.g. DEV_SECRET)
 * @param {string} value Key value to store
 * @param {string} [envPath] Path to .env file (defaults to process.cwd()/.env)
 * @returns {boolean}
 */
function saveKeyToEnv(keyName, value, envPath) {
  const targetPath = envPath || path.join(process.cwd(), '.env');

  try {
    let content = '';
    if (fs.existsSync(targetPath)) {
      content = fs.readFileSync(targetPath, 'utf8');
    }

    const regex = new RegExp(`^${keyName}=.*$`, 'm');

    if (regex.test(content)) {
      content = content.replace(regex, `${keyName}=${value}`);
    } else {
      if (content.length > 0 && !content.endsWith('\n')) {
        content += '\n';
      }
      content += `${keyName}=${value}\n`;
    }

    fs.writeFileSync(targetPath, content, 'utf8');
    return true;
  } catch (err) {
    console.error(pc.red(`Failed to save ${keyName} to .env:`), err.message);
    return false;
  }
}

/**
 * Interactive prompt helper using readline
 */
function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    question: (query) => new Promise((resolve) => rl.question(query, resolve)),
    close: () => rl.close(),
  };
}

/**
 * Displays formatted validation results in terminal
 * @param {{ valid: boolean, level: string, entropy: number, length: number, reasons: string[] }} result
 */
function printValidationResult(result) {
  const levelColors = {
    STRONG: pc.bold(pc.green('STRONG')),
    MODERATE: pc.bold(pc.yellow('MODERATE')),
    WEAK: pc.bold(pc.red('WEAK')),
    CRITICAL: pc.bold(pc.bgRed(pc.white(' CRITICAL '))),
  };

  console.log(pc.cyan('----------------------------------------------------'));
  console.log(`Rating:       ${levelColors[result.level] || result.level}`);
  console.log(`Length:       ${pc.bold(result.length)} characters`);
  console.log(`Entropy:      ${pc.bold(result.entropy)} bits/char`);

  if (result.reasons.length > 0) {
    console.log(pc.yellow('Notes:'));
    result.reasons.forEach((r) => console.log(pc.yellow(`  • ${r}`)));
  }
  console.log(pc.cyan('----------------------------------------------------'));
}

/**
 * Main CLI interactive / execution entrypoint
 */
async function runCli() {
  const args = process.argv.slice(2);

  // Check for non-interactive flags
  const isValidateFlag = args.includes('--validate');
  const isGenerateFlag = args.includes('--generate');
  const isSaveFlag = args.includes('--save') || args.includes('-s');

  let format = 'hex';
  if (args.includes('--base64')) format = 'base64';
  if (args.includes('--base64url')) format = 'base64url';

  let byteCount = 32;
  const bytesIdx = args.indexOf('--bytes');
  if (bytesIdx !== -1 && args[bytesIdx + 1]) {
    const parsed = parseInt(args[bytesIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) byteCount = parsed;
  }

  // Direct validate argument: node scripts/keygen.js --validate <token>
  if (isValidateFlag) {
    const valIdx = args.indexOf('--validate');
    const tokenToValidate = args[valIdx + 1];

    if (!tokenToValidate) {
      console.log(pc.red('Error: Please provide a key string to validate: --validate <key>'));
      process.exit(1);
    }

    console.log(pc.bold(pc.cyan('\n🔍 Validating Key Strength...')));
    const result = validateKey(tokenToValidate);
    printValidationResult(result);

    if (result.valid) {
      console.log(pc.green('✅ Key meets security criteria.\n'));
      process.exit(0);
    } else {
      console.log(pc.red('❌ Key failed security criteria. Please use a stronger key.\n'));
      process.exit(1);
    }
  }

  // Direct generate argument: node scripts/keygen.js --generate [--save]
  if (isGenerateFlag) {
    const key = generateKey({ bytes: byteCount, format });
    const result = validateKey(key);

    console.log(pc.bold(pc.cyan('\n🔐 Generated Cryptographic Key:')));
    console.log(pc.bold(pc.green(key)));
    printValidationResult(result);

    if (isSaveFlag) {
      const saved = saveKeyToEnv('DEV_SECRET', key);
      if (saved) {
        console.log(pc.bold(pc.green('✅ Successfully written to .env as DEV_SECRET.\n')));
      }
    } else {
      console.log(pc.gray('Tip: Run with --save to automatically update DEV_SECRET in .env\n'));
    }
    process.exit(0);
  }

  // Interactive Menu Mode
  console.log(pc.bold(pc.magenta('\n======================================================')));
  console.log(pc.bold(pc.magenta('  🔑 ARCADIA CRYPTO KEY GENERATOR & VALIDATOR CLI      ')));
  console.log(pc.bold(pc.magenta('======================================================')));
  console.log(pc.gray('Used for DEV_SECRET, webhook tokens, and developer API credentials.\n'));

  const prompt = createPrompt();

  try {
    console.log(pc.cyan('Select an option:'));
    console.log(
      `  ${pc.bold('1)')} Generate 64-char Hex Key (${pc.green('Recommended for DEV_SECRET')})`
    );
    console.log(`  ${pc.bold('2)')} Generate 44-char Base64 Key`);
    console.log(`  ${pc.bold('3)')} Generate 128-char Ultra-High-Security Hex Key (64 bytes)`);
    console.log(`  ${pc.bold('4)')} Validate an existing secret key`);
    console.log(`  ${pc.bold('5)')} Exit\n`);

    const choice = (await prompt.question(pc.bold('Enter choice (1-5): '))).trim();

    if (choice === '1' || choice === '2' || choice === '3') {
      let bCount = 32;
      let fmt = 'hex';

      if (choice === '2') {
        bCount = 32;
        fmt = 'base64';
      } else if (choice === '3') {
        bCount = 64;
        fmt = 'hex';
      }

      const generated = generateKey({ bytes: bCount, format: fmt });
      const val = validateKey(generated);

      console.log(pc.bold(pc.green('\n✅ Key successfully generated:')));
      console.log(pc.bold(pc.white(`\n${generated}\n`)));
      printValidationResult(val);

      const savePrompt = (
        await prompt.question(pc.bold('Save this key as DEV_SECRET in your .env file? [Y/n]: '))
      )
        .trim()
        .toLowerCase();

      if (savePrompt === '' || savePrompt === 'y' || savePrompt === 'yes') {
        const saved = saveKeyToEnv('DEV_SECRET', generated);
        if (saved) {
          console.log(pc.bold(pc.green('💾 Saved DEV_SECRET in .env!')));
        }
      } else {
        console.log(pc.gray('Skipped saving to .env. Make sure to copy your key above.'));
      }
    } else if (choice === '4') {
      // Repeat-if-wrong interactive key validator loop!
      let checking = true;

      while (checking) {
        const candidate = (
          await prompt.question(pc.bold('\nEnter key string to validate: '))
        ).trim();

        if (!candidate) {
          console.log(pc.yellow('Warning: Empty key provided.'));
        }

        const val = validateKey(candidate);
        printValidationResult(val);

        if (val.valid) {
          console.log(pc.green('✅ This key is secure and suitable for production use.'));

          const savePrompt = (
            await prompt.question(pc.bold('Save this verified key to .env as DEV_SECRET? [y/N]: '))
          )
            .trim()
            .toLowerCase();

          if (savePrompt === 'y' || savePrompt === 'yes') {
            saveKeyToEnv('DEV_SECRET', candidate);
            console.log(pc.green('💾 Saved DEV_SECRET in .env!'));
          }

          checking = false;
        } else {
          console.log(pc.red('❌ Key did not meet recommended security criteria.'));
          const retry = (
            await prompt.question(pc.bold('Would you like to test another key? [Y/n]: '))
          )
            .trim()
            .toLowerCase();

          if (retry === 'n' || retry === 'no') {
            checking = false;
          }
        }
      }
    } else {
      console.log(pc.gray('Exiting keygen utility.'));
    }
  } finally {
    prompt.close();
  }
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error(pc.red('Fatal error:'), err);
    process.exit(1);
  });
}

module.exports = {
  generateKey,
  validateKey,
  calculateEntropy,
  saveKeyToEnv,
};
