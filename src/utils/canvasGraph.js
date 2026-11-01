const { createCanvas } = require('@napi-rs/canvas');

/**
 * Format numbers with commas (e.g., 1000 -> 1,000)
 */
function formatNumber(num) {
  return Number(num).toLocaleString('en-US');
}

/**
 * Truncates and draws text safely within maxWidth
 */
function drawFittedText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  baseSize = 14,
  weight = 'bold',
  family = 'sans-serif'
) {
  let size = baseSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 9) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  let rendered = text;
  if (ctx.measureText(rendered).width > maxWidth) {
    while (rendered.length > 2 && ctx.measureText(rendered + '…').width > maxWidth) {
      rendered = rendered.slice(0, -1);
    }
    rendered = rendered + '…';
  }
  ctx.fillText(rendered, x, y);
}

/**
 * Renders a premium horizontal bar chart comparing top items (towns or nations)
 * @param {Array<string>} labels - Names of the items
 * @param {Array<number>} values - Values corresponding to each item
 * @param {string} title - Title of the chart
 * @param {string} subtitle - Subtitle describing the data
 * @param {string} valueSuffix - Suffix for values (e.g., " Residents", " Chunks")
 * @returns {Buffer} - PNG buffer of the rendered chart
 */
function drawTopChart(labels, values, title, subtitle, valueSuffix = '') {
  const count = labels ? labels.length : 0;
  const width = 840;
  // Dynamically calculate height to comfortably fit all items without clipping
  const startY = 104;
  const barHeight = 22;
  const gap = 14;
  const rowPitch = barHeight + gap; // 36px pitch
  const contentHeight = count > 0 ? startY + count * rowPitch : startY + 80;
  const height = Math.max(520, contentHeight + 50);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Sleek dark background
  ctx.fillStyle = '#090b11';
  ctx.fillRect(0, 0, width, height);

  // Gradient background accents
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
  bgGrad.addColorStop(0, '#0f1322');
  bgGrad.addColorStop(1, '#07080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Border highlight
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // 2. Draw Title & Header (strip any leading emoji or whitespace)
  const cleanTitle = String(title || 'Top Rankings')
    .replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '')
    .trim();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(cleanTitle, 40, 45);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px sans-serif';
  ctx.fillText(subtitle || 'Ranked by ArcadiaMC telemetry', 40, 68);

  // Divider line
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 84);
  ctx.lineTo(width - 40, 84);
  ctx.stroke();

  // If no items
  if (count === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No rankings data available to display.', width / 2, 200);
    return canvas.toBuffer('image/png');
  }

  // 3. Layout Constants
  const startX = 250; // Margin for Rank Badge + Town/Nation Names
  const chartWidth = 440; // Max track width leaving 150px on right for value labels
  const maxVal = Math.max(...values.map((v) => Number(v) || 0), 1);

  // 4. Draw Bars
  for (let i = 0; i < count; i++) {
    const val = Number(values[i]) || 0;
    const label = String(labels[i] || 'Unknown').replace(/_/g, ' ');
    const barY = startY + i * rowPitch;

    // Draw Rank Badge Pill
    const isTop1 = i === 0;
    const isTop2 = i === 1;
    const isTop3 = i === 2;

    const rankPillW = 32;
    const rankPillH = 20;
    const rankX = 40;
    const rankY = barY + 1;

    let rankBg = 'rgba(30, 41, 59, 0.45)';
    let rankBorder = '#334155';
    let rankTextColor = '#64748b';

    if (isTop1) {
      rankBg = 'rgba(245, 158, 11, 0.2)';
      rankBorder = '#f59e0b';
      rankTextColor = '#fbbf24';
    } else if (isTop2) {
      rankBg = 'rgba(203, 213, 225, 0.15)';
      rankBorder = '#94a3b8';
      rankTextColor = '#e2e8f0';
    } else if (isTop3) {
      rankBg = 'rgba(217, 119, 6, 0.18)';
      rankBorder = '#d97706';
      rankTextColor = '#f97316';
    }

    ctx.fillStyle = rankBg;
    ctx.beginPath();
    ctx.roundRect(rankX, rankY, rankPillW, rankPillH, 4);
    ctx.fill();

    ctx.strokeStyle = rankBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = rankTextColor;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`#${i + 1}`, rankX + rankPillW / 2, rankY + 14);

    // Draw Entity Label (safely fitted between rank and track)
    ctx.fillStyle = isTop1 ? '#ffffff' : i < 3 ? '#f1f5f9' : '#cbd5e1';
    ctx.textAlign = 'left';
    drawFittedText(ctx, label, 80, barY + barHeight - 6, startX - 95, 13, 'bold', 'sans-serif');

    // Draw track background bar
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(startX, barY, chartWidth, barHeight, 5);
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Calculate active bar width
    const pct = val / maxVal;
    const barWidth = Math.max(pct > 0 ? 8 : 0, Math.round(pct * chartWidth));

    if (barWidth > 0) {
      // Create gradient fill for active bar
      const barGrad = ctx.createLinearGradient(startX, barY, startX + barWidth, barY);
      if (isTop1) {
        barGrad.addColorStop(0, '#3b82f6');
        barGrad.addColorStop(1, '#8b5cf6');
      } else if (i < 3) {
        barGrad.addColorStop(0, '#6366f1');
        barGrad.addColorStop(1, '#a855f7');
      } else {
        barGrad.addColorStop(0, '#1d4ed8');
        barGrad.addColorStop(1, '#4f46e5');
      }

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(startX, barY, barWidth, barHeight, 5);
      ctx.fill();

      // Active bar border highlight
      ctx.strokeStyle = isTop1
        ? '#60a5fa'
        : i < 3
          ? 'rgba(168, 85, 247, 0.5)'
          : 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Format & Draw Value text
    const valText = `${formatNumber(val)}${valueSuffix}`;
    ctx.font = 'bold 12px monospace';
    const textW = ctx.measureText(valText).width;

    if (barWidth >= textW + 22) {
      // Draw inside bar, right-aligned
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(valText, startX + barWidth - 8, barY + barHeight - 6);
    } else {
      // Draw outside bar, left-aligned
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(valText, startX + barWidth + 8, barY + barHeight - 6);
    }
  }

  // Footer / Branding
  ctx.fillStyle = '#334155';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('ARCADIA COMMUNITY DATABASE PANEL', width - 40, height - 18);

  return canvas.toBuffer('image/png');
}

