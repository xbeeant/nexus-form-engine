import type { NexusSchema, SchemaNode } from '@nexus/form-engine';
import { NexusEngine } from '@nexus/form-engine';
import { describe, expect, it } from 'vitest';
import {
  addChildToSchema,
  diffPropertyPatch,
  extractFormLevelConfig,
  flattenNodeForPropertyEditor,
  updateNodeWithNesting,
} from './schemaUtils';

const radioNode: SchemaNode = {
  type: 'string',
  widget: 'radio',
  title: '单选',
  enum: ['a', 'b'],
  enumNames: ['选项A', '选项B'],
};

describe('diffPropertyPatch', () => {
  it('filters out empty-string defaults for untouched fields', () => {
    const initial = {
      title: '单选',
      options: [
        { value: 'a', label: '选项A' },
        { value: 'b', label: '选项B' },
      ],
    };
    const allValues = {
      title: '单选',
      description: '',
      placeholder: '',
      default: '',
      disabled: '',
      readOnly: '',
      hidden: '',
      required: '',
      pattern: '',
      bind: '',
      dependencies: '',
      options: [
        { value: 'a', label: '选项A' },
        { value: 'b', label: '选项B' },
      ],
    };
    const patch = diffPropertyPatch(initial, allValues);
    expect(patch).toEqual({});
  });

  it('keeps genuinely changed values', () => {
    const initial = { title: '单选', options: [{ value: 'a', label: 'A' }] };
    const allValues = {
      title: '新标题',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    };
    const patch = diffPropertyPatch(initial, allValues);
    expect(patch).toEqual(allValues);
  });

  it('empty string is treated as unassigned and never written to schema', () => {
    const initial = { title: '单选', description: '说明', bind: 'user.name' };
    const allValues = { title: '单选', description: '', bind: '' };
    const patch = diffPropertyPatch(initial, allValues);
    expect(patch).toEqual({});
  });

  it('user-cleared field is written back as undefined for deletion', () => {
    const initial = { title: '单选', variant: 'outlined', description: '说明' };
    const allValues = { title: '单选', variant: '', description: '' };
    const changed = new Set(['variant']);
    const patch = diffPropertyPatch(initial, allValues, changed);
    expect(patch).toEqual({ variant: undefined });
  });

  it('untouched empty fields stay skipped even with changedFields set', () => {
    const initial = { title: '单选' };
    const allValues = { title: '单选', description: '', placeholder: '' };
    const changed = new Set(['title']);
    const patch = diffPropertyPatch(initial, allValues, changed);
    expect(patch).toEqual({});
  });
});

describe('updateNodeWithNesting deletion semantics', () => {
  it('cleared UI prop is removed from node.props instead of written as undefined', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        card: {
          type: 'card',
          title: '卡片',
          props: { variant: 'outlined', hoverable: true },
          properties: {},
        },
      },
    };
    const next = updateNodeWithNesting(schema, ['card'], {
      variant: undefined,
    });
    const node = next.properties.card as Record<string, unknown>;
    expect((node.props as Record<string, unknown>).variant).toBeUndefined();
    expect('variant' in (node.props as Record<string, unknown>)).toBe(false);
    expect((node.props as Record<string, unknown>).hoverable).toBe(true);
  });

  it('cleared schema-level key is removed from the node', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        gender: { ...radioNode, bind: 'user.gender' },
      },
    };
    const next = updateNodeWithNesting(schema, ['gender'], { bind: undefined });
    const node = next.properties.gender as Record<string, unknown>;
    expect(node.bind).toBeUndefined();
    expect('bind' in node).toBe(false);
    expect(node.title).toBe('单选');
  });
});

describe('designer full property-panel patch', () => {
  it('empty defaults are not written, radio key preserved in formData', () => {
    let schema: NexusSchema = { type: 'object', properties: {} };
    schema = addChildToSchema(schema, [], 'gender', radioNode);

    // simulate property form allValues (includes empty-string defaults) + diff filter
    const initial = flattenNodeForPropertyEditor(
      schema.properties.gender as never,
    );
    const allValues = {
      title: '单选',
      description: '',
      placeholder: '',
      default: '',
      extra: '',
      disabled: '',
      readOnly: '',
      readOnlyWidget: '',
      hidden: '',
      width: '',
      options: [
        { value: 'a', label: '选项A' },
        { value: 'b', label: '选项B' },
      ],
      optionType: '',
      buttonStyle: '',
      required: '',
      pattern: '',
      validate: '',
      bind: '',
      dependencies: '',
    };
    const patch = diffPropertyPatch(initial, allValues);
    expect(patch.bind).toBeUndefined();

    schema = updateNodeWithNesting(schema, ['gender'], patch);

    const engine = new NexusEngine();
    engine.init(schema);
    engine.setFieldValue('gender', 'a');
    expect(engine.getFormData()).toEqual({ gender: 'a' });
  });
});

describe('extractFormLevelConfig', () => {
  it('only extracts top-level form config keys, not the whole schema', () => {
    const schema: NexusSchema = {
      type: 'object',
      displayType: 'row',
      colon: true,
      properties: { gender: radioNode },
    };
    const keys = [
      'displayType',
      'labelWidth',
      'colon',
      'label',
      'readOnly',
      'column',
    ];
    const config = extractFormLevelConfig(
      schema as unknown as Record<string, unknown>,
      keys,
    );
    expect(config).toEqual({ displayType: 'row', colon: true });
    expect('properties' in config).toBe(false);
    expect('type' in config).toBe(false);
  });

  it('omits form-level keys that are not set on the schema', () => {
    const schema: NexusSchema = { type: 'object', properties: {} };
    const config = extractFormLevelConfig(
      schema as unknown as Record<string, unknown>,
      ['labelWidth', 'column'],
    );
    expect(config).toEqual({});
  });
});
