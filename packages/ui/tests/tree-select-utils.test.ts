import { describe, expect, it } from 'vitest';
import {
  buildTreeFromFlatRecords,
  buildUrl,
  defaultFetch,
  findNodeInTree,
  getNestedValue,
  localFilter,
  mergeNodeList,
  normalizeTreeData,
  updateTreeData,
} from '../src/widgets/tree-select';

// ---------------------------------------------------------------------------
// 纯函数测试 — 无 React 依赖
// ---------------------------------------------------------------------------

describe('getNestedValue', () => {
  it('空路径返回原对象', () => {
    const obj = { a: 1 };
    expect(getNestedValue(obj, '')).toBe(obj);
  });

  it('单级路径取值', () => {
    expect(getNestedValue({ a: { b: 1 } }, 'a')).toEqual({ b: 1 });
  });

  it('多级路径取值', () => {
    expect(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('路径中断时返回 undefined', () => {
    expect(getNestedValue({ a: 1 }, 'a.b')).toBeUndefined();
  });

  it('obj 为 null 时返回 undefined', () => {
    expect(getNestedValue(null, 'a.b')).toBeUndefined();
  });
});

describe('buildUrl', () => {
  it('无 params 时返回原 URL', () => {
    expect(buildUrl('https://api.com/users')).toBe('https://api.com/users');
  });

  it('追加 params', () => {
    expect(buildUrl('https://api.com/users', { page: '1' })).toBe(
      'https://api.com/users?page=1',
    );
  });

  it('覆盖 URL 中已有的同名参数', () => {
    expect(buildUrl('https://api.com/users?page=0', { page: '2' })).toBe(
      'https://api.com/users?page=2',
    );
  });

  it('null/undefined 值删除参数', () => {
    expect(
      buildUrl('https://api.com/users?exclude=true', { exclude: null }),
    ).toBe('https://api.com/users');
  });

  it('URL 有 query string 时合并', () => {
    expect(buildUrl('https://api.com/users?format=json', { page: '1' })).toBe(
      'https://api.com/users?format=json&page=1',
    );
  });
});

describe('defaultFetch', () => {
  it('dataPath 为空时取根数组', async () => {
    const mockJson = [{ id: 1 }, { id: 2 }];
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockJson),
    });
    const result = await defaultFetch('/api', 'GET', '', undefined);
    expect(result).toEqual(mockJson);
  });

  it('dataPath 不为空时取嵌套字段', async () => {
    const mockJson = { data: { list: [{ id: 1 }] } };
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockJson),
    });
    const result = await defaultFetch('/api', 'GET', 'data.list', undefined);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('非数组时回退 []', async () => {
    const mockJson = { data: { list: { not: 'array' } } };
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockJson),
    });
    const result = await defaultFetch('/api', 'GET', 'data.list', undefined);
    expect(result).toEqual([]);
  });

  it('POST 请求发送 body', async () => {
    const mockJson = [{ id: 1 }];
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockJson),
    });
    await defaultFetch('/api', 'POST', '', { keyword: 'test' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ keyword: 'test' }),
      }),
    );
  });
});

describe('normalizeTreeData', () => {
  it('基础转换', () => {
    const raw = [
      { value: '1', label: 'Node 1' },
      { value: '2', label: 'Node 2' },
    ];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: false,
    };
    const result = normalizeTreeData(raw, cfg);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ value: '1', title: 'Node 1', key: '1' });
  });

  it('递归转换 children', () => {
    const raw = [
      {
        value: '1',
        label: 'Parent',
        children: [{ value: '1-1', label: 'Child' }],
      },
    ];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: false,
    };
    const result = normalizeTreeData(raw, cfg);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].title).toBe('Child');
  });

  it('asyncLoad 下无 children 时 isLeaf=false', () => {
    const raw = [{ value: '1', label: 'Node' }];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: true,
    };
    const result = normalizeTreeData(raw, cfg);
    expect(result[0].isLeaf).toBe(false);
  });

  it('asyncLoad 下 isLeafKey 标记', () => {
    const raw = [{ value: '1', label: 'Leaf', isLeaf: true }];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: true,
      isLeafKey: 'isLeaf',
    };
    const result = normalizeTreeData(raw, cfg);
    expect(result[0].isLeaf).toBe(true);
  });

  it('asyncLoad 下 hasChildrenKey 标记', () => {
    const raw = [{ value: '1', label: 'Node', hasChildren: false }];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: true,
      hasChildrenKey: 'hasChildren',
    };
    const result = normalizeTreeData(raw, cfg);
    expect(result[0].isLeaf).toBe(true);
  });
});