const COMPARE_PALETTE = [
  { primary: '#3b82f6', light: '#60a5fa', grad: 'rgba(59, 130, 246, 0.18)' },
  { primary: '#10b981', light: '#34d399', grad: 'rgba(16, 185, 129, 0.18)' },
  { primary: '#a855f7', light: '#c084fc', grad: 'rgba(168, 85, 247, 0.18)' },
  { primary: '#f59e0b', light: '#fbbf24', grad: 'rgba(245, 158, 11, 0.18)' },
];

/**
 * Renders a side-by-side comparative card for 2 to 4 entities (Towns / Nations)
 * @param {Array<Object>|Object} itemsOrItem1 - List of items (2-4) or item 1
 * @param {Object|string} item2OrTitle - Item 2 or comparison header
 * @param {string} [maybeTitle] - Comparison header if items passed separately
 * @returns {Buffer} - PNG buffer
 */
function drawCompareChart(itemsOrItem1, item2OrTitle, maybeTitle) {
  let items = [];
  let title = 'Comparison';
  if (Array.isArray(itemsOrItem1)) {
    items = itemsOrItem1;
    title = item2OrTitle || 'Comparison';
  } else {
    items = [itemsOrItem1, item2OrTitle];
    title = maybeTitle || 'Comparison';
  }

  const isNation = items.some((it) => it && it.type === 'nation');
  const entityType = isNation ? 'NATION' : 'TOWN';

  // Normalize items telemetry with palette colors
  items = items.slice(0, 4).map((item, idx) => {
    const it = item || {};
    const pal = COMPARE_PALETTE[idx % COMPARE_PALETTE.length];
    return {
      ...it,
      tag: it.tag || `${entityType} ${idx + 1}`,
      primaryColor: it.color || pal.primary,
      lightColor: it.lightColor || pal.light,
      gradColor: it.gradColor || pal.grad,
      leaderTitle: it.leaderTitle || (isNation ? 'King' : 'Mayor'),
      leaderName: it.leaderName || 'Unknown',
      residents: Number(it.residents ?? 0),
      chunks: Number(it.chunks ?? 0),
      towns: Number(it.towns ?? 0),
      statusTitle: it.statusTitle || (isNation ? 'CAPITAL' : 'NATION'),
      status: it.status || (isNation ? 'N/A' : 'Neutral'),
      statusColor: it.statusColor || pal.light,
    };
  });

  // ── Two items: Classic side-by-side with VS badge & dual comparison bars ──
  if (items.length === 2) {
    const width = 800;
    const height = 430;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#090b11');
    grad.addColorStop(0.5, '#0b0f19');
    grad.addColorStop(1, '#05070a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Border highlight
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Header Title (safely fitted so it never overflows)
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    drawFittedText(ctx, title, width / 2, 42, width - 80, 20, 'bold', 'sans-serif');

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.beginPath();
    ctx.moveTo(35, 62);
    ctx.lineTo(width - 35, 62);
    ctx.stroke();

    // Panels layout
    const panelW = 230;
    const panelH = 310;
    const yStart = 80;

    // Helper to draw item panel
    const drawPanel = (x, item, isLeft) => {
      // Card background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.beginPath();
      ctx.roundRect(x, yStart, panelW, panelH, 12);
      ctx.fill();

      // Subtle gradient header inside card
      const cardHeaderGrad = ctx.createLinearGradient(x, yStart, x, yStart + 90);
      cardHeaderGrad.addColorStop(0, item.gradColor);
      cardHeaderGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = cardHeaderGrad;
      ctx.beginPath();
      ctx.roundRect(x, yStart, panelW, 90, [12, 12, 0, 0]);
      ctx.fill();

      ctx.strokeStyle = item.primaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, yStart, panelW, panelH, 12);
      ctx.stroke();

      // Badge tag
      ctx.fillStyle = item.lightColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.tag, x + panelW / 2, yStart + 22);

      // Name (auto-fitted)
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      drawFittedText(
        ctx,
        String(item.name || 'Unknown').replace(/_/g, ' '),
        x + panelW / 2,
        yStart + 45,
        panelW - 24,
        17,
        'bold',
        'sans-serif'
      );

      // Leader title
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(item.leaderTitle.toUpperCase(), x + panelW / 2, yStart + 66);

      // Leader name (auto-fitted)
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      drawFittedText(
        ctx,
        String(item.leaderName || 'Unknown'),
        x + panelW / 2,
        yStart + 83,
        panelW - 24,
        13,
        'bold',
        'sans-serif'
      );

      // Separator line
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.beginPath();
      ctx.moveTo(x + 20, yStart + 98);
      ctx.lineTo(x + panelW - 20, yStart + 98);
      ctx.stroke();

      // Sub-stats helper
      const drawSubStat = (yOffset, icon, label, val) => {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${icon} ${label}`, x + panelW / 2, yOffset);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(val, x + panelW / 2, yOffset + 20);
      };

      drawSubStat(yStart + 122, '👥', 'RESIDENTS', formatNumber(item.residents));
      if (isNation) {
        drawSubStat(yStart + 180, '🏘️', 'MEMBER TOWNS', formatNumber(item.towns));
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`👑 ${item.statusTitle}`, x + panelW / 2, yStart + 238);
      } else {
        drawSubStat(yStart + 180, '📦', 'TERRITORY CHUNKS', formatNumber(item.chunks));
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🚩 ${item.statusTitle}`, x + panelW / 2, yStart + 238);
      }

      ctx.fillStyle = item.statusColor;
      ctx.textAlign = 'center';
      drawFittedText(
        ctx,
        String(item.status),
        x + panelW / 2,
        yStart + 258,
        panelW - 24,
        12,
        'bold',
        'sans-serif'
      );

      if (item.pvp !== undefined) {
        ctx.fillStyle = item.pvp ? '#4ade80' : '#f87171';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.pvp ? '🟢 PVP ON' : '🔴 PVP OFF', x + panelW / 2, yStart + 282);
      }
    };

    // Draw Left and Right Panels
    const leftX = 35;
    const rightX = width - 35 - panelW;
    drawPanel(leftX, items[0], true);
    drawPanel(rightX, items[1], false);

    // Middle comparison section
    const midCenterX = width / 2;

    // Draw VS Circle
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.arc(midCenterX, yStart + 52, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VS', midCenterX, yStart + 58);

    // Stat comparisons bars
    const barW = 210;
    const barStartX = midCenterX - barW / 2;
    const barH = 10;

    const drawComparisonBar = (y, val1, val2, label) => {
      // Header above bar: Left value, Center label, Right value
      ctx.fillStyle = items[0].lightColor;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatNumber(val1), barStartX, y - 8);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, midCenterX, y - 8);

      ctx.fillStyle = items[1].lightColor;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatNumber(val2), barStartX + barW, y - 8);

      // Track background
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(barStartX, y, barW, barH, 5);
      ctx.fill();

      // Fill proportions
      const sum = (Number(val1) || 0) + (Number(val2) || 0);
      const p1 = sum > 0 ? (Number(val1) || 0) / sum : 0.5;
      const w1 = Math.round(p1 * barW);

      if (w1 > 0) {
        ctx.fillStyle = items[0].primaryColor;
        ctx.beginPath();
        ctx.roundRect(barStartX, y, w1, barH, w1 >= barW ? 5 : [5, 0, 0, 5]);
        ctx.fill();
      }

      const w2 = barW - w1;
      if (w2 > 0) {
        ctx.fillStyle = items[1].primaryColor;
        ctx.beginPath();
        ctx.roundRect(barStartX + w1, y, w2, barH, w2 >= barW ? 5 : [0, 5, 5, 0]);
        ctx.fill();
      }

      // Proportions percentage underneath bar
      const pct1 = Math.round(p1 * 100);
      const pct2 = 100 - pct1;

      ctx.fillStyle = '#64748b';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${pct1}%`, barStartX, y + 20);

      ctx.textAlign = 'right';
      ctx.fillText(`${pct2}%`, barStartX + barW, y + 20);
    };

    drawComparisonBar(yStart + 150, items[0].residents, items[1].residents, 'POPULATION RATIO');
    if (isNation) {
      drawComparisonBar(yStart + 225, items[0].towns, items[1].towns, 'TOWNS COUNT RATIO');
    } else {
      drawComparisonBar(yStart + 225, items[0].chunks, items[1].chunks, 'TERRITORY SIZE');
    }

    // Footer
    ctx.fillStyle = '#334155';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ARCADIA COMMUNITY MULTI-DATA SYSTEM', midCenterX, height - 16);

    return canvas.toBuffer('image/png');
  }

  // ── Multi-item layout (3 or 4 items) ──────────────────────────────────
  const count = items.length;
  const width = count === 4 ? 940 : 880;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#07080c';
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#090b11');
  grad.addColorStop(0.5, '#0b0f19');
  grad.addColorStop(1, '#05070a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Header Title
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  drawFittedText(ctx, title, width / 2, 38, width - 60, 18, 'bold', 'sans-serif');

  ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.beginPath();
  ctx.moveTo(35, 54);
  ctx.lineTo(width - 35, 54);
  ctx.stroke();

  // Panels calculation
  const sideMargin = count === 4 ? 24 : 34;
  const gap = count === 4 ? 16 : 22;
  const totalGaps = (count - 1) * gap;
  const panelW = Math.floor((width - sideMargin * 2 - totalGaps) / count);
  const panelH = 260;
  const yStart = 68;

  items.forEach((item, idx) => {
    const x = sideMargin + idx * (panelW + gap);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.roundRect(x, yStart, panelW, panelH, 10);
    ctx.fill();

    const cardHeaderGrad = ctx.createLinearGradient(x, yStart, x, yStart + 75);
    cardHeaderGrad.addColorStop(0, item.gradColor);
    cardHeaderGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = cardHeaderGrad;
    ctx.beginPath();
    ctx.roundRect(x, yStart, panelW, 75, [10, 10, 0, 0]);
    ctx.fill();

    ctx.strokeStyle = item.primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, yStart, panelW, panelH, 10);
    ctx.stroke();

    ctx.fillStyle = item.lightColor;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.tag, x + panelW / 2, yStart + 20);

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    drawFittedText(
      ctx,
      String(item.name || 'Unknown').replace(/_/g, ' '),
      x + panelW / 2,
      yStart + 42,
      panelW - 16,
      15,
      'bold',
      'sans-serif'
    );

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(item.leaderTitle.toUpperCase(), x + panelW / 2, yStart + 59);

    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    drawFittedText(
      ctx,
      String(item.leaderName || 'Unknown'),
      x + panelW / 2,
      yStart + 74,
      panelW - 16,
      12,
      'bold',
      'sans-serif'
    );

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x + 15, yStart + 86);
    ctx.lineTo(x + panelW - 15, yStart + 86);
    ctx.stroke();

    const drawSubStat = (yOffset, icon, label, val) => {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${icon} ${label}`, x + panelW / 2, yOffset);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(val, x + panelW / 2, yOffset + 17);
    };

    drawSubStat(yStart + 104, '👥', 'RESIDENTS', formatNumber(item.residents));
    if (isNation) {
      drawSubStat(yStart + 150, '🏘️', 'MEMBER TOWNS', formatNumber(item.towns));
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`👑 ${item.statusTitle}`, x + panelW / 2, yStart + 196);
    } else {
      drawSubStat(yStart + 150, '📦', 'TERRITORY CHUNKS', formatNumber(item.chunks));
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🚩 ${item.statusTitle}`, x + panelW / 2, yStart + 196);
    }

    ctx.fillStyle = item.statusColor;
    ctx.textAlign = 'center';
    drawFittedText(
      ctx,
      String(item.status),
      x + panelW / 2,
      yStart + 214,
      panelW - 16,
      11,
      'bold',
      'sans-serif'
    );

    if (item.pvp !== undefined) {
      ctx.fillStyle = item.pvp ? '#4ade80' : '#f87171';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(item.pvp ? '🟢 PVP ON' : '🔴 PVP OFF', x + panelW / 2, yStart + 242);
    }
  });

  // Multi-entity comparative distribution bars at bottom
  const barStartX = sideMargin + 10;
  const barW = width - (sideMargin + 10) * 2;
  const barH = 10;

  const drawMultiBar = (y, metricKey, label) => {
    const total = items.reduce((sum, it) => sum + (Number(it[metricKey]) || 0), 0);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, barStartX, y - 6);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(barStartX, y, barW, barH, 5);
    ctx.fill();

    let curX = barStartX;
    items.forEach((it, idx) => {
      const val = Number(it[metricKey]) || 0;
      const pct = total > 0 ? val / total : 1 / count;
      const segW = Math.round(pct * barW);
      if (segW > 0) {
        ctx.fillStyle = it.primaryColor;
        ctx.beginPath();
        const isFirst = idx === 0;
        const isLast = idx === count - 1;
        let radii = 0;
        if (isFirst && isLast) radii = 5;
        else if (isFirst) radii = [5, 0, 0, 5];
        else if (isLast) radii = [0, 5, 5, 0];

        ctx.roundRect(curX, y, Math.min(segW, barStartX + barW - curX), barH, radii);
        ctx.fill();
        curX += segW;
      }
    });

    // Percentages and legends below bar
    let legendX = barStartX;
    items.forEach((it) => {
      const val = Number(it[metricKey]) || 0;
      const pct = total > 0 ? Math.round((val / total) * 100) : Math.round(100 / count);
      ctx.fillStyle = it.lightColor;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      const txt = `${it.name.slice(0, 10)}: ${pct}%`;
      ctx.fillText(txt, legendX, y + 18);
      legendX += ctx.measureText(txt).width + 15;
    });
  };

  drawMultiBar(348, 'residents', 'POPULATION DISTRIBUTION');
  if (isNation) {
    drawMultiBar(392, 'towns', 'MEMBER TOWNS DISTRIBUTION');
  } else {
    drawMultiBar(392, 'chunks', 'TERRITORY CHUNKS DISTRIBUTION');
  }

  // Footer
  ctx.fillStyle = '#334155';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ARCADIA COMMUNITY MULTI-DATA SYSTEM', width / 2, height - 12);

  return canvas.toBuffer('image/png');
}

/**
 * Renders a premium historical line chart for comparing currency rates
 * @param {Array<string>} dates - Array of date strings (X-axis)
 * @param {Array<number>} rates1 - Rates data for currency 1
 * @param {Array<number>} rates2 - Rates data for currency 2
 * @param {string} label1 - Label/name for currency 1
 * @param {string} label2 - Label/name for currency 2
 * @param {string} title - Chart header
 * @returns {Buffer} - PNG buffer
 */
/**
 * Renders a premium historical line chart for comparing any number of currencies (up to 5)
 * @param {Array<string>} dates - Array of date strings (X-axis)
 * @param {Array<Object>} datasets - Array of datasets: { label: string, rates: Array<number> }
 * @param {string} title - Chart header
 * @returns {Buffer} - PNG buffer
 */
function drawHistoryLineChart(dates, datasets, title) {
  const width = 800;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Colors palette
  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#ef4444', // Rose
  ];
  const fillColors = [
    'rgba(59, 130, 246, 0.04)',
    'rgba(16, 185, 129, 0.04)',
    'rgba(168, 85, 247, 0.04)',
    'rgba(245, 158, 11, 0.04)',
    'rgba(239, 68, 68, 0.04)',
  ];

  // Background
  ctx.fillStyle = '#07080c';
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#090b11');
  grad.addColorStop(1, '#07080c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Legend (dynamic side-by-side positioning)
  let legendX = width - 40;
  ctx.font = 'bold 12px sans-serif';
  for (let i = datasets.length - 1; i >= 0; i--) {
    const ds = datasets[i];
    const color = colors[i % colors.length];
    const label = ds.label;

    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(label, legendX, 38);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(legendX - textWidth - 8, 34, 4.5, 0, Math.PI * 2);
    ctx.fill();

    legendX -= textWidth + 24; // dynamic spacing gap
  }

  // Title (safely fitted so it never collides with the legend)
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  const maxTitleW = Math.max(220, legendX - 60);
  drawFittedText(ctx, title, 40, 40, maxTitleW, 20, 'bold', 'sans-serif');

  // Divider border highlight
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Chart area dimensions
  const startX = 65;
  const endX = width - 40;
  const chartW = endX - startX;
  const startY = 85;
  const endY = height - 65;
  const chartH = endY - startY;

  // Gather Min/Max across all datasets
  const allRates = [];
  for (const ds of datasets) {
    if (Array.isArray(ds.rates)) {
      allRates.push(...ds.rates);
    }
  }
  if (allRates.length === 0) allRates.push(1.0);

  const maxRate = Math.max(...allRates, 0.0001) * 1.05; // 5% padding
  const minRate = Math.min(...allRates, maxRate) * 0.95; // 5% padding
  const range = maxRate - minRate || 0.0001;

  // Check if all data points are integers to format Y axis nicely
  const isIntegerChart = allRates.every((val) => Number.isInteger(val));

  // Grid lines (horizontal)
  const gridLines = 5;
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
  ctx.lineWidth = 1;
  ctx.font = '10px monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'right';

  for (let i = 0; i <= gridLines; i++) {
    const yVal = minRate + (i / gridLines) * range;
    const y = endY - (i / gridLines) * chartH;

    // Draw grid line
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    // Draw Y labels
    const stepVal = range / gridLines;
    const labelStr =
      isIntegerChart && stepVal >= 1
        ? Math.round(yVal).toLocaleString()
        : isIntegerChart
          ? yVal.toFixed(1)
          : yVal.toFixed(3);
    ctx.fillText(labelStr, startX - 10, y + 4);
  }

  // Draw X axis dates (limit to 6 labels)
  const count = dates.length;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.font = '10px monospace';

  if (count > 0) {
    const labelStep = Math.max(1, Math.ceil(count / 6));
    for (let i = 0; i < count; i += labelStep) {
      const x = startX + (i / Math.max(1, count - 1)) * chartW;
      const dateObj = dates[i] || '';
      const parts = dateObj.split('-');
      const label = parts.length >= 3 ? `${parts[1]}-${parts[2]}` : dateObj;

      ctx.fillText(label, x, endY + 22);

      // Tick line
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x, endY);
      ctx.lineTo(x, endY + 5);
      ctx.stroke();
    }
  }

  // Helper to draw dataset line
  const drawLine = (rates, strokeColor, fillColor) => {
    if (!rates || rates.length === 0) return;

    // Start path
    ctx.beginPath();
    for (let i = 0; i < rates.length; i++) {
      const val = rates[i];
      const x = startX + (i / Math.max(1, rates.length - 1)) * chartW;
      const y = endY - ((val - minRate) / range) * chartH;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Stroke line
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill area below line
    ctx.lineTo(startX + chartW, endY);
    ctx.lineTo(startX, endY);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Draw points on vertices (if points are sparse)
    if (rates.length < 40) {
      ctx.fillStyle = strokeColor;
      for (let i = 0; i < rates.length; i++) {
        const val = rates[i];
        const x = startX + (i / Math.max(1, rates.length - 1)) * chartW;
        const y = endY - ((val - minRate) / range) * chartH;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Draw lines
  for (let i = 0; i < datasets.length; i++) {
    const ds = datasets[i];
    drawLine(ds.rates, colors[i % colors.length], fillColors[i % fillColors.length]);
  }

  // Footer
  ctx.fillStyle = '#334155';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('ARCADIA SYSTEM HISTORY ANALYZER', endX, height - 20);

  return canvas.toBuffer('image/png');
}

module.exports = {
  drawTopChart,
  drawCompareChart,
  drawHistoryLineChart,
};
