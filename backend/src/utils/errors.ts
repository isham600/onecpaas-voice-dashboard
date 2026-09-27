import type { FastifyReply, FastifyRequest } from 'fastify';

// ── Base ──────────────────────────────────────────────────────────────────────

export interface AppError {
  code:       string;
  message:    string;
  statusCode: number;
  details?:   unknown;
}

abstract class BaseAppError extends Error implements AppError {
  abstract code:       string;
  abstract statusCode: number;
  details?: unknown;
}

export const isAppError = (err: unknown): err is BaseAppError =>
  err instanceof BaseAppError;

// ── Auth (401 / 403) ──────────────────────────────────────────────────────────

export class InvalidCredentialsError extends BaseAppError {
  code       = 'INVALID_CREDENTIALS';
  statusCode = 401;
  constructor() {
    super('Invalid username or password.');
    this.message = 'Invalid username or password.';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class TokenExpiredError extends BaseAppError {
  code       = 'TOKEN_EXPIRED';
  statusCode = 401;
  constructor() {
    super('Your session has expired. Please log in again.');
    this.message = 'Your session has expired. Please log in again.';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class TokenInvalidError extends BaseAppError {
  code       = 'TOKEN_INVALID';
  statusCode = 401;
  constructor() {
    super('Invalid or malformed token. Please log in again.');
    this.message = 'Invalid or malformed token. Please log in again.';
    Object.setPrototypeOf(this, TokenInvalidError.prototype);
  }
}

export class UnauthorizedError extends BaseAppError {
  code       = 'UNAUTHORIZED';
  statusCode = 401;
  constructor(message = 'Authentication required.') {
    super(message);
    this.message = message;
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class AccountSuspendedError extends BaseAppError {
  code       = 'ACCOUNT_SUSPENDED';
  statusCode = 403;
  constructor() {
    super('Your account has been suspended. Please contact support.');
    this.message = 'Your account has been suspended. Please contact support.';
    Object.setPrototypeOf(this, AccountSuspendedError.prototype);
  }
}

export class ForbiddenError extends BaseAppError {
  code       = 'FORBIDDEN';
  statusCode = 403;
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
    this.message = message;
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class FeatureNotEnabledError extends BaseAppError {
  code       = 'FEATURE_NOT_ENABLED';
  statusCode = 403;
  constructor(feature?: string) {
    const msg = feature
      ? `The "${feature}" feature is not enabled for your account.`
      : 'This feature is not enabled for your account.';
    super(msg);
    this.message = msg;
    Object.setPrototypeOf(this, FeatureNotEnabledError.prototype);
  }
}

// ── Validation (400) ──────────────────────────────────────────────────────────

export interface FieldError {
  field:   string;
  message: string;
}

export class ValidationError extends BaseAppError {
  code       = 'VALIDATION_ERROR';
  statusCode = 400;
  declare details: FieldError[] | undefined;

  constructor(message: string, details?: FieldError[]) {
    super(message);
    this.message = message;
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class MissingFieldError extends BaseAppError {
  code       = 'MISSING_FIELD';
  statusCode = 400;
  declare details: FieldError[];

  constructor(fields: string[]) {
    const list = fields.join(', ');
    super(`Missing required field(s): ${list}.`);
    this.message = `Missing required field(s): ${list}.`;
    this.details = fields.map((f) => ({ field: f, message: 'This field is required.' }));
    Object.setPrototypeOf(this, MissingFieldError.prototype);
  }
}

export class InvalidFormatError extends BaseAppError {
  code       = 'INVALID_FORMAT';
  statusCode = 400;
  declare details: FieldError[];

  constructor(field: string, hint?: string) {
    const msg = hint
      ? `Invalid format for "${field}": ${hint}`
      : `Invalid format for "${field}".`;
    super(msg);
    this.message = msg;
    this.details = [{ field, message: hint ?? 'Invalid format.' }];
    Object.setPrototypeOf(this, InvalidFormatError.prototype);
  }
}

// ── Resource (404 / 409 / 410) ────────────────────────────────────────────────

export class NotFoundError extends BaseAppError {
  code       = 'NOT_FOUND';
  statusCode = 404;
  constructor(resource: string) {
    super(`${resource} not found.`);
    this.message = `${resource} not found.`;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class AlreadyExistsError extends BaseAppError {
  code       = 'ALREADY_EXISTS';
  statusCode = 409;
  constructor(resource: string) {
    super(`${resource} already exists.`);
    this.message = `${resource} already exists.`;
    Object.setPrototypeOf(this, AlreadyExistsError.prototype);
  }
}

/** @deprecated alias kept for backward compatibility */
export class ConflictError extends AlreadyExistsError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ResourceDeletedError extends BaseAppError {
  code       = 'RESOURCE_DELETED';
  statusCode = 410;
  constructor(resource: string) {
    super(`${resource} has been deleted and is no longer available.`);
    this.message = `${resource} has been deleted and is no longer available.`;
    Object.setPrototypeOf(this, ResourceDeletedError.prototype);
  }
}

// ── Business Logic (402 / 422) ────────────────────────────────────────────────

export interface CreditDetails {
  required:  number;
  available: number;
}

export class InsufficientCreditsError extends BaseAppError {
  code       = 'INSUFFICIENT_CREDITS';
  statusCode = 402;
  declare details: CreditDetails;

  constructor(required: number, available: number) {
    super(`Insufficient credits. Required: ${required}, available: ${available}.`);
    this.message = `Insufficient credits. Required: ${required}, available: ${available}.`;
    this.details = { required, available };
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}

export class CampaignAlreadySentError extends BaseAppError {
  code       = 'CAMPAIGN_ALREADY_SENT';
  statusCode = 422;
  constructor() {
    super('This campaign has already been sent and cannot be modified.');
    this.message = 'This campaign has already been sent and cannot be modified.';
    Object.setPrototypeOf(this, CampaignAlreadySentError.prototype);
  }
}

export class TemplateNotApprovedError extends BaseAppError {
  code       = 'TEMPLATE_NOT_APPROVED';
  statusCode = 422;
  constructor() {
    super('This template has not been approved by Meta and cannot be used for sending.');
    this.message = 'This template has not been approved by Meta and cannot be used for sending.';
    Object.setPrototypeOf(this, TemplateNotApprovedError.prototype);
  }
}

export class UnprocessableError extends BaseAppError {
  code       = 'UNPROCESSABLE';
  statusCode = 422;
  constructor(message: string) {
    super(message);
    this.message = message;
    Object.setPrototypeOf(this, UnprocessableError.prototype);
  }
}

// ── Rate Limit (429) ──────────────────────────────────────────────────────────

export interface RateLimitDetails {
  retryAfter: number; // seconds
}

export class RateLimitError extends BaseAppError {
  code       = 'RATE_LIMIT_EXCEEDED';
  statusCode = 429;
  declare details: RateLimitDetails;

  constructor(retryAfterSeconds = 60) {
    super(`Too many requests. Please try again in ${retryAfterSeconds} seconds.`);
    this.message = `Too many requests. Please try again in ${retryAfterSeconds} seconds.`;
    this.details = { retryAfter: retryAfterSeconds };
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// ── External Service (502) ────────────────────────────────────────────────────

export class ExternalServiceError extends BaseAppError {
  code       = 'EXTERNAL_SERVICE_ERROR';
  statusCode = 502;
  // rawError is intentionally NOT put in details — never reaches the client
  constructor(public readonly service: string, public readonly rawError?: unknown) {
    super(`${service} is currently unavailable. Please try again shortly.`);
    this.message = `${service} is currently unavailable. Please try again shortly.`;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

// ── File / Upload (413 / 415) ─────────────────────────────────────────────────

export class FileTooLargeError extends BaseAppError {
  code       = 'FILE_TOO_LARGE';
  statusCode = 413;
  constructor(maxMb: number) {
    super(`File exceeds the maximum allowed size of ${maxMb} MB.`);
    this.message = `File exceeds the maximum allowed size of ${maxMb} MB.`;
    Object.setPrototypeOf(this, FileTooLargeError.prototype);
  }
}

export class InvalidFileTypeError extends BaseAppError {
  code       = 'INVALID_FILE_TYPE';
  statusCode = 415;
  constructor(allowed: string[]) {
    const list = allowed.join(', ');
    super(`Invalid file type. Allowed types: ${list}.`);
    this.message = `Invalid file type. Allowed types: ${list}.`;
    Object.setPrototypeOf(this, InvalidFileTypeError.prototype);
  }
}

// ── Server (500) ──────────────────────────────────────────────────────────────

export class InternalServerError extends BaseAppError {
  code       = 'INTERNAL_SERVER_ERROR';
  statusCode = 500;
  constructor(message = 'Something went wrong. Please try again later.') {
    super(message);
    this.message = message;
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

// ── throwIf helper ────────────────────────────────────────────────────────────

type ErrorConstructor = new (...args: any[]) => BaseAppError;

export function throwIf<T extends ErrorConstructor>(
  condition: boolean,
  ErrorClass: T,
  ...args: ConstructorParameters<T>
): void {
  if (condition) throw new ErrorClass(...args);
}

// ── Global error handler ──────────────────────────────────────────────────────

// DB driver / OS / network error codes that must never reach the client.
const UNSAFE_PREFIXES = ['ER_', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EACCES'];

const isUnsafeCode = (code: string): boolean =>
  UNSAFE_PREFIXES.some((p) => String(code).startsWith(p));

export const handleError = (
  reply:   FastifyReply,
  error:   unknown,
  request?: FastifyRequest,
): FastifyReply => {
  // ── Our own typed errors ─────────────────────────────────────────────────
  if (isAppError(error)) {
    // ExternalServiceError: log the raw cause, send safe message
    if (error instanceof ExternalServiceError && error.rawError) {
      (request?.log ?? reply.server.log).error(
        { err: error.rawError, service: error.service },
        'External service error',
      );
    }
    return reply.code(error.statusCode).send({
      success: false,
      code:    error.code,
      message: error.message,
      details: error.details ?? null,
    });
  }

  const err       = error as any;
  const rawCode   = err?.code   ?? 'UNKNOWN';
  const status    = err?.statusCode ?? 500;

  // ── Fastify schema validation (FST_ERR_VALIDATION) ────────────────────────
  // NOTE: only real AJV schema failures land here. A plain
  // fastify.httpErrors.badRequest('some real reason') also carries
  // statusCode 400 but has no `.validation` array — that must fall through
  // to the generic 4xx branch below so its actual message reaches the client
  // instead of being replaced with this generic string.
  if (rawCode === 'FST_ERR_VALIDATION') {
    const fields: FieldError[] = (err?.validation ?? []).map((v: any) => ({
      field:   v.instancePath?.replace(/^\//, '') || v.params?.missingProperty || 'unknown',
      message: v.message ?? 'Invalid value.',
    }));
    return reply.code(400).send({
      success: false,
      code:    'VALIDATION_ERROR',
      message: 'Request validation failed.',
      details: fields.length > 0 ? fields : null,
    });
  }

  // ── JWT errors (thrown by @fastify/jwt and fast-jwt) ────────────────────
  if (
    rawCode === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
    rawCode === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID' ||
    rawCode === 'FAST_JWT_INVALID_ALGORITHM' ||
    rawCode === 'FAST_JWT_INVALID_SIGNATURE' ||
    rawCode === 'FAST_JWT_MALFORMED' ||
    rawCode === 'FAST_JWT_INVALID_CLAIM_NAMESPACE'
  ) {
    return reply.code(401).send({
      success: false,
      code:    'TOKEN_INVALID',
      message: 'Invalid or missing token. Please log in again.',
      details: null,
    });
  }
  if (
    rawCode === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
    rawCode === 'FAST_JWT_EXPIRED'
  ) {
    return reply.code(401).send({
      success: false,
      code:    'TOKEN_EXPIRED',
      message: 'Your session has expired. Please log in again.',
      details: null,
    });
  }

  // ── DB / OS / network errors — never leak details to client ──────────────
  if (status >= 500 || isUnsafeCode(rawCode)) {
    (request?.log ?? reply.server.log).error(
      { err: error, code: rawCode, url: request?.url, method: request?.method, ip: request?.ip },
      'Internal server error',
    );
    return reply.code(500).send({
      success: false,
      code:    'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong. Please try again later.',
      details: null,
    });
  }

  // ── Unknown 4xx — forward as-is but strip any stack/internals ────────────
  return reply.code(status).send({
    success: false,
    code:    rawCode,
    message: err?.message ?? 'An error occurred.',
    details: null,
  });
};
