export interface DeploymentDetails {
  region: string;
  environment: string;
  project: string;
  component: string;
  accountId: string;
}

export interface DeploymentDetailsDefaults {
  region?: string;
  project?: string;
  component?: string;
}

export interface RegionOptions {
  region: string;
}

/**
 * Reads deployment details from the environment. All per-repo defaults are
 * passed in rather than hard-coded, so the helper stays generic across bounded
 * contexts. A value is required from either the environment or the supplied
 * defaults.
 */
export function getDeploymentDetails(
  defaults: DeploymentDetailsDefaults = {},
): DeploymentDetails {
  const region = process.env.AWS_REGION ?? defaults.region;
  const environment = process.env.ENVIRONMENT;
  const project = process.env.PROJECT ?? defaults.project;
  const component = process.env.COMPONENT ?? defaults.component;
  const accountId = process.env.AWS_ACCOUNT_ID;

  if (!region) {
    throw new Error(
      'AWS_REGION environment variable must be set or a default provided',
    );
  }

  if (!environment) {
    throw new Error('ENVIRONMENT environment variable must be set');
  }

  if (!project) {
    throw new Error(
      'PROJECT environment variable must be set or a default provided',
    );
  }

  if (!component) {
    throw new Error(
      'COMPONENT environment variable must be set or a default provided',
    );
  }

  if (!accountId) {
    throw new Error('AWS_ACCOUNT_ID environment variable must be set');
  }

  return { region, environment, project, component, accountId };
}

export function buildLambdaLogGroupName(
  {
    component,
    environment,
    project,
  }: Pick<DeploymentDetails, 'component' | 'environment' | 'project'>,
  functionIdentifier: string,
): string {
  return `/aws/lambda/${project}-${environment}-${component}-${functionIdentifier}`;
}
