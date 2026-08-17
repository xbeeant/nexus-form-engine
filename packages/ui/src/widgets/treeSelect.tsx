// ============================================================================
// treeSelectWidget — 远程数据树选择组件
// 基于 antd TreeSelect，API 对齐 ProFormTreeSelect 风格
//
// 特性：
//   1. 远程数据加载（url / request）
//   2. 本地搜索 + 远程搜索
//   3. 异步加载子节点（asyncLoad）
//   4. 编辑模式：回显中文标签 + 自动展开到选中节点
//   5. 只读模式：通过接口回显标签
// ============================================================================

import { Spin, TreeSelect, Typography } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import type { TreeSelectProps } from 'antd/es/tree-select';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormItem, type WidgetProps } from './_shared';

/** antd v6 TreeSelect 树节点类型（DataNode：value 为 SafeKey，不含 null） */
type TreeDataNode = NonNullable<TreeSelectProps['treeData']>[number];
type TreeFilterFn = NonNullable<TreeSelectProps['filterTreeNode']>;
type TreeExpandedKeys = NonNullable<TreeSelectProps['treeExpandedKeys']>;
type TreeLoadDataFn = NonNullable<TreeSelectProps['loadData']>;

// ── 类型 ──────────────────────────────────────────────────────────────────

export interface TreeSelectConfig {
  /** 数据请求函数，(params) => Promise<数据数组> */
  request?: (params?: Record<string, unknown>) => Promise<unknown>;
  /** 数据接口地址（与 request 二选一） */
  url?: string;
  /** 额外请求参数 */
  params?: Record<string, unknown>;
  /** 静态树形数据（与 request/url 二选一） */
  treeData?: DefaultOptionType[];
  /** 远程搜索接口地址 */
  searchUrl?: string;
  /** 搜索参数名（默认 'keyword'） */
  searchKey?: string;
  /** 异步加载子节点时传递的父节点参数名（默认 'pid'） */
  parentKey?: string;
  /** 响应数据中父节点 ID 字段名（默认 'pid'） */
  pidKey?: string;
  /** 响应数据取值路径（如 'data.list'） */
  dataPath?: string;
  /** value 对应的 key（默认 'value'） */
  valueKey?: string;
  /** label 对应的 key（默认 'label'） */
  labelKey?: string;
  /** children 对应的 key（默认 'children'） */
  childrenKey?: string;
  /** 是否可多选 */
  multiple?: boolean;
  /** 是否可搜索（默认 true） */
  showSearch?: boolean;
  /** 是否自动展开一级节点（默认 false） */
  autoExpand?: boolean;
  /** 是否启用异步加载子节点（默认 false） */
  asyncLoad?: boolean;
  /** 只读回显请求函数 */
  readOnlyRequest?: (
    value: unknown,
  ) => Promise<{ label?: string; [key: string]: unknown } | null>;
  /** 只读回显请求地址（简化版） */
  readOnlyUrl?: string;
  /** 请求方法（默认 GET） */
  method?: 'GET' | 'POST';
  /** 后端数据标识"是否有子节点"的字段名 */
  hasChildrenKey?: string;
  /** 后端数据标识"是否叶子节点"的字段名 */
  isLeafKey?: string;
  /** 是否允许清除（默认 true） */
  allowClear?: boolean;
}

// ── 工具函数 ──────────────────────────────────────────────────────────────

/** 按点号路径从对象中取值 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) {
    return obj;
  }
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/** 构建请求 URL，新参数覆盖 URL 中已有的同名参数 */
function buildUrl(baseUrl: string, params?: Record<string, unknown>): string {
  const [pathname, existingQuery] = baseUrl.split('?');
  const existing = new URLSearchParams(existingQuery || '');
  if (params && Object.keys(params).length > 0) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        existing.set(k, String(v));
      } else {
        existing.delete(k);
      }
    }
  }
  const qs = existing.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** 默认 fetch 请求封装 */
