/**
 * GridDetector - 非标准表格结构检测
 * 检测页面上不使用 <table> 标签但视觉上呈表格布局的元素组
 *
 * 策略：
 *   1. 优先语义标记（role="grid", role="table"），置信度最高
 *   2. 其次 CSS 类名模式匹配（.table, .grid, .MuiTable-root 等）
 *   3. 最后基于子元素几何位置聚类
 *
 * 安全：
 *   - 内置域名排除列表，避免在代码仓库等页面误匹配
 *   - 跳过 display:none / visibility:hidden 的元素
 *   - 排除 HiTable overlay 内的元素
 */
(function() {
  'use strict';

  // ==========================================
  // 域名排除列表
  // ==========================================
  const EXCLUDED_DOMAINS = [
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'gitee.com',
    'stackoverflow.com',
    'codepen.io',
    'jsfiddle.net',
    'codesandbox.io',
    'sourcegraph.com',
  ];

  function isExcludedDomain() {
    const hostname = window.location.hostname;
    return EXCLUDED_DOMAINS.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  }

  // ==========================================
  // 选择器
  // ==========================================

  // 语义选择器 —— 高置信度，优先级最高
  const SEMANTIC_SELECTORS = [
    '[role="grid"]',
    '[role="table"]',
    '[role="treegrid"]',
    '[data-table]',
    '[data-grid]'
  ];

  // 候选容器选择器 —— 可能包含表格型布局
  const CANDIDATE_SELECTORS = [
    '.table', '.data-table', '.grid', '.data-grid',
    '[class*="table"]', '[class*="grid"]',
    '.MuiTable-root',        // Material-UI
    '.ag-grid',              // AG Grid
    '.dx-datagrid',          // DevExtreme
    '.k-grid',               // Kendo UI
    '.handsontable',         // Handsontable
    '.ant-table',            // Ant Design
    '.el-table',             // Element UI
    '.v-data-table',         // Vuetify
  ];

  // ==========================================
  // 工具函数
  // ==========================================

  /**
   * 检查元素是否应该被排除（位于 overlay 内、太小的元素、或隐藏元素）
   */
  function shouldSkipElement(el) {
    if (!el || !el.getBoundingClientRect) return true;
    // 排除 HiTable overlay 内的元素
    if (el.closest('.HiTableOverlay')) return true;
    // 排除不可见元素（display:none 或 visibility:hidden）
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
    // 排除隐藏的祖先元素
    let parent = el.parentElement;
    while (parent) {
      const pStyle = window.getComputedStyle(parent);
      if (pStyle.display === 'none' || pStyle.visibility === 'hidden') return true;
      parent = parent.parentElement;
    }
    const rect = el.getBoundingClientRect();
    return rect.width < 100 || rect.height < 50; // 太小的忽略
  }

  // ==========================================
  // 检测方法
  // ==========================================

  /**
   * 从语义选择器检测表格
   */
  function detectBySemantics(root) {
    const results = [];
    for (const selector of SEMANTIC_SELECTORS) {
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(el => {
          if (!shouldSkipElement(el) && !results.includes(el)) {
            results.push(el);
          }
        });
      } catch (e) {
        // 无效的选择器，跳过
      }
    }
    return results;
  }

  /**
   * 从 CSS 类名模式检测表格
   */
  function detectByClassName(root) {
    // 在排除的域名上跳过 CSS 类名检测（语义检测仍然生效）
    if (isExcludedDomain()) {
      return [];
    }
    const results = [];
    for (const selector of CANDIDATE_SELECTORS) {
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(el => {
          // 排除已经是标准 table 的祖先
          if (el.closest('table') && !el.closest('.HiTableOverlay')) return;
          if (!shouldSkipElement(el) && !results.includes(el)) {
            // 进一步验证：检查子元素中是否有规律排列的单元格
            if (hasGridLikeChildren(el)) {
              results.push(el);
            }
          }
        });
      } catch (e) {
        // 无效的选择器，跳过
      }
    }
    return results;
  }

  /**
   * 检查容器的直接子元素是否呈网格排列
   */
  function hasGridLikeChildren(container) {
    const children = Array.from(container.children).filter(child => {
      const rect = child.getBoundingClientRect();
      return rect.width > 10 && rect.height > 5;
    });

    if (children.length < 4) return false;

    const rects = children.map(child => ({
      el: child,
      rect: child.getBoundingClientRect()
    }));

    const rowClusters = clusterByCoordinate(rects, 'top', 5);
    const colClusters = clusterByCoordinate(rects, 'left', 5);

    if (rowClusters.length < 2 || colClusters.length < 2) return false;

    const avgPerRow = rects.length / rowClusters.length;
    return avgPerRow >= 2;
  }

  /**
   * 按坐标值聚类
   */
  function clusterByCoordinate(items, coordKey, tolerance) {
    const values = [...new Set(items.map(item => item.rect[coordKey]))].sort((a, b) => a - b);

    const clusters = [];
    let currentCluster = [values[0]];

    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - currentCluster[currentCluster.length - 1]) <= tolerance) {
        currentCluster.push(values[i]);
      } else {
        clusters.push(currentCluster);
        currentCluster = [values[i]];
      }
    }
    clusters.push(currentCluster);

    return clusters;
  }

  /**
   * 基于几何位置将容器内的子元素构建为逻辑行列结构
   */
  function buildGridFromContainer(container) {
    const children = Array.from(container.children).filter(child => {
      const rect = child.getBoundingClientRect();
      return rect.width > 10 && rect.height > 5;
    });

    const rects = children.map(child => ({
      el: child,
      rect: child.getBoundingClientRect()
    }));

    const rowClusters = clusterByCoordinate(rects, 'top', 5);

    const rows = rowClusters.map(cluster => {
      const coerces = cluster.map(value => {
        return rects.filter(item => Math.abs(item.rect.top - value) <= 5);
      }).flat();
      const unique = [];
      const seen = new Set();
      for (const item of coerces) {
        if (!seen.has(item.el)) {
          seen.add(item.el);
          unique.push(item);
        }
      }
      unique.sort((a, b) => a.rect.left - b.rect.left);
      return unique.map(item => item.el);
    });

    return {
      container,
      rows,
      rect: container.getBoundingClientRect()
    };
  }

  // ==========================================
  // 主入口
  // ==========================================

  /**
   * 在根元素内查找所有非标准表格
   * @param {Element} root - 搜索根元素（通常是 document.body）
   * @returns {Array<{container: Element, rows: Element[][], rect: DOMRect}>}
   */
  function findGrids(root) {
    root = root || document.body;

    const semanticContainers = detectBySemantics(root);
    const classContainers = detectByClassName(root);

    const allContainers = [...semanticContainers];
    for (const el of classContainers) {
      if (!allContainers.includes(el)) {
        allContainers.push(el);
      }
    }

    const grids = [];
    for (const container of allContainers) {
      try {
        const grid = buildGridFromContainer(container);
        if (grid.rows.length >= 2 && grid.rows[0].length >= 2) {
          grids.push(grid);
        }
      } catch (e) {
        console.warn('HiTable: Failed to build grid from container:', container, e);
      }
    }

    return grids;
  }

  // 暴露到全局
  window.HiTableGridDetector = {
    findGrids,
    buildGridFromContainer,
    detectBySemantics,
    detectByClassName,
    hasGridLikeChildren
  };

  console.log('HiTable: Grid detector initialized');
})();
