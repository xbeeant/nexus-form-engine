/**
 * 依赖图测试
 * 验证 SchemaParser 和 Engine 的依赖图功能
 */

import { describe, expect, it } from 'vitest';
import { DependencyGraph } from '../src/DependencyGraph';
import { NexusEngine } from '../src/Engine';
import { SchemaParser } from '../src/SchemaParser';
import type { NexusSchema, Reaction } from '../src/types/schema';

describe('DependencyGraph', () => {
  describe('DependencyGraph class', () => {
    it('应该支持添加/查询依赖边', () => {
      const graph = new DependencyGraph();
      graph.addDependency('age', 'username');

      expect(graph.getDependencies('age').has('username')).toBe(true);
      expect(graph.getDependents('username').has('age')).toBe(true);
      expect(graph.getDependents('age').size).toBe(0);
    });

    it('getDependents 应返回防御性拷贝', () => {
      const graph = new DependencyGraph();
      graph.addDependency('age', 'username');

      const dependents = graph.getDependents('username');
      dependents.add('hacked');

      expect(graph.getDependents('username').has('hacked')).toBe(false);
    });

    it('getNodes 应返回所有参与节点', () => {
      const graph = new DependencyGraph();
      graph.addDependency('age', 'username');
      graph.addDependency('city', 'province');

      const nodes = graph.getNodes();
      expect(nodes).toContain('age');
      expect(nodes).toContain('username');
      expect(nodes).toContain('city');
      expect(nodes).toContain('province');
    });
  });

  describe('SchemaParser.buildDependencyGraph', () => {
    it('应该正确构建空依赖图', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', widget: 'input' },
          email: { type: 'string', widget: 'input' },
        },
      };

      const { dependencyGraph } = SchemaParser.parse(schema);

      expect(dependencyGraph.getNodes().length).toBe(0);
      expect(dependencyGraph.hasNode('name')).toBe(false);
      expect(dependencyGraph.hasNode('email')).toBe(false);
    });

    it('应该正确构建反应依赖图', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          age: {
            type: 'number',
            widget: 'number',
            reactions: [
              {
                dependencies: ['username'],
                fulfill: {
                  state: { visible: true },
                },
              } as Reaction,
            ],
          },
          username: {
            type: 'string',
            widget: 'input',
          },
        },
      };

      const { dependencyGraph } = SchemaParser.parse(schema);

      // age 依赖 username（age 是 target，username 是 source）
      expect(dependencyGraph.getDependencies('age').has('username')).toBe(true);

      // username 的 dependents 是 [age]
      expect(dependencyGraph.getDependents('username').has('age')).toBe(true);
      expect(dependencyGraph.getDependents('age').size).toBe(0);
    });

    it('应该从 reactions 中提取多条依赖关系', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          fieldA: {
            type: 'string',
            widget: 'input',
            reactions: [
              {
                dependencies: ['fieldB', 'fieldC'],
                fulfill: { state: { visible: true } },
              } as Reaction,
            ],
          },
          fieldB: {
            type: 'string',
            widget: 'input',
          },
          fieldC: {
            type: 'string',
            widget: 'input',
          },
        },
      };

      const { dependencyGraph } = SchemaParser.parse(schema);

      // fieldA 依赖 fieldB 和 fieldC
      const deps = dependencyGraph.getDependencies('fieldA');
      expect(deps.size).toBe(2);
      expect(deps.has('fieldB')).toBe(true);
      expect(deps.has('fieldC')).toBe(true);

      // fieldB / fieldC 的 dependents 均包含 fieldA
      expect(dependencyGraph.getDependents('fieldB').has('fieldA')).toBe(true);
      expect(dependencyGraph.getDependents('fieldC').has('fieldA')).toBe(true);
    });

    it('应该正确处理嵌套对象和数组', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          profile: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                widget: 'input',
                reactions: [
                  {
                    dependencies: ['profile.phone'],
                    fulfill: { state: { disabled: true } },
                  } as Reaction,
                ],
              },
              phone: {
                type: 'string',
                widget: 'input',
              },
            },
          },
        },
      };

      const { dependencyGraph } = SchemaParser.parse(schema);

      expect(
        dependencyGraph.getDependencies('profile.address').has('profile.phone'),
      ).toBe(true);
      expect(
        dependencyGraph.getDependents('profile.phone').has('profile.address'),
      ).toBe(true);
    });
  });

  describe('Engine.getDependents', () => {
    it('应该返回依赖指定字段的所有字段', () => {
      const engine = new NexusEngine();

      const schema: NexusSchema = {
        type: 'object',
        properties: {
          fieldA: {
            type: 'string',
            widget: 'input',
          },
          fieldB: {
            type: 'string',
            widget: 'input',
            reactions: [
              {
                dependencies: ['fieldA'],
                fulfill: { state: { visible: true } },
              } as Reaction,
            ],
          },
          fieldC: {
            type: 'string',
            widget: 'input',
          },
        },
      };

      engine.init(schema);
      const dependents = engine.getDependents('fieldA');

      expect(dependents.size).toBe(1);
      expect(dependents.has('fieldB')).toBe(true);
    });

    it('当字段无依赖时返回空 Set', () => {
      const engine = new NexusEngine();

      const schema: NexusSchema = {
        type: 'object',
        properties: {
          fieldA: {
            type: 'string',
            widget: 'input',
          },
        },
      };

      engine.init(schema);
      const dependents = engine.getDependents('fieldA');

      expect(dependents.size).toBe(0);
    });

    it('应该正确处理嵌套路径的依赖关系', () => {
      const engine = new NexusEngine();

      const schema: NexusSchema = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              province: {
                type: 'string',
                widget: 'input',
              },
              city: {
                type: 'string',
                widget: 'input',
                reactions: [
                  {
                    dependencies: ['province'],
                    fulfill: { state: { disabled: true } },
                  } as Reaction,
                ],
              },
            },
          },
        },
      };

      engine.init(schema);
      const dependents = engine.getDependents('address.province');

      expect(dependents.size).toBe(1);
      expect(dependents.has('address.city')).toBe(true);
    });
  });
});
