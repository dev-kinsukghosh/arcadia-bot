const { LRUCache } = require('lru-cache');

// In-memory cache for active navigation embed states (capped at 1,000 messages, 2-hour TTL)
const navCache = new LRUCache({
  max: 1000,
  ttl: 2 * 60 * 60 * 1000, // 2 hours TTL
});

/**
 * Initializes navigation state for a freshly sent command embed
 * @param {string} messageId - Discord Message Snowflake ID
 * @param {string} ownerId - Discord User ID of the command invoker
 * @param {{ type: string, name: string }} initialTarget
 */
function initNavState(messageId, ownerId, initialTarget) {
  if (!messageId) return;
  navCache.set(messageId, {
    ownerId: ownerId || null,
    stack: [
      {
        type: initialTarget.type,
        name: initialTarget.name,
      },
    ],
  });
}

/**
 * Retrieves the owner ID of a navigation message
 * @param {string} messageId
 * @returns {string|null}
 */
function getNavOwner(messageId) {
  if (!messageId) return null;
  const session = navCache.get(messageId);
  return session?.ownerId || null;
}

/**
 * Pushes a new view target to the navigation stack
 * @param {string} messageId
 * @param {string} ownerId
 * @param {{ type: string, name: string }} target
 * @param {{ type: string, name: string }|null} fromTarget
 * @returns {{ current: object, previous: object|null }}
 */
function pushNavState(messageId, ownerId, target, fromTarget = null) {
  let session = navCache.get(messageId);
  if (!session) {
    session = {
      ownerId: ownerId || null,
      stack: [],
    };
    if (fromTarget && fromTarget.name) {
      session.stack.push({
        type: fromTarget.type,
        name: fromTarget.name,
      });
    }
  }

  if (ownerId && !session.ownerId) {
    session.ownerId = ownerId;
  }

  const cleanTargetName = String(target.name || '').trim().toLowerCase();

  // If already at top of stack, do not duplicate
  const top = session.stack[session.stack.length - 1];
  if (top && top.type === target.type && top.name.toLowerCase() === cleanTargetName) {
    const previous = session.stack.length > 1 ? session.stack[session.stack.length - 2] : null;
    return { current: top, previous };
  }

  // If target already exists in stack earlier, unwind back to it (prevents infinite A -> B -> A loops)
  const existingIdx = session.stack.findIndex(
    (item) => item.type === target.type && item.name.toLowerCase() === cleanTargetName
  );

  if (existingIdx !== -1) {
    session.stack = session.stack.slice(0, existingIdx + 1);
  } else {
    // Cap stack depth at 10 to avoid unbounded memory growth
    if (session.stack.length >= 10) {
      session.stack.shift();
    }
    session.stack.push({
      type: target.type,
      name: target.name,
    });
  }

  navCache.set(messageId, session);

  const current = session.stack[session.stack.length - 1];
  const previous = session.stack.length > 1 ? session.stack[session.stack.length - 2] : null;
  return { current, previous };
}

/**
 * Pops the current view off the stack and returns the previous target
 * @param {string} messageId
 * @returns {{ target: object, previous: object|null }|null}
 */
function popNavState(messageId) {
  const session = navCache.get(messageId);
  if (!session || session.stack.length === 0) {
    return null;
  }

  // Pop the active view
  session.stack.pop();
  navCache.set(messageId, session);

  if (session.stack.length === 0) {
    return null;
  }

  const target = session.stack[session.stack.length - 1];
  const previous = session.stack.length > 1 ? session.stack[session.stack.length - 2] : null;

  return { target, previous };
}

/**
 * Parses customId string into structured navigation components
 * Example format: nav_nation:Avalon:from_player:Kin:u_123456789
 * @param {string} customId
 * @returns {{
 *   action: string,
 *   targetName: string,
 *   targetType: string,
 *   fromType: string|null,
 *   fromName: string|null,
 *   ownerId: string|null
 * }}
 */
function parseNavCustomId(customId) {
  // Extract ownerId tag if present (:u_<id>)
  const ownerMatch = customId.match(/:u_(\d+)/);
  const ownerId = ownerMatch ? ownerMatch[1] : null;

  // Clean customId of owner tag for segment parsing
  const cleanId = customId.replace(/:u_\d+/, '');
  const parts = cleanId.split(':');

  const action = parts[0] || '';
  const rawTarget = parts[1] ? decodeURIComponent(parts[1]) : '';

  let fromType = null;
  let fromName = null;

  for (let i = 2; i < parts.length; i++) {
    if (parts[i] && parts[i].startsWith('from_')) {
      fromType = parts[i].replace('from_', '');
      fromName = parts[i + 1] ? decodeURIComponent(parts[i + 1]) : null;
      break;
    }
  }

  // Derive targetType from action or parts
  let targetType = 'player';
  if (action === 'nav_back') {
    targetType = parts[1] || 'player';
    return {
      action,
      targetType,
      targetName: parts[2] ? decodeURIComponent(parts[2]) : '',
      fromType,
      fromName,
      ownerId,
    };
  }

  if (action.includes('town') && !action.includes('ptown')) {
    targetType = 'town';
  } else if (action.includes('nation') && !action.includes('pnation')) {
    targetType = 'nation';
  } else if (action.includes('ptown')) {
    targetType = 'ptown';
  } else if (action.includes('pnation')) {
    targetType = 'pnation';
  } else if (action.includes('shop')) {
    targetType = 'shop';
  } else if (action.includes('player')) {
    targetType = 'player';
  }

  return {
    action,
    targetType,
    targetName: rawTarget,
    fromType,
    fromName,
    ownerId,
  };
}

module.exports = {
  initNavState,
  getNavOwner,
  pushNavState,
  popNavState,
  parseNavCustomId,
};
