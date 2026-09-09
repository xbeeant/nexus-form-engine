import { describe, expect, it } from 'vitest';

import {
  diffSchemas,
  getInitialValues,
  getSchemaFieldPaths,
  isBranchNode,
  isDataArray,
  isDataField,
  isDataObject,
  isLayoutNode,
  LAYOUT_CONTAINER_TYPES,
  LAYOUT_TYPES,
  migrateValues,
  resolveNodePath,
  walkSchemaTree,
} from '../src/utils/schema-lifecycle';
import { getPathValue, setPathValue } from '../src/utils/value-utils';

// ── 夹具：含布局节点 / 对象 / 数组的 Schema ──────────────────────────────
const baseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', widget: 'input', title: '姓名' },
    profile: {
      type: 'object',
      properties: {
        age: { type: 'number', widget: 'number' },
        website: { type: 'string', widget: 'input' },
      },
    },
    tags: {
      type: 'array',
      widget: 'list',
      items: { type: 'string' },
    },
    contact: {
      type: 'card',
      properties: {
        phone: { type: 'string', widget: 'input' },
      },
    },
  },
};

describe('getSchemaFieldPaths（数据字段收集）', () => {
  it('收集叶子字段/嵌套对象/数组，布局节点 Key 不进路径', () => {
    const paths = getSchemaFieldPaths(baseSchema as never);
    expect(paths.sort()).toEqual(
      [
        'name',
        'profile',
        'profile.age',
        'profile.website',
        'tags',
        'phone',
      ].sort(),
    );
  });

  it('分支容器内嵌套布局节点：布局 Key 与分支 Key 均不进路径', () => {
    const branchSchema = {
      type: 'object',
      properties: {
        payment: {
          type: 'object',
          oneOf: [
            {
              properties: {
                card: {
                  type: 'card', // 布局节点
                  properties: {
                    cardNo: { type: 'string', widget: 'input' },
                  },
                },
              },
            },
            {
              properties: {
                cashAmount: { type: 'number', widget: 'number' },
              },
            },
          ],
        },
      },
    };
    const paths = getSchemaFieldPaths(branchSchema as never);
    expect(paths.sort()).toEqual(['cardNo', 'cashAmount'].sort());
  });
});

describe('getPathValue / setPathValue（深路径读写）', () => {
  it('读写嵌套路径', () => {
    const target: Record<string, unknown> = {};
    setPathValue(target, 'profile.age', 30);
    setPathValue(target, 'name', '张三');
    expect(getPathValue(target, 'profile.age')).toBe(30);
    expect(getPathValue(target, 'name')).toBe('张三');
    expect(getPathValue(target, 'profile.missing')).toBeUndefined();
    expect(getPathValue(target, 'not.exist.path')).toBeUndefined();
  });
});

describe('getInitialValues（Schema 白名单过滤）', () => {
  it('仅保留 Schema 声明的字段，丢弃多余键', () => {
    const raw = {
      name: '张三',
      profile: { age: 30, website: 'https://z.example' },
      tags: ['a', 'b'],
      phone: '13800000000', // 布局节点内字段正常收集
      extraField: '应被丢弃',
      junk: { deep: true },
    };
    const result = getInitialValues(baseSchema as never, raw);
    expect(result).toEqual({
      name: '张三',
      profile: { age: 30, website: 'https://z.example' },
      tags: ['a', 'b'],
      phone: '13800000000',
    });
  });

  it('缺省值场景：部分字段无值时不写入', () => {
    const result = getInitialValues(baseSchema as never, { name: 'x' });
    expect(result).toEqual({ name: 'x' });
  });

  it('空数据返回空对象', () => {
    expect(getInitialValues(baseSchema as never, {})).toEqual({});
  });
});

describe('diffSchemas（Schema 变更对比）', () => {
  const changedSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        widget: 'input',
        title: '姓名（改）',
        maxLength: 20,
      },
      profile: {
        type: 'object',
        properties: {
          age: { type: 'number', widget: 'number' },
        },
      },
      tags: {
        type: 'array',
        widget: 'list',
        items: { type: 'string' },
      },
      company: { type: 'string', widget: 'input' }, // 新增
    },
  };

  it('识别 removed / modified / added', () => {
    const diffs = diffSchemas(baseSchema as never, changedSchema as never);
    const byKind = (kind: string) =>
      diffs
        .filter((d) => d.kind === kind)
        .map((d) => d.path)
        .sort();

    expect(byKind('removed')).toEqual(['phone', 'profile.website']);
    expect(byKind('added')).toEqual(['company']);
    expect(byKind('modified')).toEqual(['name', 'profile']);
  });

  it('modified 附带变化的属性名', () => {
    const diffs = diffSchemas(baseSchema as never, changedSchema as never);
    const nameDiff = diffs.find((d) => d.path === 'name')!;
    expect(nameDiff.changedProps?.sort()).toEqual(['maxLength', 'title']);
  });

  it('布局结构调整不产生数据路径变更', () => {
    const layoutChanged = {
      type: 'object',
      properties: {
        ...baseSchema.properties,
        contact: {
          type: 'tabs', // card → tabs
          properties: { phone: { type: 'string', widget: 'input' } },
        },
      },
    };
    const diffs = diffSchemas(baseSchema as never, layoutChanged as never);
    expect(diffs).toEqual([]);
  });

  it('完全相同 Schema 无变更', () => {
    expect(
      diffSchemas(baseSchema as never, structuredClone(baseSchema) as never),
    ).toEqual([]);
  });
});

