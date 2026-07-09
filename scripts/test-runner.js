/**
 * TestRunner - 轻量浏览器内测试框架
 * 零依赖，页面加载时自动执行。
 *
 * 自动执行条件：
 *   - URL 路径包含 test.html
 *   - URL 参数 ?autotest=1
 *
 * 手动执行：
 *   - console 中调用 TestRunner.runAll()
 */
(function() {
  'use strict';

  const tests = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  function test(name, fn) {
    tests.push({ name, fn });
  }

  const assert = {
    equal(actual, expected, msg) {
      if (actual !== expected) {
        throw new Error(msg || 'Expected ' + expected + ', got ' + actual);
      }
    },
    approx(actual, expected, tolerance, msg) {
      if (Math.abs(actual - expected) > (tolerance || 0.0001)) {
        throw new Error(msg || 'Expected ~' + expected + ', got ' + actual);
      }
    },
    isTrue(condition, msg) {
      if (!condition) throw new Error(msg || 'Expected truthy value');
    },
    isFalse(condition, msg) {
      if (condition) throw new Error(msg || 'Expected falsy value');
    },
    ok(val, msg) {
      if (val === null || val === undefined) throw new Error(msg || 'Expected non-null value');
    }
  };

  // ==========================================
  // 统计算法副本（独立于 active.js 闭包）
  // ==========================================
  const statistics = {
    CNT: (data) => data.length,
    SUM: (data) => data.reduce((a, item) => a + item, 0),
    AVG: (data) => statistics.SUM(data) / data.length,
    VAR: (data) => {
      const avg = statistics.AVG(data);
      return data.reduce((sum, item) => sum + ((item - avg) ** 2), 0) / data.length;
    },
    MIN: (data) => Math.min(...data),
    MAX: (data) => Math.max(...data),
    RNG: (data) => statistics.MAX(data) - statistics.MIN(data),
    MED: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    },
    STD: (data) => Math.sqrt(statistics.VAR(data)),
    MOD: (data) => {
      const freq = {};
      let maxFreq = 0, mode = data[0];
      data.forEach(v => {
        freq[v] = (freq[v] || 0) + 1;
        if (freq[v] > maxFreq) { maxFreq = freq[v]; mode = v; }
      });
      return mode;
    },
    Q1: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const pos = (sorted.length - 1) * 0.25;
      const lower = Math.floor(pos), upper = Math.ceil(pos);
      return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
    },
    Q3: (data) => {
      const sorted = data.slice().sort((a, b) => a - b);
      const pos = (sorted.length - 1) * 0.75;
      const lower = Math.floor(pos), upper = Math.ceil(pos);
      return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
    },
    IQR: (data) => statistics.Q3(data) - statistics.Q1(data),
    SKW: (data) => {
      const n = data.length;
      if (n < 3) return 0;
      const avg = statistics.AVG(data), std = statistics.STD(data);
      if (std === 0) return 0;
      const sum = data.reduce((acc, val) => acc + Math.pow((val - avg) / std, 3), 0);
      return (n / ((n - 1) * (n - 2))) * sum;
    },
    KUR: (data) => {
      const n = data.length;
      if (n < 4) return 0;
      const avg = statistics.AVG(data), std = statistics.STD(data);
      if (std === 0) return 0;
      const sum = data.reduce((acc, val) => acc + Math.pow((val - avg) / std, 4), 0);
      const kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum;
      const adjustment = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
      return kurtosis - adjustment;
    }
  };

  // ==========================================
  // parseNumber 副本
  // ==========================================
  function parseNumber(text) {
    text = text.replace(/[\$€£¥₽₹]|HK\$|NT\$/g, '');
    let isPercentage = false;
    if (text.endsWith('%')) {
      text = text.slice(0, -1);
      isPercentage = true;
    }
    // 处理数量级后缀
    let magnitude = 1;
    const lastChar = text[text.length - 1];
    if (lastChar === 'K' || lastChar === 'k') { magnitude = 1000; text = text.slice(0, -1); }
    else if (lastChar === 'M' || lastChar === 'm') { magnitude = 1000000; text = text.slice(0, -1); }
    else if (lastChar === 'B' || lastChar === 'b') { magnitude = 1000000000; text = text.slice(0, -1); }
    if (text.endsWith('万')) { magnitude = 10000; text = text.slice(0, -1); }
    else if (lastChar === 'W' || lastChar === 'w') { magnitude = 10000; text = text.slice(0, -1); }

    if (!/^[-+]?[\d,\.]*$/.test(text)) return NaN;
    let formatter = new Intl.NumberFormat();
    let testNumber = formatter.format(123.45);
    if (testNumber.includes(',')) {
      text = text.replace(/\./g, '').replace(/,/g, '.');
    } else {
      text = text.replace(/,/g, '');
    }
    let value = parseFloat(text) * magnitude;
    if (isPercentage) value /= 100;
    return value;
  }

  // ==========================================
  // 测试用例
  // ==========================================

  // --- 统计算法 ---
  test('CNT: count of array', () => {
    assert.equal(statistics.CNT([1, 2, 3, 4, 5]), 5);
    assert.equal(statistics.CNT([]), 0);
    assert.equal(statistics.CNT([42]), 1);
  });

  test('SUM: sum of array', () => {
    assert.equal(statistics.SUM([1, 2, 3, 4, 5]), 15);
    assert.equal(statistics.SUM([-1, 1]), 0);
    assert.approx(statistics.SUM([0.1, 0.2]), 0.3, 0.001);
  });

  test('AVG: average of array', () => {
    assert.equal(statistics.AVG([1, 2, 3, 4, 5]), 3);
    assert.equal(statistics.AVG([10, 20, 30]), 20);
  });

  test('VAR: variance', () => {
    assert.equal(statistics.VAR([1, 2, 3, 4, 5]), 2);
  });

  test('MIN/MAX', () => {
    assert.equal(statistics.MIN([5, 2, 8, 1, 9]), 1);
    assert.equal(statistics.MAX([5, 2, 8, 1, 9]), 9);
  });

  test('RNG: range', () => {
    assert.equal(statistics.RNG([5, 2, 8, 1, 9]), 8);
  });

  test('MED: median odd', () => {
    assert.equal(statistics.MED([1, 3, 3, 6, 7, 8, 9]), 6);
  });

  test('MED: median even', () => {
    assert.equal(statistics.MED([1, 2, 3, 4, 5, 6]), 3.5);
  });

  test('STD: standard deviation', () => {
    assert.equal(statistics.STD([1, 2, 3, 4, 5]), Math.sqrt(2));
  });

  test('MOD: mode', () => {
    assert.equal(statistics.MOD([1, 2, 2, 3, 4]), 2);
    assert.equal(statistics.MOD([5, 5, 3, 3, 5]), 5);
  });

  test('Q1/Q3/IQR', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    assert.equal(statistics.Q1(data), 3.5);
    assert.equal(statistics.Q3(data), 8.5);
    assert.equal(statistics.IQR(data), 5);
  });

  test('SKW: symmetric data near 0', () => {
    const sym = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    assert.approx(statistics.SKW(sym), 0, 0.01);
  });

  test('SKW: right-skewed data > 0', () => {
    const skewed = [1, 1, 1, 2, 2, 3, 10];
    assert.isTrue(statistics.SKW(skewed) > 0);
  });

  test('KUR: uniform data near -1.2', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    assert.approx(statistics.KUR(data), -1.2, 1.5);
  });

  // --- 数字解析 ---
  test('parseNumber: integer', () => {
    assert.equal(parseNumber('123'), 123);
    assert.equal(parseNumber('-456'), -456);
  });

  test('parseNumber: with commas', () => {
    assert.equal(parseNumber('1,234'), 1234);
    assert.equal(parseNumber('1,234,567'), 1234567);
  });

  test('parseNumber: currency', () => {
    assert.approx(parseNumber('$1,234.56'), 1234.56, 0.01);
    assert.approx(parseNumber('€99.99'), 99.99, 0.01);
    assert.equal(parseNumber('¥5,800'), 5800);
  });

  test('parseNumber: percentage', () => {
    assert.approx(parseNumber('12.5%'), 0.125, 0.001);
    assert.approx(parseNumber('-3.2%'), -0.032, 0.001);
  });

  test('parseNumber: non-numeric returns NaN', () => {
    assert.isTrue(isNaN(parseNumber('N/A')));
    assert.isTrue(isNaN(parseNumber('—')));
    assert.isTrue(isNaN(parseNumber('abc')));
  });

  // --- 数据完整性检测 ---
  test('DataIntegrity: Benford natural data not flagged', () => {
    if (!window.HiTableDataIntegrity) return;
    const natural = [];
    for (let i = 0; i < 100; i++) natural.push(Math.pow(1.1, i));
    const result = window.HiTableDataIntegrity.benfordTest(natural);
    assert.isFalse(result.flagged, 'Natural-like data should not flag Benford');
  });

  test('DataIntegrity: Benford uniform data flagged', () => {
    if (!window.HiTableDataIntegrity) return;
    const uniform = [];
    for (let i = 0; i < 100; i++) uniform.push(Math.floor(Math.random() * 900) + 100);
    const result = window.HiTableDataIntegrity.benfordTest(uniform);
    assert.isTrue(result.flagged, 'Uniform-distribution data should flag Benford');
  });

  test('DataIntegrity: rounding test flagged', () => {
    if (!window.HiTableDataIntegrity) return;
    const rounded = [100, 200, 350, 500, 600, 750, 800, 900, 1000, 1200, 1500, 2000];
    const result = window.HiTableDataIntegrity.roundingTest(rounded);
    assert.isTrue(result.flagged, 'Heavily rounded data should flag');
  });

  test('DataIntegrity: duplicate test flagged', () => {
    if (!window.HiTableDataIntegrity) return;
    const duped = [1250, 1250, 1250, 1280, 1280, 1300, 1300, 1300, 98500];
    const result = window.HiTableDataIntegrity.duplicateTest(duped);
    assert.isTrue(result.flagged, 'Data with many duplicates should flag');
  });

  test('DataIntegrity: monotonic linear data flagged', () => {
    if (!window.HiTableDataIntegrity) return;
    const linear = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const result = window.HiTableDataIntegrity.monotonicTest(linear);
    assert.isTrue(result.rSquared > 0.99, 'Linear data R² should be > 0.99');
    assert.isTrue(result.flagged, 'Linear data should flag monotonic test');
  });

  test('DataIntegrity: monotonic natural data not flagged', () => {
    if (!window.HiTableDataIntegrity) return;
    const natural = [125000, 118500, 142300, 135800, 158200, 148900, 162500, 155000];
    const result = window.HiTableDataIntegrity.monotonicTest(natural);
    assert.isTrue(result.rSquared < 0.99, 'Natural data R² should be < 0.99');
  });

  test('DataIntegrity: full analyze on anomalous data', () => {
    if (!window.HiTableDataIntegrity) return;
    const data2D = [
      [1250], [1250], [1250], [1280], [1280], [1300], [1300],
      [1300], [98500], [1350], [1400], [1450], [1500], [1550], [-500]
    ];
    const results = window.HiTableDataIntegrity.analyze(data2D, ['Amount']);
    assert.ok(results, 'analyze() should return results');
    assert.isTrue(results.flagCount > 0, 'Anomalous data should produce flags');
    assert.isTrue(results.overall.duplicate.flagged, 'Duplicate test should be flagged');
  });

  // ==========================================
  // 测试运行器
  // ==========================================
  function runAll(containerId) {
    passed = 0; failed = 0; skipped = 0;
    const results = [];

    tests.forEach(t => {
      try {
        t.fn();
        passed++;
        results.push({ name: t.name, status: 'pass' });
      } catch (e) {
        if (e.message && e.message.startsWith('SKIP:')) {
          skipped++;
          results.push({ name: t.name, status: 'skip', error: e.message });
        } else {
          failed++;
          results.push({ name: t.name, status: 'fail', error: e.message });
        }
      }
    });

    const container = document.getElementById(containerId || 'test-summary');
    if (container) {
      let html = '';
      results.forEach(r => {
        const icon = r.status === 'pass' ? '✓' : r.status === 'skip' ? '⊘' : '✗';
        const cssClass = r.status === 'pass' ? 'pass' : r.status === 'skip' ? 'skip' : 'fail';
        html += '<div class="test-result"><span class="' + cssClass + '">' + icon + ' ' + r.name;
        if (r.error) html += ' <span style="color:#999;font-size:11px;">— ' + r.error + '</span>';
        html += '</span></div>';
      });
      html += '<div class="summary-line"><span class="pass">' + passed + ' passed</span>, ';
      html += '<span class="fail">' + failed + ' failed</span>';
      if (skipped > 0) html += ', <span style="color:#999">' + skipped + ' skipped</span>';
      html += ' (' + results.length + ' total)</div>';

      container.innerHTML = html;
      container.className = 'test-summary ' + (failed === 0 ? 'all-pass' : 'has-fail');
    }

    console.log('Tests: ' + passed + ' passed, ' + failed + ' failed, ' + skipped + ' skipped');
    return { passed, failed, skipped, total: results.length };
  }

  // 暴露到全局
  window.TestRunner = { test, assert, runAll, statistics };

  // ==========================================
  // 自动执行
  // ==========================================
  function shouldAutoRun() {
    if (window.location.pathname.includes('test.html')) return true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autotest') === '1') return true;
    return false;
  }

  if (shouldAutoRun()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => runAll('test-summary'), 50);
      });
    } else {
      setTimeout(() => runAll('test-summary'), 50);
    }
  }

  console.log('HiTable: Test runner initialized (' + tests.length + ' tests)' +
    (shouldAutoRun() ? ' — auto-running' : ''));
})();
