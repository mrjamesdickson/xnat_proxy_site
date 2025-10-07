import type { XnatWorkflow } from '../services/xnat-api';

const coerceString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const isContainerWorkflow = (workflow?: XnatWorkflow | null): boolean => {
  if (!workflow) return false;
  const justification = coerceString(
    (workflow as Record<string, unknown>)['justification'] ?? workflow.justification,
  );
  if (justification && justification.toLowerCase().includes('container')) {
    return true;
  }
  const description = coerceString((workflow as Record<string, unknown>)['details'] ?? workflow.details);
  if (description && description.toLowerCase().includes('container')) {
    return true;
  }
  return false;
};

export const getWorkflowContainerId = (workflow?: XnatWorkflow | null): string | undefined => {
  if (!workflow) return undefined;

  const explicitId = coerceString((workflow as Record<string, unknown>)['container-id']);
  if (explicitId) return explicitId;

  const commentsId = coerceString(
    workflow.comments ?? (workflow as Record<string, unknown>)['comments'],
  );
  if (commentsId && isContainerWorkflow(workflow)) {
    return commentsId;
  }

  return undefined;
};
