import { AppError } from '../errors/app-error';

export class ValidationError extends AppError {
  constructor(public errors: any[], message: string = 'Validation failed') {
    super(message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  serializeErrors() {
    return this.errors.map(error => ({
      message: error.msg || error.message || this.message,
      field: error.param || error.field || 'unknown',
    }));
  }
}