async function defaultFetch(
  url: string,
  method: 'GET' | 'POST',
  dataPath: string,
  params?: Record<string, unknown>,
): Promise<unknown[]> {
  const fullUrl = buildUrl(url, method === 'GET' ? params : undefined);
  const resp = await fetch(fullUrl, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(params) : undefined,
  });
  const json = await resp.json();
  const rawData = getNestedValue(json, dataPath);
  return Array.isArray(rawData) ? rawData : [];
}

/** 后端数据 → antd TreeSelect treeData */
function normalizeTreeData(
  rawData: unknown[],
  cfg: {
    valueKey: string;
    labelKey: string;
    childrenKey: string;
    asyncLoad: boolean;
    hasChildrenKey?: string;
    isLeafKey?: string;
  },
): DefaultOptionType[] {
  return rawData.map((item) => {
    const r = item as Record<string, unknown>;
    const children = r[cfg.childrenKey] as unknown[] | undefined;
    const node: DefaultOptionType = {
      value: r[cfg.valueKey] as string | number,
      title: String(r[cfg.labelKey] ?? ''),
      key: r[cfg.valueKey],
    };
    if (children && children.length > 0) {
      node.children = normalizeTreeData(children, cfg);
    } else if (cfg.asyncLoad) {
      // 优先使用后端明确标记的 isLeaf / hasChildren 字段
      if (cfg.isLeafKey && r[cfg.isLeafKey] !== undefined) {
        node.isLeaf = !!r[cfg.isLeafKey];
      } else if (cfg.hasChildrenKey && r[cfg.hasChildrenKey] !== undefined) {
        node.isLeaf = !r[cfg.hasChildrenKey];
      } else {
        // 无法判断 → 假设可展开，触发 loadData
        node.isLeaf = false;
      }
    }
    return node;
  });
}

/** 更新树中指定节点的 children（异步加载子节点后使用） */
function updateTreeData(
  list: DefaultOptionType[],
  key: React.Key,
  children: DefaultOptionType[],
): DefaultOptionType[] {
  return list.map((node) => {
    if (node.key === key) {
      return { ...node, children, isLeaf: children.length === 0 };
    }
    if (node.children) {
      return {
        ...node,
        children: updateTreeData(node.children, key, children),
      };
    }
    return node;
  });
}

