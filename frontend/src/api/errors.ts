import axios from 'axios';

export type ApiErrorStage =
  | 'request'
  | 'auth'
  | 'config'
  | 'database'
  | 'helm'
  | 'cluster'
  | 'upstream'
  | 'internal'
  | 'network'
  | 'client';

const STAGES: readonly ApiErrorStage[] = [
  'request', 'auth', 'config', 'database', 'helm',
  'cluster', 'upstream', 'internal', 'network', 'client',
];

interface ApiErrorInit {
  message: string;
  status: number | null;
  code: string;
  stage: ApiErrorStage;
  detail?: string;
  hint?: string;
  errorId?: string;
  endpoint?: string;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly stage: ApiErrorStage;
  readonly detail?: string;
  readonly hint?: string;
  readonly errorId?: string;
  readonly endpoint?: string;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.stage = init.stage;
    this.detail = init.detail;
    this.hint = init.hint;
    this.errorId = init.errorId;
    this.endpoint = init.endpoint;
  }
}

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST', 401: 'NOT_AUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED', 409: 'CONFLICT', 422: 'UNPROCESSABLE',
  500: 'INTERNAL_ERROR', 502: 'UPSTREAM_ERROR', 503: 'SERVICE_UNAVAILABLE',
  504: 'UPSTREAM_TIMEOUT',
};

function asStage(value: unknown): ApiErrorStage | undefined {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value)
    ? (value as ApiErrorStage)
    : undefined;
}

function stageFromStatus(status: number): ApiErrorStage {
  if (status === 401 || status === 403) return 'auth';
  return status < 500 ? 'request' : 'internal';
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function messageFrom(payload: unknown): string | undefined {
  if (typeof payload === 'string') return asText(payload);
  if (!payload || typeof payload !== 'object') return undefined;

  const body = payload as Record<string, unknown>;
  const direct = asText(body.error) ?? asText(body.message);
  if (direct) return direct;

  if (typeof body.detail === 'string') return asText(body.detail);
  if (Array.isArray(body.detail)) {
    const parts = body.detail
      .map((item) => (item && typeof item === 'object'
        ? asText((item as Record<string, unknown>).msg)
        : undefined))
      .filter((part): part is string => Boolean(part));
    if (parts.length) return parts.join('; ');
  }
  return undefined;
}

export function toApiError(error: unknown, fallbackMessage?: string): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const endpoint = [error.config?.method?.toUpperCase(), error.config?.url]
      .filter(Boolean)
      .join(' ');

    if (!error.response) {
      const timedOut = error.code === 'ECONNABORTED';
      return new ApiError({
        status: null,
        code: timedOut ? 'REQUEST_TIMEOUT' : 'BACKEND_UNREACHABLE',
        stage: 'network',
        message: timedOut
          ? 'The backend did not respond in time.'
          : 'The backend could not be reached.',
        detail: `${error.code ? `${error.code}: ` : ''}${error.message}`,
        endpoint,
      });
    }

    const { status, data } = error.response;
    const body = (data ?? {}) as Record<string, unknown>;
    return new ApiError({
      status,
      code: asText(body.code) ?? CODE_BY_STATUS[status] ?? 'HTTP_ERROR',
      stage: asStage(body.stage) ?? stageFromStatus(status),
      message: messageFrom(data)
        ?? fallbackMessage
        ?? `The backend rejected the request (HTTP ${status}).`,
      detail: asText(body.detail),
      hint: asText(body.hint),
      errorId: asText(body.errorId),
      endpoint,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      status: null,
      code: 'CLIENT_ERROR',
      stage: 'client',
      message: error.message || fallbackMessage || 'The operation did not complete.',
      detail: error.stack,
    });
  }

  return new ApiError({
    status: null,
    code: 'UNKNOWN_ERROR',
    stage: 'client',
    message: fallbackMessage ?? 'An unexpected error occurred.',
    detail: String(error),
  });
}
