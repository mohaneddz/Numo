export type TemplateQueryValue = string | number | boolean | null | undefined;
export type TemplateQuery = Record<string, TemplateQueryValue>;

export interface TemplateActionDefinition {
  templateId: string;
  entityId?: string;
  defaultParams?: TemplateQuery;
  localHandler?: (params: TemplateQuery) => void;
}

export const ACTION_TEMPLATE_REGISTRY = {
  home_quick_session: {
    templateId: 'quick-session',
    defaultParams: { from: 'home', mode: 'quick' },
  },
  home_continue_learning: {
    templateId: 'learn-continue',
    defaultParams: { from: 'home', mode: 'continue' },
  },
  home_next_action: {
    templateId: 'next-action',
    defaultParams: { from: 'home' },
  },
  insights_quick_review: {
    templateId: 'insights-review',
    defaultParams: { from: 'insights', mode: 'quick' },
  },
  insights_period: {
    templateId: 'insights-period',
    defaultParams: { from: 'insights' },
  },
  library_start_practice: {
    templateId: 'library-practice',
    defaultParams: { from: 'library' },
  },
  settings_export: {
    templateId: 'settings-export',
    defaultParams: { from: 'settings' },
  },
  learn_quick_start: {
    templateId: 'learn-quick-start',
    defaultParams: { from: 'learn' },
  },
  review_recommended_flow: {
    templateId: 'review-flow',
    defaultParams: { from: 'review' },
  },
  speak_quick_practice: {
    templateId: 'speak-quick-practice',
    defaultParams: { from: 'speak' },
  },
  write_view_all: {
    templateId: 'write-view-all',
    defaultParams: { from: 'write' },
  },
  notebook_new_item: {
    templateId: 'notebook-new-item',
    defaultParams: { from: 'notebook' },
  },
  app_new_collection: {
    templateId: 'new-collection',
    defaultParams: { from: 'app-shell' },
  },
  app_notifications: {
    templateId: 'notifications',
    defaultParams: { from: 'app-shell' },
  },
  app_profile: {
    templateId: 'profile',
    defaultParams: { from: 'app-shell' },
  },
} as const satisfies Record<string, TemplateActionDefinition>;

export type ActionTemplateId = keyof typeof ACTION_TEMPLATE_REGISTRY;

export interface BuildTemplateUrlInput {
  templateId: string;
  entityId?: string;
  params?: TemplateQuery;
}

function toQueryValue(value: TemplateQueryValue): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

export const TEMPLATE_PATH_MAP: Record<string, string> = {
  'quick-session': '/practice/quick',
  'learn-continue': '/learn/session',
  'next-action': '/learn/session',
  'insights-review': '/insights',
  'insights-period': '/insights',
  'library-practice': '/practice/quick',
  'settings-export': '/settings',
  'learn-quick-start': '/learn/session',
  'review-flow': '/learn/session',
  'speak-quick-practice': '/practice/quick',
  'write-view-all': '/notebook',
  'notebook-new-item': '/notebook',
  'new-collection': '/notebook',
  'notifications': '/notifications',
  'profile': '/profile',
  'echo-quick-practice': '/practice/quick',
  'echo-live-conversation': '/speak',
  'echo-mistake-analysis': '/insights',
  'content-practice': '/practice/quick',
  'content-related': '/learn/session',
  'content-save': '/library',
  'notebook-review': '/practice/quick',
  'notebook-edit': '/notebook',
  'write-continue': '/notebook',
  'write-review': '/practice/quick',
  'write-publish': '/notebook'
};

export function buildTemplateUrl(input: BuildTemplateUrlInput): string {
  const path = TEMPLATE_PATH_MAP[input.templateId] || '/practice/quick';

  const base = input.entityId ? `${path}/${encodeURIComponent(input.entityId)}` : path;

  const params = new URLSearchParams();
  Object.entries(input.params ?? {}).forEach(([key, value]) => {
    const encoded = toQueryValue(value);
    if (encoded !== null) {
      params.set(key, encoded);
    }
  });

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function buildActionUrl(
  actionId: ActionTemplateId,
  options?: {
    entityId?: string;
    params?: TemplateQuery;
  },
): string {
  const action = ACTION_TEMPLATE_REGISTRY[actionId];
  const defaultEntityId = (action as TemplateActionDefinition).entityId;
  return buildTemplateUrl({
    templateId: action.templateId,
    entityId: options?.entityId ?? defaultEntityId,
    params: {
      ...(action.defaultParams ?? {}),
      ...(options?.params ?? {}),
    },
  });
}