/** 在树中查找指定 value 的节点（返回节点本身，用于后续合并） */
function findNodeInTree(
  tree: DefaultOptionType[],
  targetValue: unknown,
): DefaultOptionType | null {
  for (const node of tree) {
    if (node.value === targetValue) {
      return node;
    }
    if (node.children) {
      const found = findNodeInTree(node.children, targetValue);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * 将 newNode 合并到 existing 列表中（递归）
 * - 同 key 节点：保留已有 title，合并 children
 * - 新节点：追加到列表
 */
function mergeNodeList(
  list: DefaultOptionType[],
  newNode: DefaultOptionType,
): DefaultOptionType[] {
  const idx = list.findIndex((n) => n.key === newNode.key);
  if (idx === -1) {
    return [...list, newNode];
  }
  const existing = list[idx];
  const mergedChildren = mergeChildren(
    existing.children ?? [],
    newNode.children ?? [],
  );
  const result = [...list];
  result[idx] = {
    ...existing,
    title: existing.title || newNode.title,
    isLeaf: mergedChildren.length > 0 ? false : existing.isLeaf,
    children: mergedChildren.length > 0 ? mergedChildren : undefined,
  };
  return result;
}

/** 合并两组 children（同 key 递归合并） */
function mergeChildren(
  existing: DefaultOptionType[],
  incoming: DefaultOptionType[],
): DefaultOptionType[] {
  let result = [...existing];
  for (const node of incoming) {
    result = mergeNodeList(result, node);
  }
  return result;
}

/** 本地搜索过滤 */
function localFilter(inputValue: string, treeNode: DefaultOptionType): boolean {
  const title = String(treeNode.title ?? '');
  return title.toLowerCase().includes(inputValue.toLowerCase());
}

/**
 * 将扁平记录（通过 pidKey 关联）构建为嵌套树
 * - 记录之间通过 pidKey → valueKey 建立父子关系
 * - 根节点 = pid 为空/0/'0'/null/undefined 的记录
 */
function buildTreeFromFlatRecords(
  records: Record<string, unknown>[],
  cfg: {
    valueKey: string;
    labelKey: string;
    childrenKey: string;
    asyncLoad: boolean;
    pidKey: string;
    hasChildrenKey?: string;
    isLeafKey?: string;
  },
): DefaultOptionType[] {
  // 去重：同 valueKey 的记录只保留一条
  const seen = new Set<string>();
  const unique: Record<string, unknown>[] = [];
  for (const r of records) {
    const vid = String(r[cfg.valueKey] ?? '');
    if (!seen.has(vid)) {
      seen.add(vid);
      unique.push(r);
    }
  }

  // 构建 value → children 映射
  const childrenMap = new Map<string, Record<string, unknown>[]>();
  for (const r of unique) {
    const pid = String(r[cfg.pidKey] ?? '');
    if (!childrenMap.has(pid)) {
      childrenMap.set(pid, []);
    }
    childrenMap.get(pid)?.push(r);
  }

  // 判断是否根节点
  const isRootPid = (pid: unknown): boolean => {
    return (
      pid === undefined ||
      pid === null ||
      pid === 0 ||
      pid === '0' ||
      pid === ''
    );
  };

  // 递归构建子树
  function buildNodes(parentId: string): DefaultOptionType[] {
    const list = childrenMap.get(parentId);
    if (!list || list.length === 0) {
      return [];
    }

    return list.map((r) => {
      const vid = String(r[cfg.valueKey] ?? '');
      const children = buildNodes(vid);
      const node: DefaultOptionType = {
        value: r[cfg.valueKey] as string | number,
        title: String(r[cfg.labelKey] ?? ''),
        key: r[cfg.valueKey],
      };

      if (children.length > 0) {
        node.children = children;
      } else if (cfg.asyncLoad) {
        // 优先使用后端标记
        if (cfg.isLeafKey && r[cfg.isLeafKey] !== undefined) {
          node.isLeaf = !!r[cfg.isLeafKey];
        } else if (cfg.hasChildrenKey && r[cfg.hasChildrenKey] !== undefined) {
          node.isLeaf = !r[cfg.hasChildrenKey];
        } else {
          node.isLeaf = false;
        }
      }

      return node;
    });
  }

  // 收集所有根节点
  const roots: DefaultOptionType[] = [];
  // 显式根 pid：空/0/'0'
  for (const rootPid of ['', '0', 'null', 'undefined']) {
    roots.push(...buildNodes(rootPid));
  }
  // pid=0 的整数
  roots.push(...buildNodes('0'));
  // 记录中 pid 不在所有 value 中的也是根节点
  for (const r of unique) {
    const pid = r[cfg.pidKey];
    if (isRootPid(pid)) {
      continue;
    }
    if (!seen.has(String(pid))) {
      // pid 指向的记录不在集合中 → 当前记录视为根节点
      if (!roots.find((n) => n.key === r[cfg.valueKey])) {
        const node: DefaultOptionType = {
          value: r[cfg.valueKey] as string | number,
          title: String(r[cfg.labelKey] ?? ''),
          key: r[cfg.valueKey],
        };
        const children = buildNodes(String(r[cfg.valueKey]));
        if (children.length > 0) {
          node.children = children;
        } else if (cfg.asyncLoad) {
          node.isLeaf = false;
        }
        roots.push(node);
      }
    }
  }

  return roots;
}

// ── 组件 ──────────────────────────────────────────────────────────────────

export function TreeSelectWidget(props: WidgetProps & TreeSelectConfig) {
  // 公共 Form.Item 包裹：label=false 时自动不包裹（裸渲染控件）
  const { wrap } = useFormItem(props);

  const {
    value,
    onChange,
    placeholder,
    disabled,
    loading,
    title: _title,
    description: _desc,
    errors: _errors,
    extra: _extra,
    width: _width,
    readOnly,
    required: _required,
    displayType: _displayType,
    labelWidth: _labelWidth,
    form: _form,
    options: _opt,
    column: _col,
    ...rest
  } = props;

  // 解析 params（可能是设计器传入的 JSON 字符串）
  let paramsValue: unknown = rest.params;
  if (typeof paramsValue === 'string' && paramsValue.trim()) {
    try {
      paramsValue = JSON.parse(paramsValue) as Record<string, unknown>;
    } catch {
      paramsValue = {};
    }
  }

  // ── 从 rest 提取配置 ──
  const cfg = {
    request: rest.request,
    url: rest.url,
    params: paramsValue as Record<string, unknown> | undefined,
    treeData: rest.treeData,
    searchUrl: rest.searchUrl,
    searchKey: rest.searchKey || 'keyword',
    parentKey: rest.parentKey || 'pid',
    pidKey: rest.pidKey || 'pid',
    dataPath: rest.dataPath || '',
    valueKey: rest.valueKey || 'value',
    labelKey: rest.labelKey || 'label',
    childrenKey: rest.childrenKey || 'children',
    hasChildrenKey: rest.hasChildrenKey,
    isLeafKey: rest.isLeafKey,
    multiple: rest.multiple ?? false,
    showSearch: rest.showSearch ?? true,
    autoExpand: rest.autoExpand ?? false,
    asyncLoad: rest.asyncLoad ?? false,
    readOnlyUrl: rest.readOnlyUrl,
    readOnlyRequest: rest.readOnlyRequest,
    method: rest.method || 'GET',
    allowClear: rest.allowClear ?? true,
  };

  // 始终保持最新的 cfg 引用，避免 useCallback 闭包过期
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // 从 cfgRef 解析当前请求函数
  const getRequest = useCallback(():
    | ((p?: Record<string, unknown>) => Promise<unknown>)
    | undefined => {
    const c = cfgRef.current;
    if (c.request) {
      return c.request;
    }
    if (c.url) {
      return (p?: Record<string, unknown>) =>
        defaultFetch(c.url!, c.method, c.dataPath, p);
    }
    return undefined;
  }, []);

  // ── 状态 ──
  const [treeData, setTreeData] = useState<DefaultOptionType[]>([]);
  const [fetching, setFetching] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [readOnlyLabel, setReadOnlyLabel] = useState<string>('');
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);

  // ── 请求数据（核心函数） ──
  const loadData = useCallback(
    async (extraParams?: Record<string, unknown>): Promise<void> => {
      const c = cfgRef.current;
      const request = getRequest();

      if (request) {
        setFetching(true);
        try {
          const merged = { ...(c.params || {}), ...extraParams };
          const raw = await request(merged);
          const arr = Array.isArray(raw) ? raw : [];
          const normalized = normalizeTreeData(arr, c);
          setTreeData(normalized);
          if (c.autoExpand) {
            setExpandedKeys(
              normalized
                .filter((d) => d.children && d.children.length > 0)
                .map((d) => d.key!),
            );
          }
        } catch (err) {
          console.error('[treeSelect] load error:', err);
          setTreeData([]);
        } finally {
          setFetching(false);
        }
      } else if (c.treeData) {
        setTreeData(c.treeData);
        if (c.autoExpand) {
          setExpandedKeys(
            c.treeData
              .filter((d) => d.children && d.children.length > 0)
              .map((d) => d.key!),
          );
        }
      }
    },
    [getRequest],
  );

  // ── 初始加载（仅一次） ──
  useEffect(() => {
    if (loadedRef.current) {
      return;
    }
    loadedRef.current = true;
    loadData();
  }, [loadData]);

  // params 变化时重新加载
  const _paramsStr = JSON.stringify(cfg.params || {});
  // biome-ignore lint/correctness/useExhaustiveDependencies: _paramsStr 是 reload 触发条件（loadData 经 cfgRef 闭包读取，biome 无法感知）
  useEffect(() => {
    if (!loadedRef.current) {
      return;
    }
    loadData();
  }, [loadData, _paramsStr]);

  // ── 远程搜索 ──
  const handleSearch = useCallback(
    async (searchText: string) => {
      if (!searchText.trim()) {
        loadData();
        return;
      }
      const c = cfgRef.current;
      const request = getRequest();

      setFetching(true);
      try {
        const sp = { ...(c.params || {}), [c.searchKey]: searchText };
        if (c.searchUrl) {
          const raw = await defaultFetch(c.searchUrl, c.method, c.dataPath, sp);
          setTreeData(normalizeTreeData(raw, c));
        } else if (request) {
          const raw = await request(sp);
          const arr = Array.isArray(raw) ? raw : [];
          setTreeData(normalizeTreeData(arr, c));
        }
      } catch (err) {
        console.error('[treeSelect] search error:', err);
      } finally {
        setFetching(false);
      }
    },
    [getRequest, loadData],
  );

  // ── 异步加载子节点 ──
  const handleLoadData = useCallback(
    async (node: DefaultOptionType) => {
      if (node.children && node.children.length > 0) {
        return;
      }
      const c = cfgRef.current;
      const request = getRequest();
      if (!request) {
        return;
      }

      const raw = await request({
        ...(c.params || {}),
        [c.parentKey]: node.value,
      });
      const arr = Array.isArray(raw) ? raw : [];
      const children = normalizeTreeData(arr, c);
      setTreeData((prev) => updateTreeData(prev, node.key!, children));
    },
    [getRequest],
  );

  // ── 辅助：通过 searchUrl/request 获取完整子树（原始 + 归一化） ──
  const fetchSubtree = useCallback(
    async (
      val: unknown,
    ): Promise<{
      raw: Record<string, unknown>[];
      nodes: DefaultOptionType[];
    }> => {
      const c = cfgRef.current;
      const request = getRequest();
      const sp = { ...(c.params || {}), [c.searchKey]: String(val) };

      let raw: unknown[] = [];
      if (c.searchUrl) {
        raw = await defaultFetch(c.searchUrl, c.method, c.dataPath, sp).catch(
          () => [],
        );
      } else if (request) {
        const resp = await request(sp).catch(() => []);
        raw = Array.isArray(resp) ? resp : [];
      }

      const records = raw as Record<string, unknown>[];
      const nodes = normalizeTreeData(records, c);
      return { raw: records, nodes };
    },
    [getRequest],
  );

  // ── 编辑模式：确保 value 对应节点在 treeData 中 → 就绪后渲染 ──
  const hydratedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (readOnly) {
      return;
    }

    // 无 value → 直接就绪（新增模式）
    if (!value) {
      setReady(true);
      return;
    }

    const values = Array.isArray(value) ? value : [value];
    const c = cfgRef.current;

    // 检查所有 value 是否已在 treeData 中
    const allFound = values.every((v) => findNodeInTree(treeData, v));
    if (allFound) {
      setReady(true);
      return;
    }

    // 所有 value 均已尝试过 hydration（含被 React 重渲染中断 abort 的场景）→ 就绪，
    // 否则 setReady 永远不被调用，组件卡死在"加载中"状态
    if (values.every((v) => hydratedRef.current.has(String(v)))) {
      setReady(true);
      return;
    }

    // 还没加载完 → 等待 treeData 更新
    if (treeData.length === 0) {
      return;
    }

    // 有 value 不在 treeData 中 → 需要 hydration
    const pending = values.filter((v) => !hydratedRef.current.has(String(v)));
    if (pending.length === 0) {
      return;
    }

    let aborted = false;

    (async () => {
      try {
        for (const val of pending) {
          if (aborted) {
            return;
          }
          hydratedRef.current.add(String(val));
          if (findNodeInTree(treeData, val)) {
            continue;
          }

          // 自底向上获取所有层级原始数据（通过 pidKey 追溯祖先链）
          const allRecords: Record<string, unknown>[] = [];
          let cur: unknown = val;
          const visited = new Set<string>();

          while (
            cur !== undefined &&
            cur !== null &&
            !visited.has(String(cur))
          ) {
            visited.add(String(cur));
            const level = await fetchSubtree(cur);
            if (level.raw.length === 0) {
              break;
            }
            allRecords.push(...level.raw);

            // 从原始数据中找到当前节点，获取 pid → 向上追溯
            const foundRaw = level.raw.find((r) => r[c.valueKey] === cur);
            if (!foundRaw) {
              break;
            }
            const pid = foundRaw[c.pidKey];
            if (
              pid === undefined ||
              pid === null ||
              pid === 0 ||
              pid === '0' ||
              pid === ''
            ) {
              break;
            }
            cur = pid;
          }

          if (aborted || allRecords.length === 0) {
            continue;
          }

          // 从扁平记录构建嵌套树（使用 pidKey 关系）
          const builtTree = buildTreeFromFlatRecords(allRecords, {
            valueKey: c.valueKey,
            labelKey: c.labelKey,
            childrenKey: c.childrenKey,
            asyncLoad: c.asyncLoad,
            pidKey: c.pidKey,
            hasChildrenKey: c.hasChildrenKey,
            isLeafKey: c.isLeafKey,
          });

          if (builtTree.length === 0) {
            continue;
          }

          // 将构建好的根节点合并到 treeData
          for (const rootNode of builtTree) {
            setTreeData((prev) => mergeNodeList(prev, rootNode));
          }

          // 计算 expandedKeys：从根节点沿 children[0] 走到底
          if (!aborted) {
            const expandKeys: React.Key[] = [];
            let ptr: DefaultOptionType | null = builtTree[0];
            while (ptr) {
              expandKeys.push(ptr.key!);
              if (ptr.children && ptr.children.length > 0) {
                ptr = ptr.children[0];
              } else {
                break;
              }
            }
            if (expandKeys.length > 0) {
              setExpandedKeys((prev) => {
                const existing = new Set(prev);
                expandKeys.forEach((k) => {
                  existing.add(k);
                });
                return Array.from(existing);
              });
            }
          }
        }
      } finally {
        if (!aborted) {
          setReady(true);
        }
      }
    })();

    return () => {
      aborted = true;
    };
  }, [readOnly, treeData, fetchSubtree, value]);

  // ── 只读回显 ──
  useEffect(() => {
    if (!readOnly || !value) {
      setReadOnlyLabel('');
      return;
    }

    const values = Array.isArray(value) ? value : [value];
    const c = cfgRef.current;

    // 先从 treeData 查找
    const found = values.map((v) => {
      const node = findNodeInTree(treeData, v);
      return node ? String(node.title ?? '') : null;
    });
    if (found.every((f) => f !== null)) {
      setReadOnlyLabel(found.join('、'));
      return;
    }

    // 通过 readOnlyRequest 回显
    if (c.readOnlyRequest) {
      Promise.all(values.map((v) => c.readOnlyRequest?.(v).catch(() => null)))
        .then((results) => {
          const labels = results.map((r, i) =>
            r?.label ? String(r.label) : String(values[i]),
          );
          setReadOnlyLabel(labels.join('、'));
        })
        .catch(() => setReadOnlyLabel(values.map(String).join('、')));
      return;
    }

    // 通过 readOnlyUrl 回显
    if (c.readOnlyUrl) {
      Promise.all(
        values.map((v) =>
          defaultFetch(c.readOnlyUrl!, c.method, c.dataPath, {
            [c.valueKey]: v,
          }).catch(() => []),
        ),
      )
        .then((arrs) => {
          const labels = arrs.map((arr, i) => {
            if (arr.length > 0) {
              const item = arr[0] as Record<string, unknown>;
              return String(item[c.labelKey] ?? values[i]);
            }
            return String(values[i]);
          });
          setReadOnlyLabel(labels.join('、'));
        })
        .catch(() => setReadOnlyLabel(values.map(String).join('、')));
      return;
    }

    // 复用 searchUrl / request 回显
    const fetchFn = async (v: unknown) => {
      const c2 = cfgRef.current;
      const request = getRequest();
      const sp = { ...(c2.params || {}), [c2.searchKey]: String(v) };
      if (c2.searchUrl) {
        const arr = await defaultFetch(
          c2.searchUrl,
          c2.method,
          c2.dataPath,
          sp,
        ).catch(() => []);
        const matched = arr.find(
          (item) => (item as Record<string, unknown>)[c2.valueKey] === v,
        );
        if (matched) {
          const item = matched as Record<string, unknown>;
          return String(item[c2.labelKey] ?? v);
        }
        if (arr.length > 0) {
          const item = arr[0] as Record<string, unknown>;
          return String(item[c2.labelKey] ?? v);
        }
      } else if (request) {
        const raw = await request(sp).catch(() => []);
        const arr = Array.isArray(raw) ? raw : [];
        const matched = arr.find(
          (item) => (item as Record<string, unknown>)[c2.valueKey] === v,
        );
        if (matched) {
          const item = matched as Record<string, unknown>;
          return String(item[c2.labelKey] ?? v);
        }
        if (arr.length > 0) {
          const item = arr[0] as Record<string, unknown>;
          return String(item[c2.labelKey] ?? v);
        }
      }
      return String(v);
    };

    Promise.all(values.map((v) => fetchFn(v)))
      .then((labels) => setReadOnlyLabel(labels.join('、')))
      .catch(() => setReadOnlyLabel(values.map(String).join('、')));
  }, [readOnly, treeData, getRequest, value]);

  // ── 只读渲染 ──
  if (readOnly) {
    return wrap(
      <Typography.Text>
        {readOnlyLabel || String(value ?? '-')}
      </Typography.Text>,
    );
  }

  const remoteSearchable = !!(cfg.searchUrl || cfg.request || cfg.url);
  const localFilterable = !remoteSearchable;

  // 未就绪时显示 loading，避免 value 回显为原始值
  if (!ready && !readOnly) {
    return wrap(
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}
      >
        <Spin size='small' />
        <span style={{ color: '#999' }}>加载中...</span>
      </div>,
    );
  }

  // 从 rest 中剥离自定义配置键与引擎显式控制的键，其余 props
  // （size/status/variant/maxTagCount/treeDefaultExpandAll 等 antd 声明式属性）透传给 TreeSelect
  const {
    request: _req,
    url: _url,
    params: _paramsRest,
    treeData: _treeDataRest,
    searchUrl: _searchUrl,
    searchKey: _searchKey,
    parentKey: _parentKey,
    pidKey: _pidKey,
    dataPath: _dataPath,
    valueKey: _valueKey,
    labelKey: _labelKey,
    childrenKey: _childrenKey,
    hasChildrenKey: _hasChildrenKey,
    isLeafKey: _isLeafKey,
    multiple: _multiple,
    showSearch: _showSearch,
    autoExpand: _autoExpand,
    asyncLoad: _asyncLoad,
    readOnlyUrl: _readOnlyUrl,
    readOnlyRequest: _readOnlyRequest,
    method: _method,
    allowClear: _allowClear,
    treeCheckable: userTreeCheckable,
    showCheckedStrategy: userShowCheckedStrategy,
    ...treeRest
  } = rest as Record<string, unknown>;

  return wrap(
    <TreeSelect
      {...treeRest}
      value={value}
      onChange={onChange}
      treeData={treeData as unknown as TreeDataNode[]}
      placeholder={placeholder ?? '请选择...'}
      disabled={disabled || loading}
      allowClear={cfg.allowClear}
      showSearch={cfg.showSearch}
      onSearch={remoteSearchable ? handleSearch : undefined}
      filterTreeNode={
        localFilterable ? (localFilter as unknown as TreeFilterFn) : undefined
      }
      treeExpandedKeys={
        expandedKeys.length > 0
          ? (expandedKeys as unknown as TreeExpandedKeys)
          : undefined
      }
      onTreeExpand={setExpandedKeys}
      loadData={
        cfg.asyncLoad
          ? (handleLoadData as unknown as TreeLoadDataFn)
          : undefined
      }
      multiple={cfg.multiple}
      treeCheckable={(userTreeCheckable as boolean | undefined) ?? cfg.multiple}
      showCheckedStrategy={
        (userShowCheckedStrategy as
          | 'SHOW_ALL'
          | 'SHOW_PARENT'
          | 'SHOW_CHILD'
          | undefined) ?? (cfg.multiple ? TreeSelect.SHOW_CHILD : undefined)
      }
      notFoundContent={fetching ? <Spin size='small' /> : undefined}
      suffixIcon={fetching ? <Spin size='small' /> : undefined}
      style={{ width: '100%' }}
      treeNodeFilterProp='title'
    />,
  );
}

// 小写别名：兼容现有注册表（antdWidgets / engine.registerWidgets）
export { TreeSelectWidget as treeSelectWidget };
