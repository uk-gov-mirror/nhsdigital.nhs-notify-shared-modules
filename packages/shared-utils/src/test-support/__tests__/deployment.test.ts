import { buildLambdaLogGroupName, getDeploymentDetails } from '../deployment';

describe('getDeploymentDetails', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('reads values from the environment', () => {
    process.env.AWS_REGION = 'eu-west-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.PROJECT = 'proj';
    process.env.COMPONENT = 'comp';
    process.env.AWS_ACCOUNT_ID = '123456789012';

    expect(getDeploymentDetails()).toEqual({
      region: 'eu-west-1',
      environment: 'dev',
      project: 'proj',
      component: 'comp',
      accountId: '123456789012',
    });
  });

  it('applies passed-in defaults for region, project and component', () => {
    delete process.env.AWS_REGION;
    delete process.env.PROJECT;
    delete process.env.COMPONENT;
    process.env.ENVIRONMENT = 'dev';
    process.env.AWS_ACCOUNT_ID = '123456789012';

    expect(
      getDeploymentDetails({
        region: 'eu-west-2',
        project: 'nhs',
        component: 'ar',
      }),
    ).toEqual({
      region: 'eu-west-2',
      environment: 'dev',
      project: 'nhs',
      component: 'ar',
      accountId: '123456789012',
    });
  });

  it('throws when AWS_REGION is missing and no default is provided', () => {
    delete process.env.AWS_REGION;
    process.env.ENVIRONMENT = 'dev';
    process.env.PROJECT = 'nhs';
    process.env.COMPONENT = 'comp';
    process.env.AWS_ACCOUNT_ID = '123456789012';
    expect(() => getDeploymentDetails()).toThrow(
      'AWS_REGION environment variable must be set or a default provided',
    );
  });

  it('throws when ENVIRONMENT is missing', () => {
    process.env.AWS_REGION = 'eu-west-2';
    delete process.env.ENVIRONMENT;
    process.env.COMPONENT = 'comp';
    process.env.AWS_ACCOUNT_ID = '123456789012';
    expect(() => getDeploymentDetails()).toThrow(
      'ENVIRONMENT environment variable must be set',
    );
  });

  it('throws when PROJECT is missing and no default is provided', () => {
    process.env.AWS_REGION = 'eu-west-2';
    process.env.ENVIRONMENT = 'dev';
    delete process.env.PROJECT;
    process.env.COMPONENT = 'comp';
    process.env.AWS_ACCOUNT_ID = '123456789012';
    expect(() => getDeploymentDetails()).toThrow(
      'PROJECT environment variable must be set or a default provided',
    );
  });

  it('throws when COMPONENT is missing and no default is provided', () => {
    process.env.AWS_REGION = 'eu-west-2';
    process.env.ENVIRONMENT = 'dev';
    process.env.PROJECT = 'nhs';
    delete process.env.COMPONENT;
    process.env.AWS_ACCOUNT_ID = '123456789012';
    expect(() => getDeploymentDetails()).toThrow(
      'COMPONENT environment variable must be set or a default provided',
    );
  });

  it('throws when AWS_ACCOUNT_ID is missing', () => {
    process.env.AWS_REGION = 'eu-west-2';
    process.env.ENVIRONMENT = 'dev';
    process.env.PROJECT = 'nhs';
    process.env.COMPONENT = 'comp';
    delete process.env.AWS_ACCOUNT_ID;
    expect(() => getDeploymentDetails()).toThrow(
      'AWS_ACCOUNT_ID environment variable must be set',
    );
  });
});

describe('buildLambdaLogGroupName', () => {
  it('builds the log group name from the deployment components', () => {
    expect(
      buildLambdaLogGroupName(
        { component: 'ar', environment: 'dev', project: 'nhs' },
        'my-fn',
      ),
    ).toBe('/aws/lambda/nhs-dev-ar-my-fn');
  });
});
