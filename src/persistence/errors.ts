export class PersistenceUnavailableError extends Error {
  constructor(message = 'Persistence is only available inside Tauri runtime.') {
    super(message);
    this.name = 'PersistenceUnavailableError';
  }
}

export class MigrationError extends Error {
  public readonly version: number;
  public readonly migrationName: string;

  constructor(version: number, migrationName: string, cause: unknown) {
    super(`Migration failed (v${version} - ${migrationName}): ${String(cause)}`);
    this.name = 'MigrationError';
    this.version = version;
    this.migrationName = migrationName;
  }
}

export class RepositoryError extends Error {
  public readonly repository: string;
  public readonly operation: string;

  constructor(repository: string, operation: string, cause: unknown) {
    super(`${repository}.${operation} failed: ${String(cause)}`);
    this.name = 'RepositoryError';
    this.repository = repository;
    this.operation = operation;
  }
}
