// ============================================================================
// @xbeeant/form-engine-designer — 组件目录
// ============================================================================

import type { CatalogItem } from './types';

/**
 * 表单组件目录
 * 每个项创建一个 DataFieldSchema 节点
 * widget 名对齐 @xbeeant/form-engine-ui 中 antdWidgets 实际注册的 key
 */
export const widgetCatalog: CatalogItem[] = [
  {
    label: '输入框',
    icon: '📝',
    category: 'widget',
    widget: 'input',
    createNode: () => ({ type: 'string', widget: 'input', title: '输入框' }),
  },
  {
    label: '密码框',
    icon: '🔑',
    category: 'widget',
    widget: 'password',
    createNode: () => ({ type: 'string', widget: 'password', title: '密码框' }),
  },
  {
    label: '数字输入',
    icon: '🔢',
    category: 'widget',
    widget: 'number',
    createNode: () => ({ type: 'number', widget: 'number', title: '数字输入' }),
  },
  {
    label: '文本域',
    icon: '📄',
    category: 'widget',
    widget: 'textarea',
    createNode: () => ({ type: 'string', widget: 'textarea', title: '文本域' }),
  },
  {
    label: '下拉选择',
    icon: '📋',
    category: 'widget',
    widget: 'select',
    createNode: () => ({
      type: 'string',
      widget: 'select',
      title: '下拉选择',
      enum: ['option1', 'option2'],
      enumNames: ['选项1', '选项2'],
    }),
  },
  {
    label: '下拉选择（远程）',
    icon: '📡',
    category: 'widget',
    widget: 'selectWithRemote',
    createNode: () => ({
      type: 'string',
      widget: 'selectWithRemote',
      title: '下拉选择（远程）',
      remoteData: {
        url: '/api/options',
        method: 'GET',
        responseField: { data: 'data.list', value: 'id', label: 'name' },
        params: { page: 1, pageSize: 50 },
      },
    }),
  },
  {
    label: '单选',
    icon: '🔘',
    category: 'widget',
    widget: 'radio',
    createNode: () => ({
      type: 'string',
      widget: 'radio',
      title: '单选',
      enum: ['a', 'b'],
      enumNames: ['选项A', '选项B'],
    }),
  },
  {
    label: '复选框',
    icon: '☑️',
    category: 'widget',
    widget: 'checkbox',
    createNode: () => ({
      type: 'boolean',
      widget: 'checkbox',
      title: '复选框',
    }),
  },
  {
    label: '多选',
    icon: '☒',
    category: 'widget',
    widget: 'checkboxes',
    createNode: () => ({
      type: 'array',
      widget: 'checkboxes',
      title: '多选',
      enum: ['a', 'b'],
      enumNames: ['选项A', '选项B'],
    }),
  },
  {
    label: '多选下拉',
    icon: '📊',
    category: 'widget',
    widget: 'multiSelect',
    createNode: () => ({
      type: 'array',
      widget: 'multiSelect',
      title: '多选下拉',
      enum: ['a', 'b'],
      enumNames: ['选项A', '选项B'],
    }),
  },
  {
    label: '多选下拉（远程）',
    icon: '📡',
    category: 'widget',
    widget: 'multiSelectWithRemote',
    createNode: () => ({
      type: 'array',
      widget: 'multiSelectWithRemote',
      title: '多选下拉（远程）',
      remoteData: {
        url: '/api/multi-options',
        method: 'GET',
        responseField: { data: 'data.list', value: 'id', label: 'name' },
        params: { page: 1, pageSize: 50 },
      },
    }),
  },
  {
    label: '开关',
    icon: '🔀',
    category: 'widget',
    widget: 'switch',
    createNode: () => ({ type: 'boolean', widget: 'switch', title: '开关' }),
  },
  {
    label: '日期选择',
    icon: '📅',
    category: 'widget',
    widget: 'date',
    createNode: () => ({ type: 'string', widget: 'date', title: '日期选择' }),
  },
  {
    label: '日期范围',
    icon: '📅',
    category: 'widget',
    widget: 'dateRange',
    createNode: () => ({
      type: 'string',
      widget: 'dateRange',
      title: '日期范围',
    }),
  },
  {
    label: '时间选择',
    icon: '⏰',
    category: 'widget',
    widget: 'time',
    createNode: () => ({ type: 'string', widget: 'time', title: '时间选择' }),
  },
  {
    label: '时间范围',
    icon: '⏰',
    category: 'widget',
    widget: 'timeRange',
    createNode: () => ({
      type: 'string',
      widget: 'timeRange',
      title: '时间范围',
    }),
  },
  {
    label: '滑块',
    icon: '🎚️',
    category: 'widget',
    widget: 'slider',
    createNode: () => ({ type: 'number', widget: 'slider', title: '滑块' }),
  },
  {
    label: '颜色选择',
    icon: '🎨',
    category: 'widget',
    widget: 'color',
    createNode: () => ({ type: 'string', widget: 'color', title: '颜色选择' }),
  },
  {
    label: 'URL输入',
    icon: '🔗',
    category: 'widget',
    widget: 'urlInput',
    createNode: () => ({
      type: 'string',
      widget: 'urlInput',
      title: 'URL输入',
    }),
  },
  {
    label: '图片上传',
    icon: '🖼️',
    category: 'widget',
    widget: 'image',
    createNode: () => ({ type: 'string', widget: 'image', title: '图片上传' }),
  },
  {
    label: 'HTML展示',
    icon: '📄',
    category: 'widget',
    widget: 'html',
    createNode: () => ({ type: 'string', widget: 'html', title: 'HTML展示' }),
  },
  {
    label: '标题文字',
    icon: '🏷️',
    category: 'widget',
    widget: 'voidTitle',
    createNode: () => ({
      type: 'string',
      widget: 'voidTitle',
      title: '标题文字',
      label: false,
    }),
  },
  {
    label: '树选择',
    icon: '🌲',
    category: 'widget',
    widget: 'treeSelect',
    createNode: () => ({
      type: 'string',
      widget: 'treeSelect',
      title: '树选择',
    }),
  },
  {
    label: '自动完成',
    icon: '🔎',
    category: 'widget',
    widget: 'autoComplete',
    createNode: () => ({
      type: 'string',
      widget: 'autoComplete',
      title: '自动完成',
      enum: ['option1', 'option2'],
      enumNames: ['选项1', '选项2'],
    }),
  },
  {
    label: '自动完成（远程）',
    icon: '📡',
    category: 'widget',
    widget: 'autoCompleteWithRemote',
    createNode: () => ({
      type: 'string',
      widget: 'autoCompleteWithRemote',
      title: '自动完成（远程）',
      remoteData: {
        url: '/api/suggestions',
        method: 'GET',
        responseField: { data: 'data.suggestions', value: 'id', label: 'name' },
        params: { keyword: '' },
      },
    }),
  },
  {
    label: '级联选择',
    icon: '🌳',
    category: 'widget',
    widget: 'cascader',
    createNode: () => ({
      type: 'array',
      widget: 'cascader',
      title: '级联选择',
      enum: ['a', 'b'],
      enumNames: ['选项A', '选项B'],
    }),
  },
  {
    label: '级联选择（远程）',
    icon: '📡',
    category: 'widget',
    widget: 'cascaderWithRemote',
    createNode: () => ({
      type: 'array',
      widget: 'cascaderWithRemote',
      title: '级联选择（远程）',
      remoteData: {
        url: '/api/cascader/nodes',
        method: 'GET',
        responseField: {
          data: 'data.children',
          value: 'id',
          label: 'name',
          parentIdKey: 'parentId',
        },
        params: { parentId: null },
      },
    }),
  },
  {
    label: '提及',
    icon: '💬',
    category: 'widget',
    widget: 'mentions',
    createNode: () => ({
      type: 'string',
      widget: 'mentions',
      title: '提及',
      enum: ['alice', 'bob'],
      enumNames: ['Alice', 'Bob'],
    }),
  },
  {
    label: '提及（远程）',
    icon: '📡',
    category: 'widget',
    widget: 'mentionsWithRemote',
    createNode: () => ({
      type: 'string',
      widget: 'mentionsWithRemote',
      title: '提及（远程）',
      remoteData: {
        url: '/api/users/suggestions',
        method: 'GET',
        responseField: { data: 'data.users', value: 'id', label: 'name' },
        params: { keyword: '' },
      },
    }),
  },
  {
    label: '分段控制器',
    icon: '🎚️',
    category: 'widget',
    widget: 'segmented',
    createNode: () => ({
      type: 'string',
      widget: 'segmented',
      title: '分段控制器',
      enum: ['a', 'b'],
      enumNames: ['选项A', '选项B'],
    }),
  },
  {
    label: '穿梭框',
    icon: '⇄',
    category: 'widget',
    widget: 'transfer',
    createNode: () => ({
      type: 'array',
      widget: 'transfer',
      title: '穿梭框',
    }),
  },
  {
    label: '文件上传',
    icon: '📎',
    category: 'widget',
    widget: 'file',
    createNode: () => ({ type: 'array', widget: 'file', title: '文件上传' }),
  },
  {
    label: '数据对象',
    icon: '🗂️',
    category: 'widget',
    widget: 'object',
    createNode: () => ({ type: 'object', title: '数据对象', properties: {} }),
  },
  {
    label: '常规列表',
    icon: '📋',
    category: 'widget',
    widget: 'list',
    createNode: () => ({
      type: 'array',
      widget: 'list',
      title: '常规列表',
      items: {
        type: 'object',
        properties: {},
      },
    }),
  },
  {
    label: '简单列表',
    icon: '📃',
    category: 'widget',
    widget: 'simpleList',
    createNode: () => ({
      type: 'array',
      widget: 'simpleList',
      title: '简单列表',
      items: {
        type: 'object',
        properties: {},
      },
    }),
  },
  {
    label: '表格列表',
    icon: '📊',
    category: 'widget',
    widget: 'tableList',
    createNode: () => ({
      type: 'array',
      widget: 'tableList',
      title: '表格列表',
      items: {
        type: 'object',
        properties: {},
      },
    }),
  },
];

