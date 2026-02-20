"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.ImmutabilityError = exports.DuplicateError = exports.RateOverlapError = exports.AppError = void 0;
class AppError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class RateOverlapError extends AppError {
    overlaps;
    constructor(message, overlaps) {
        super(message, 'RATE_OVERLAP', overlaps);
        this.overlaps = overlaps;
        this.name = 'RateOverlapError';
    }
}
exports.RateOverlapError = RateOverlapError;
class DuplicateError extends AppError {
    constructor(message) {
        super(message, 'DUPLICATE');
        this.name = 'DuplicateError';
    }
}
exports.DuplicateError = DuplicateError;
class ImmutabilityError extends AppError {
    constructor(message) {
        super(message, 'IMMUTABLE');
        this.name = 'ImmutabilityError';
    }
}
exports.ImmutabilityError = ImmutabilityError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 'VALIDATION', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=errors.js.map