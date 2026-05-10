'use client';

type SecurityContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: unknown;
};

interface SecurityRuleRequest {
  auth: { uid: string | null };
  method: string;
  path: string;
  resource?: { data: unknown };
}

function buildRequestObject(context: SecurityContext, userId: string | null): SecurityRuleRequest {
  return {
    auth: { uid: userId },
    method: context.operation,
    path: context.path,
    resource: context.requestResourceData !== undefined ? { data: context.requestResourceData } : undefined,
  };
}

function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  return `Missing or insufficient permissions: The following request was denied by Row Level Security:
${JSON.stringify(requestObject, null, 2)}`;
}

export class DatabasePermissionError extends Error {
  public readonly request: SecurityRuleRequest;

  constructor(context: SecurityContext, userId: string | null = null) {
    const requestObject = buildRequestObject(context, userId);
    super(buildErrorMessage(requestObject));
    this.name = 'DatabasePermissionError';
    this.request = requestObject;
  }
}
