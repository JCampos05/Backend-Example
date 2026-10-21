export class DomainValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DomainValidationError';
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class TaskLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TaskLimitError';
    }
}