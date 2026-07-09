/**
 * DataIntegrity - 数据造假统计检测
 * 纯本地统计方法，检测人工编造数据的常见痕迹
 * 只给信号，不给结论（标注"值得注意"而非"造假"）
 *
 * 6 项检测：
 *   1. Benford's Law — 首位数字分布是否符合自然规律
 *   2. 末位数字均匀度 — 末位数字分布是否均匀
 *   3. 取整偏好 — 以 0/5 结尾的数据占比是否异常
 *   4. 重复值检测 — 同一数值是否异常高频出现
 *   5. 比例关系异常 — 两列间比值是否过于恒定
 *   6. 单调序列检测 — 排序后是否过于线性
 */
(function() {
  'use strict';

  /**
   * 获取数字的首位数字 (1-9)
   */
  function firstDigit(n) {
    if (n === 0 || !isFinite(n)) return 0;
    const abs = Math.abs(n);
    let val = abs;
    while (val < 1 && val > 0) val *= 10;
    while (val >= 10) val /= 10;
    return Math.floor(val);
  }

  /**
   * 获取数字的末位数字 (0-9)
   */
  function lastDigit(n) {
    if (!isFinite(n)) return -1;
    const abs = Math.abs(n);
    if (Math.floor(abs) === abs && abs >= 1) {
      return Math.floor(abs) % 10;
    }
    const str = abs.toFixed(10).replace(/0+$/, '');
    const lastChar = str[str.length - 1];
    if (lastChar === '.') return Math.floor(abs) % 10;
    const parsed = parseInt(lastChar, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 从原始文本中提取末位数字（0-9）
   * 文本方式避免因数值运算丢失末尾 0
   */
  function lastDigitFromText(rawText) {
    if (!rawText) return -1;
    // 去掉货币符号、百分号、千位分隔符、空格
    let cleaned = rawText.replace(/[\$€£¥₽₹%]|HK\$|NT\$/g, '').replace(/[,\s]/g, '');
    // 去掉可能的前导符号
    cleaned = cleaned.replace(/^[+\-]/, '');
    // 找最后一个数字字符
    for (let i = cleaned.length - 1; i >= 0; i--) {
      const ch = cleaned[i];
      if (ch >= '0' && ch <= '9') {
        return parseInt(ch, 10);
      }
    }
    return -1;
  }

  /**
   * 基于原始文本的末位数字检测（替代数值方式的 lastDigitTest）
   */
  function lastDigitTestFromText(rawValues) {
    const texts = rawValues.filter(t => t && t.trim());
    if (texts.length < 20) {
      return { score: 1, distribution: [], flagged: false, insufficient: true };
    }

    const counts = new Array(10).fill(0);
    texts.forEach(t => {
      const d = lastDigitFromText(t);
      if (d >= 0 && d <= 9) counts[d]++;
    });

    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return { score: 1, distribution: [], flagged: false };
    const distribution = counts.map(c => c / total);

    let chiSq = 0;
    for (let i = 0; i < 10; i++) {
      const expected = total / 10;
      chiSq += Math.pow(counts[i] - expected, 2) / expected;
    }

    const score = Math.max(0, 1 - chiSq / 30);
    const dominant = distribution.findIndex(d => d > 0.2);
    const flagged = chiSq > 16 || dominant >= 0;

    return {
      score: Math.round(score * 100) / 100,
      distribution,
      chiSquare: Math.round(chiSq * 100) / 100,
      dominantDigit: dominant >= 0 ? dominant : null,
      flagged
    };
  }

  /**
   * 1. Benford's Law 符合度检测
   *
   * Benford 定律：自然产生的数据，首位数字 1 出现约 30.1%，
   * 9 出现约 4.6%。人为编造的数据往往偏离此分布。
   *
   * @param {number[]} values
   * @returns {{score: number, observed: number[], expected: number[], flagged: boolean, maxDiff?: number, insufficient?: boolean}}
   */
  function benfordTest(values) {
    const BENFORD = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

    const nonZero = values.filter(v => v !== 0 && isFinite(v));
    if (nonZero.length < 30) {
      return { score: 1, observed: [], expected: BENFORD, flagged: false, insufficient: true };
    }

    const counts = new Array(10).fill(0);
    nonZero.forEach(v => {
      const d = firstDigit(v);
      if (d >= 1 && d <= 9) counts[d]++;
    });

    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return { score: 1, observed: [], expected: BENFORD, flagged: false, insufficient: true };
    const observed = counts.map(c => c / total);

    let maxDiff = 0;
    let cumObs = 0, cumExp = 0;
    for (let i = 0; i <= 9; i++) {
      cumObs += observed[i] || 0;
      cumExp += BENFORD[i] || 0;
      maxDiff = Math.max(maxDiff, Math.abs(cumObs - cumExp));
    }

    const score = Math.max(0, 1 - maxDiff * 5);

    return {
      score: Math.round(score * 100) / 100,
      observed: observed.slice(1),
      expected: BENFORD.slice(1),
      flagged: maxDiff > 0.15,
      maxDiff: Math.round(maxDiff * 1000) / 1000
    };
  }

  /**
   * 2. 末位数字均匀度检测
   *
   * 人的"随机感"不是真正的随机。人工编造数据时：
   *   - 过度避免重复（同一位连续出现相同数字）
   *   - 偏好某些数字（如 0, 5, 8）
   *   - 避免某些数字（感觉"太随机"）
   *
   * @param {number[]} values
   * @returns {{score: number, distribution: number[], flagged: boolean, chiSquare?: number, dominantDigit?: number, insufficient?: boolean}}
   */
  function lastDigitTest(values) {
    const numeric = values.filter(v => isFinite(v));
    if (numeric.length < 20) {
      return { score: 1, distribution: [], flagged: false, insufficient: true };
    }

    const counts = new Array(10).fill(0);
    numeric.forEach(v => {
      const d = lastDigit(v);
      if (d >= 0 && d <= 9) counts[d]++;
    });

    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return { score: 1, distribution: [], flagged: false };
    const distribution = counts.map(c => c / total);

    let chiSq = 0;
    for (let i = 0; i < 10; i++) {
      const expected = total / 10;
      chiSq += Math.pow(counts[i] - expected, 2) / expected;
    }

    const score = Math.max(0, 1 - chiSq / 30);
    const dominant = distribution.findIndex(d => d > 0.2);
    const flagged = chiSq > 16 || dominant >= 0;

    return {
      score: Math.round(score * 100) / 100,
      distribution,
      chiSquare: Math.round(chiSq * 100) / 100,
      dominantDigit: dominant >= 0 ? dominant : null,
      flagged
    };
  }

  /**
   * 3. 取整偏好检测
   *
   * 手工填写数据时倾向于以 0、5、00、50 结尾。
   * 自然数据约 20% 以 0 结尾 + 10% 以 5 结尾 ≈ 30%。
   * 超过 50% 视为可疑。
   *
   * @param {number[]} values
   * @returns {{score: number, roundRatio: number, flagged: boolean, insufficient?: boolean}}
   */
  function roundingTest(values) {
    const numeric = values.filter(v => isFinite(v) && v !== 0);
    if (numeric.length < 10) {
      return { score: 1, roundRatio: 0, flagged: false, insufficient: true };
    }

    let roundCount = 0;
    numeric.forEach(v => {
      const intPart = Math.floor(Math.abs(v));
      if (intPart % 10 === 0 || intPart % 5 === 0) {
        roundCount++;
      }
    });

    const ratio = roundCount / numeric.length;
    const score = Math.max(0, 1 - (ratio - 0.3) / 0.4);

    return {
      score: Math.round(score * 100) / 100,
      roundRatio: Math.round(ratio * 100) / 100,
      flagged: ratio > 0.5
    };
  }

  /**
   * 4. 重复值检测
   *
   * 检查数据集中是否存在异常高频率的重复值。
   * 单个值占比 > 25% 视为可疑。
   *
   * @param {number[]} values
   * @returns {{score: number, duplicateRatio: number, mostFrequentValue: number|null, mostFrequentCount: number, flagged: boolean, insufficient?: boolean}}
   */
  function duplicateTest(values) {
    const numeric = values.filter(v => isFinite(v));
    if (numeric.length < 10) {
      return { score: 1, duplicateRatio: 0, flagged: false, insufficient: true };
    }

    const freq = {};
    numeric.forEach(v => {
      const key = Math.round(v * 10000) / 10000;
      freq[key] = (freq[key] || 0) + 1;
    });

    let maxFreq = 0;
    let maxFreqValue = null;
    for (const [key, count] of Object.entries(freq)) {
      if (count > maxFreq) {
        maxFreq = count;
        maxFreqValue = parseFloat(key);
      }
    }

    const duplicateRatio = maxFreq / numeric.length;
    const flagged = duplicateRatio > 0.25;
    const score = Math.max(0, 1 - duplicateRatio / 0.5);

    return {
      score: Math.round(score * 100) / 100,
      duplicateRatio: Math.round(duplicateRatio * 100) / 100,
      mostFrequentValue: maxFreqValue,
      mostFrequentCount: maxFreq,
      flagged
    };
  }

  /**
   * 5. 比例关系异常检测
   *
   * 如果某两列之间存在过于整齐的比例关系（所有行 B/A 几乎相同），
   * 可能是用公式生成的（变异系数 CV < 0.02）。
   *
   * @param {number[][]} data2D
   * @returns {Array<{colA: number, colB: number, ratioAvg: number, ratioStd: number, cv: number, flagged: boolean}>}
   */
  function ratioAnomalyTest(data2D) {
    const colCount = data2D[0]?.length || 0;
    if (colCount < 2) return [];

    const results = [];

    for (let a = 0; a < colCount; a++) {
      for (let b = a + 1; b < colCount; b++) {
        const ratios = [];
        for (let r = 0; r < data2D.length; r++) {
          const valA = data2D[r][a];
          const valB = data2D[r][b];
          if (!isNaN(valA) && !isNaN(valB) && isFinite(valA) && valA !== 0) {
            ratios.push(valB / valA);
          }
        }

        if (ratios.length < 5) continue;

        const avg = ratios.reduce((s, v) => s + v, 0) / ratios.length;
        const variance = ratios.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / ratios.length;
        const std = Math.sqrt(variance);
        const cv = avg !== 0 ? std / Math.abs(avg) : 0;

        if (cv < 0.02) {
          results.push({
            colA: a,
            colB: b,
            ratioAvg: Math.round(avg * 10000) / 10000,
            ratioStd: Math.round(std * 10000) / 10000,
            cv: Math.round(cv * 10000) / 10000,
            flagged: true
          });
        }
      }
    }

    return results;
  }

  /**
   * 6. 单调序列检测
   *
   * 排序后计算 R²，如果过于接近 1 说明数据太"整齐"，
   * 可能是用 Excel 拖拽填充生成的。
   *
   * @param {number[]} values
   * @returns {{score: number, monotonicType: string|null, rSquared: number, flagged: boolean, insufficient?: boolean}}
   */
  function monotonicTest(values) {
    const numeric = values.filter(v => isFinite(v));
    if (numeric.length < 8) {
      return { score: 1, monotonicType: null, flagged: false, insufficient: true };
    }

    const sorted = [...numeric].sort((a, b) => a - b);
    const n = sorted.length;
    const xMean = (n - 1) / 2;
    const yMean = sorted.reduce((a, b) => a + b, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (sorted[i] - yMean);
      den += Math.pow(i - xMean, 2);
    }

    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;

    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      ssRes += Math.pow(sorted[i] - predicted, 2);
      ssTot += Math.pow(sorted[i] - yMean, 2);
    }

    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
    const flagged = rSquared > 0.97;
    const score = Math.max(0, 1 - rSquared);

    return {
      score: Math.round(score * 100) / 100,
      rSquared: Math.round(rSquared * 10000) / 10000,
      monotonicType: flagged ? 'linear' : null,
      flagged
    };
  }

  /**
   * 综合分析入口
   * @param {number[][]} data2D - 二维数组，[row][col]，已过滤非数值
   * @param {string[]} columnLabels - 列标签（表头文本）
   * @returns {Object|null} 分析结果
   */
  function analyze(data2D, columnLabels, rawData2D) {
    if (!data2D || data2D.length < 2) return null;

    // 如果有原始文本数据，用文本方式检测末位数字
    const rawFlat = rawData2D ? rawData2D.flat().filter(t => t && t.trim()) : null;

    const results = {
      overall: {
        benford: null,
        lastDigit: null,
        rounding: null,
        duplicate: null,
        monotonic: null
      },
      columns: [],
      rows: [],
      crossColumn: {
        ratios: []
      },
      flagCount: 0,
      totalTests: 0
    };

    const flat = data2D.flat().filter(v => !isNaN(v) && isFinite(v));

    results.overall.benford = benfordTest(flat);
    results.overall.lastDigit = rawFlat
      ? lastDigitTestFromText(rawFlat)
      : lastDigitTest(flat);
    results.overall.rounding = roundingTest(flat);
    results.overall.duplicate = duplicateTest(flat);
    results.overall.monotonic = monotonicTest(flat);

    const colCount = data2D[0]?.length || 0;
    for (let c = 0; c < colCount; c++) {
      const colData = data2D.map(row => row[c]).filter(v => !isNaN(v) && isFinite(v));
      if (colData.length < 5) continue;
      const colRaw = rawData2D ? rawData2D.map(row => row[c]).filter(t => t && t.trim()) : null;

      results.columns.push({
        colIndex: c,
        label: (columnLabels && columnLabels[c]) || ('Col ' + (c + 1)),
        benford: benfordTest(colData),
        lastDigit: colRaw ? lastDigitTestFromText(colRaw) : lastDigitTest(colData),
        rounding: roundingTest(colData),
        duplicate: duplicateTest(colData),
        monotonic: monotonicTest(colData)
      });
    }

    // 逐行检测
    for (let r = 0; r < data2D.length; r++) {
      const rowData = data2D[r].filter(v => !isNaN(v) && isFinite(v));
      if (rowData.length < 3) continue;

      results.rows.push({
        rowIndex: r,
        rounding: roundingTest(rowData),
        duplicate: duplicateTest(rowData),
        monotonic: monotonicTest(rowData)
      });
    }

    results.crossColumn.ratios = ratioAnomalyTest(data2D);

    const countFlags = (obj) => {
      let count = 0;
      if (!obj) return 0;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (typeof item === 'object' && item !== null) {
            count += countFlags(item);
          }
        }
        return count;
      }
      for (const key of Object.keys(obj)) {
        if (key === 'flagged' && obj[key] === true) count++;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          count += countFlags(obj[key]);
        }
      }
      return count;
    };

    results.flagCount = countFlags(results);
    results.totalTests = 6 + results.columns.length * 5 + 1;

    return results;
  }

  /**
   * 生成人类可读的标记摘要
   * @param {Object} results - analyze() 的返回值
   * @param {Function} getMessage - i18n 函数
   * @returns {string[]} 摘要字符串数组
   */
  function generateSummary(results, getMessage) {
    if (!results) return [];

    const items = [];

    if (results.overall.benford?.flagged) {
      items.push(getMessage('integrityBenfordFlag', [
        String(results.overall.benford.maxDiff)
      ]));
    } else if (!results.overall.benford?.insufficient) {
      items.push(getMessage('integrityBenfordPass'));
    }

    if (results.overall.lastDigit?.flagged) {
      const dom = results.overall.lastDigit.dominantDigit;
      if (dom !== null) {
        items.push(getMessage('integrityLastDigitFlag', [String(dom)]));
      } else {
        items.push(getMessage('integrityLastDigitUneven'));
      }
    }

    if (results.overall.rounding?.flagged) {
      items.push(getMessage('integrityRoundingFlag', [
        String(Math.round(results.overall.rounding.roundRatio * 100))
      ]));
    }

    if (results.overall.duplicate?.flagged) {
      items.push(getMessage('integrityDuplicateFlag', [
        String(results.overall.duplicate.mostFrequentCount),
        String(Math.round(results.overall.duplicate.duplicateRatio * 100))
      ]));
    }

    if (results.overall.monotonic?.flagged) {
      items.push(getMessage('integrityMonotonicFlag', [
        String(Math.round(results.overall.monotonic.rSquared * 100))
      ]));
    }

    results.crossColumn.ratios.forEach(r => {
      items.push(getMessage('integrityRatioFlag', [
        String.fromCharCode(65 + r.colA),
        String.fromCharCode(65 + r.colB),
        String(r.ratioAvg)
      ]));
    });

    return items;
  }

  // 暴露到全局
  window.HiTableDataIntegrity = {
    analyze,
    generateSummary,
    benfordTest,
    lastDigitTest,
    lastDigitTestFromText,
    lastDigitFromText,
    roundingTest,
    duplicateTest,
    ratioAnomalyTest,
    monotonicTest
  };

  console.log('HiTable: Data integrity checker initialized');
})();
