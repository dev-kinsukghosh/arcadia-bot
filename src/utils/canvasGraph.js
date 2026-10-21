const { createCanvas } = require('@napi-rs/canvas');

/**
 * Format numbers with commas (e.g., 1000 -> 1,000)
 */
function formatNumber(num) {
  return Number(num).toLocaleString('en-US');
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
  const width = 800;
  const height = 500;
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

  // 2. Draw Title & Header
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(title, 40, 45);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px sans-serif';
  ctx.fillText(subtitle, 40, 68);

  // Divider line
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 85);
  ctx.lineTo(width - 40, 85);
  ctx.stroke();

  // 3. Layout Constants
  const startX = 220; // Margin for names
  const chartWidth = width - startX - 80;
  const startY = 110;
  const rowHeight = 34;
  const barHeight = 20;
  const gap = 14;

  const maxVal = Math.max(...values, 1);

  // 4. Draw Bars
  for (let i = 0; i < labels.length; i++) {
    const val = values[i];
    const label = labels[i].replace(/_/g, ' ');
    const barY = startY + i * (rowHeight + gap);

    // Draw label
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label, startX - 15, barY + barHeight - 4);

    // Draw row background guide line
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, barY + barHeight / 2);
    ctx.lineTo(startX + chartWidth, barY + barHeight / 2);
    ctx.stroke();

    // Calculate bar width
    const pct = val / maxVal;
    const barWidth = Math.max(8, Math.round(pct * chartWidth));

    // Draw rounded background bar
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(startX, barY, chartWidth, barHeight, 4);
    ctx.fill();

    // Create gradient fill for active bar
    const barGrad = ctx.createLinearGradient(startX, barY, startX + barWidth, barY);
    // Alternate color profiles based on index for variety
    if (i === 0) {
      barGrad.addColorStop(0, '#3b82f6'); // Top 1: Blue to Violet
      barGrad.addColorStop(1, '#8b5cf6');
    } else if (i < 3) {
      barGrad.addColorStop(0, '#6366f1'); // Top 3: Indigo to Purple
      barGrad.addColorStop(1, '#a855f7');
    } else {
      barGrad.addColorStop(0, '#1d4ed8'); // Other: Blue-indigo gradient
      barGrad.addColorStop(1, '#4f46e5');
    }

    // Draw rounded active bar
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(startX, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Draw active bar border highlight
    ctx.strokeStyle = i === 0 ? '#60a5fa' : 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw value text
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${formatNumber(val)}${valueSuffix}`,
      startX + Math.min(barWidth + 10, chartWidth - 80),
      barY + barHeight - 5
    );
  }

  // Footer / Branding
  ctx.fillStyle = '#334155';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('ARCADIA COMMUNITY DATABASE PANEL', width - 40, height - 20);

  return canvas.toBuffer('image/png');
}

/**
 * Renders a side-by-side visual comparison card comparing two towns/nations
 * @param {Object} item1 - Telemetry for item 1
 * @param {Object} item2 - Telemetry for item 2
 * @param {string} title - Comparison header
 * @returns {Buffer} - PNG buffer
 */
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
 * Renders a side-by-side comparative card for two entities (Towns / Nations)
 * @param {Object} item1 - Telemetry for item 1
 * @param {Object} item2 - Telemetry for item 2
 * @param {string} title - Comparison header
 * @returns {Buffer} - PNG buffer
 */
function drawCompareChart(item1, item2, title) {
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
    cardHeaderGrad.addColorStop(
      0,
      isLeft ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.18)'
    );
    cardHeaderGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = cardHeaderGrad;
    ctx.beginPath();
    ctx.roundRect(x, yStart, panelW, 90, [12, 12, 0, 0]);
    ctx.fill();

    ctx.strokeStyle = isLeft ? '#3b82f6' : '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, yStart, panelW, panelH, 12);
    ctx.stroke();

    // Badge tag (TOWN 1 / TOWN 2)
    ctx.fillStyle = isLeft ? '#60a5fa' : '#34d399';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isLeft ? 'TOWN 1' : 'TOWN 2', x + panelW / 2, yStart + 22);

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
    ctx.fillText((item.leaderTitle || 'MAYOR').toUpperCase(), x + panelW / 2, yStart + 66);

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
    drawSubStat(yStart + 180, '📦', 'TERRITORY CHUNKS', formatNumber(item.chunks));

    // Status / Nation flag
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🚩 ${item.statusTitle || 'NATION'}`, x + panelW / 2, yStart + 238);

    ctx.fillStyle = item.statusColor || (isLeft ? '#60a5fa' : '#34d399');
    ctx.textAlign = 'center';
    drawFittedText(
      ctx,
      String(item.status || 'Neutral'),
      x + panelW / 2,
      yStart + 258,
      panelW - 24,
      12,
      'bold',
      'sans-serif'
    );
  };

  // Draw Left and Right Panels
  const leftX = 35;
  const rightX = width - 35 - panelW;
  drawPanel(leftX, item1, true);
  drawPanel(rightX, item2, false);

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
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatNumber(val1), barStartX, y - 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, midCenterX, y - 8);

    ctx.fillStyle = '#34d399';
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
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      // If full bar, round all corners, else round left corners
      ctx.roundRect(barStartX, y, w1, barH, w1 >= barW ? 5 : [5, 0, 0, 5]);
      ctx.fill();
    }

    const w2 = barW - w1;
    if (w2 > 0) {
      ctx.fillStyle = '#10b981';
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

  drawComparisonBar(yStart + 150, item1.residents ?? 0, item2.residents ?? 0, 'POPULATION RATIO');
  drawComparisonBar(yStart + 225, item1.chunks ?? 0, item2.chunks ?? 0, 'TERRITORY SIZE');

  // Footer
  ctx.fillStyle = '#334155';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ARCADIA COMMUNITY MULTI-DATA SYSTEM', midCenterX, height - 16);

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

  // Title
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 40, 40);

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
    const labelStr = isIntegerChart ? Math.round(yVal).toLocaleString() : yVal.toFixed(3);
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
