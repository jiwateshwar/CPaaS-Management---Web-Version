export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class RateOverlapError extends AppError {
  constructor(message: string, public overlaps: unknown[]) {
    super(message, 'RATE_OVERLAP', overlaps);
    this.name = 'RateOverlapError';
  }
}

export class DuplicateError extends AppError {
  constructor(message: string) {
    super(message, 'DUPLICATE');
    this.name = 'DuplicateError';
  }
}

export class ImmutabilityError extends AppError {
  constructor(message: string) {
    super(message, 'IMMUTABLE');
    this.name = 'ImmutabilityError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION', details);
    this.name = 'ValidationError';
  }
}