/**
 * 布局组件目录
 * 每个项创建一个 LayoutContainerSchema 节点
 */
export const layoutCatalog: CatalogItem[] = [
  {
    label: '卡片',
    icon: '📦',
    category: 'layout',
    layoutType: 'card',
    createNode: () => ({ type: 'card', title: '卡片', properties: {} }),
  },
  {
    label: '栅格',
    icon: '🔲',
    category: 'layout',
    layoutType: 'grid',
    createNode: () => ({ type: 'grid', column: 2, properties: {} }),
  },
  {
    label: '标签页',
    icon: '📑',
    category: 'layout',
    layoutType: 'tabs',
    createNode: () => ({
      type: 'tabs',
      title: '标签页',
      properties: {
        pane1: { type: 'tabPane', title: '标签页签 1', properties: {} },
      },
    }),
  },
  {
    label: '标签页签',
    icon: '📑',
    category: 'layout',
    layoutType: 'tabPane',
    createNode: () => ({ type: 'tabPane', title: '标签页签', properties: {} }),
  },
  {
    label: '折叠面板',
    icon: '📂',
    category: 'layout',
    layoutType: 'collapse',
    createNode: () => ({
      type: 'collapse',
      title: '折叠面板',
      properties: {
        panel1: { type: 'collapsePanel', title: '折叠面板 1', properties: {} },
      },
    }),
  },
  {
    label: '折叠面板项',
    icon: '📂',
    category: 'layout',
    layoutType: 'collapsePanel',
    createNode: () => ({
      type: 'collapsePanel',
      title: '折叠面板项',
      properties: {},
    }),
  },
  {
    label: '步骤条',
    icon: '📝',
    category: 'layout',
    layoutType: 'steps',
    createNode: () => ({
      type: 'steps',
      title: '步骤条',
      properties: {
        step1: { type: 'step', title: '步骤 1', properties: {} },
      },
    }),
  },
  {
    label: '步骤项',
    icon: '📝',
    category: 'layout',
    layoutType: 'step',
    createNode: () => ({ type: 'step', title: '步骤项', properties: {} }),
  },
  {
    label: '分割线',
    icon: '➖',
    category: 'layout',
    layoutType: 'divider',
    createNode: () => ({ type: 'divider', properties: {} }),
  },
  {
    label: '弹性布局',
    icon: '📐',
    category: 'layout',
    layoutType: 'flex',
    createNode: () => ({ type: 'flex', properties: {} }),
  },
  {
    label: '间距布局',
    icon: '↔️',
    category: 'layout',
    layoutType: 'space',
    createNode: () => ({ type: 'space', properties: {} }),
  },
];
