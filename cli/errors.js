export const ExitCode = {
  OK: 0,
  INVALID_ARGS: 2,
  CONFIG_INVALID: 3,
  FETCH_FAILED: 4,
  PARSE_FAILED: 5,
  WRITE_FAILED: 6,
  UNKNOWN: 1
};

export class CliError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "CliError";
    this.code = code;
  }
}