describe('updateTreeData', () => {
  it('key 匹配时替换节点并添加 children', () => {
    const list = [
      {
        key: '1',
        title: 'A',
        children: [] as DefaultOptionType[],
      },
    ];
    const children: DefaultOptionType[] = [
      { key: '1-1', title: 'B', value: '1-1' },
    ];
    const result = updateTreeData(list, '1', children);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].isLeaf).toBe(false);
  });

  it('key 不匹配时递归查找', () => {
    const list = [
      {
        key: '1',
        title: 'A',
        children: [
          {
            key: '1-1',
            title: 'B',
            children: [] as DefaultOptionType[],
          },
        ],
      },
    ];
    const children: DefaultOptionType[] = [
      { key: '1-1-1', title: 'C', value: '1-1-1' },
    ];
    const result = updateTreeData(list, '1-1', children);
    expect(result[0].children![0].children).toHaveLength(1);
  });

  it('key 不存在时返回原列表', () => {
    const list = [{ key: '1', title: 'A' }];
    const result = updateTreeData(list, '999', []);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('1');
  });
});

describe('findNodeInTree', () => {
  it('在顶层找到节点', () => {
    const tree = [{ key: '1', value: '1', title: 'A' }];
    const result = findNodeInTree(tree, '1');
    expect(result).not.toBeNull();
    expect(result?.title).toBe('A');
  });

  it('在子节点中找到', () => {
    const tree = [
      {
        key: '1',
        value: '1',
        title: 'Parent',
        children: [{ key: '1-1', value: '1-1', title: 'Child' }],
      },
    ];
    const result = findNodeInTree(tree, '1-1');
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Child');
  });

  it('未找到返回 null', () => {
    const tree = [{ key: '1', value: '1', title: 'A' }];
    const result = findNodeInTree(tree, '999');
    expect(result).toBeNull();
  });
});

describe('mergeNodeList', () => {
  it('key 不存在时追加', () => {
    const list = [{ key: '1', title: 'A' }];
    const result = mergeNodeList(list, { key: '2', title: 'B' });
    expect(result).toHaveLength(2);
  });

  it('key 存在时合并 children', () => {
    const list = [
      {
        key: '1',
        title: 'A',
        children: [] as DefaultOptionType[],
      },
    ];
    const result = mergeNodeList(list, {
      key: '1',
      title: 'Updated',
      children: [{ key: '1-1', title: 'Child', value: '1-1' }],
    });
    expect(result[0].title).toBe('A'); // 保留已有 title
    expect(result[0].children).toHaveLength(1);
  });
});

describe('localFilter', () => {
  it('匹配时返回 true', () => {
    expect(localFilter('abc', { title: 'ABC' })).toBe(true);
  });

  it('不匹配时返回 false', () => {
    expect(localFilter('xyz', { title: 'ABC' })).toBe(false);
  });

  it('title 为 null/undefined 时返回 false', () => {
    expect(localFilter('abc', { title: null } as never)).toBe(false);
    expect(localFilter('abc', {} as never)).toBe(false);
  });
});

describe('buildTreeFromFlatRecords', () => {
  it('构建父子关系树', () => {
    const records = [
      { value: '1', label: 'Parent', pid: '0' },
      { value: '1-1', label: 'Child', pid: '1' },
    ];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: false,
      pidKey: 'pid',
    };
    const result = buildTreeFromFlatRecords(records, cfg);
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].title).toBe('Child');
  });

  it('去重：相同 valueKey 只保留一条', () => {
    const records = [
      { value: '1', label: 'A', pid: '0' },
      { value: '1', label: 'B', pid: '0' },
    ];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: false,
      pidKey: 'pid',
    };
    const result = buildTreeFromFlatRecords(records, cfg);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A'); // 保留第一条
  });

  it('pid 为空视为根节点', () => {
    const records = [
      { value: '1', label: 'Root', pid: null },
      { value: '2', label: 'Child', pid: '1' },
    ];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: false,
      pidKey: 'pid',
    };
    const result = buildTreeFromFlatRecords(records, cfg);
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
  });

  it('pid 不在所有 value 中视为根节点', () => {
    const records = [{ value: '1', label: 'Node', pid: 'missing' }];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: false,
      pidKey: 'pid',
    };
    const result = buildTreeFromFlatRecords(records, cfg);
    expect(result).toHaveLength(1);
  });

  it('asyncLoad 下叶子节点标记 isLeaf=false', () => {
    const records = [{ value: '1', label: 'Leaf', pid: '0' }];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: true,
      pidKey: 'pid',
    };
    const result = buildTreeFromFlatRecords(records, cfg);
    expect(result[0].isLeaf).toBe(false);
  });

  it('多级嵌套', () => {
    const records = [
      { value: '1', label: 'L1', pid: '0' },
      { value: '1-1', label: 'L2', pid: '1' },
      { value: '1-1-1', label: 'L3', pid: '1-1' },
    ];
    const cfg = {
      valueKey: 'value',
      labelKey: 'label',
      childrenKey: 'children',
      asyncLoad: false,
      pidKey: 'pid',
    };
    const result = buildTreeFromFlatRecords(records, cfg);
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].children).toHaveLength(1);
  });
});