describe('migrateValues（Schema 变更后迁移值）', () => {
  const oldValues = {
    name: '张三',
    profile: { age: 30, website: 'https://z.example' },
    tags: ['a'],
    phone: '13800000000',
  };
  const newSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', widget: 'input' },
      profile: {
        type: 'object',
        properties: { age: { type: 'number', widget: 'number' } },
      },
      tags: { type: 'array', widget: 'list', items: { type: 'string' } },
      company: { type: 'string', widget: 'input' },
    },
  };

  it('丢弃已删除字段的值，保留仍存在字段的值', () => {
    const migrated = migrateValues(
      baseSchema as never,
      newSchema as never,
      oldValues,
    );
    expect(migrated).toEqual({
      name: '张三',
      profile: { age: 30 },
      tags: ['a'],
    });
    expect('phone' in migrated).toBe(false);
    expect('website' in (migrated.profile as Record<string, unknown>)).toBe(
      false,
    );
  });
});

// ── 节点类型守卫 & 路径解析 ───────────────────────────────────────────────

describe('布局类型常量', () => {
  it('包含所有布局容器/面板类型', () => {
    expect(LAYOUT_CONTAINER_TYPES.has('card')).toBe(true);
    expect(LAYOUT_CONTAINER_TYPES.has('tabs')).toBe(true);
    expect(LAYOUT_TYPES.has('tabPane')).toBe(true);
  });
});

describe('节点类型守卫', () => {
  it('isBranchNode 判定条件分支容器', () => {
    expect(
      isBranchNode({
        type: 'object',
        oneOf: [
          {
            properties: {
              a: { type: 'string', widget: 'input' },
            },
          },
        ],
      } as never),
    ).toBe(true);
    expect(isBranchNode({ type: 'string', widget: 'input' } as never)).toBe(
      false,
    );
  });

  it('isLayoutNode / isDataField / isDataObject / isDataArray', () => {
    const layout = { type: 'card', properties: {} };
    const field = { type: 'string', widget: 'input' };
    const obj = { type: 'object', properties: { a: field } };
    const arr = { type: 'array', items: { type: 'string' } };

    expect(isLayoutNode(layout as never)).toBe(true);
    expect(isDataField(field as never)).toBe(true);
    expect(isDataObject(obj as never)).toBe(true);
    expect(isDataArray(arr as never)).toBe(true);
  });
});

describe('resolveNodePath', () => {
  it('布局节点透传父路径', () => {
    const layout = { type: 'card', properties: {} };
    expect(resolveNodePath('root', 'x', layout as never)).toBe('root');
  });

  it('数据节点拼接路径', () => {
    const field = { type: 'string', widget: 'input' };
    expect(resolveNodePath('root', 'x', field as never)).toBe('root.x');
    expect(resolveNodePath('', 'x', field as never)).toBe('x');
  });
});

describe('walkSchemaTree（通用遍历器）', () => {
  it('收集数据节点路径（布局 Key 不进路径）', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input' },
        extra: {
          type: 'card',
          properties: {
            cardNo: { type: 'string', widget: 'input' },
          },
        },
      },
    };
    const paths: string[] = [];
    walkSchemaTree(schema as never, '', {
      onDataField(_node, path) {
        paths.push(path);
      },
    });
    expect(paths.sort()).toEqual(['cardNo', 'name'].sort());
  });

  it('分支容器 Key 不进路径', () => {
    const schema = {
      type: 'object',
      properties: {
        select: {
          type: 'object',
          oneOf: [
            {
              properties: {
                modeA: { type: 'string', widget: 'input' },
              },
            },
            {
              properties: {
                modeB: { type: 'number', widget: 'number' },
              },
            },
          ],
        },
      },
    };
    const paths: string[] = [];
    walkSchemaTree(schema as never, '', {
      onDataField(_node, path) {
        paths.push(path);
      },
    });
    expect(paths.sort()).toEqual(['modeA', 'modeB'].sort());
  });
});
