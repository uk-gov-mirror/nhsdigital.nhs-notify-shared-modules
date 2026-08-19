# @nhsdigital/nhs-notify-shared-utils

This package contains **generic** technical helpers (logging, Lambda
helpers, integration test support) for use across bounded contexts.

## Exports

| Subpath                                                   | Purpose                                                                                    | Docs                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `./logger`                                                | Generic pino-backed `Logger` with redaction support                                        | [logger](src/logger/README.md)             |
| `./lambda-utils`                                          | `requireEnv`, `MissingEnvironmentVariableError`, `formatZodIssues`, SQS attribute readers  | [lambda-utils](src/lambda-utils/README.md) |
| `./test-support`                                          | Low level Integration test-support utilities - deployment/naming, polling, event factories | [test-support](src/test-support/README.md) |
| `./test-support/{cloudwatch,sqs,s3,dynamodb,eventbridge}` | Per-service AWS client factories and helpers                                               | [test-support](src/test-support/README.md) |
| `./s3-json`                                               | S3 get-JSON-and-validate helper                                                            | [s3-json](src/s3-json/README.md)           |

## Scripts

```sh
pnpm run build       # rm -rf dist && tsc
pnpm run lint        # eslint .
pnpm run typecheck   # tsc --noEmit
pnpm run test:unit   # jest (100% coverage)
pnpm run verify      # lint && typecheck && test:unit
```

## Release

Publishing is tag-driven. Pushing a tag of the form `shared-utils-vX.Y.Z`
triggers the publish workflow, which requires an equivalent version bump to
`version` in `package.json`.
