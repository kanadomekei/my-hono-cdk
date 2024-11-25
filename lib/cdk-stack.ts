import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB テーブルの作成
    const table = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
    });

    // Lambda 関数の作成
    const fn = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/src/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Lambdaのロググループを作成
    const logGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/${fn.functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
    });

    // DynamoDB アクセス権限を Lambda に付与
    table.grantReadWriteData(fn);

    // API Gateway用のロールを作成
    const apigwLogRole = new iam.Role(this, 'ApiGatewayLoggingRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs')
      ]
    });

    // アカウントレベルの設定を更新
    const cfnAccount = new apigateway.CfnAccount(this, 'ApiGatewayAccount', {
      cloudWatchRoleArn: apigwLogRole.roleArn
    });

    // API Gatewayの作成
    const api = new apigateway.LambdaRestApi(this, 'myapi', {
      handler: fn,
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(new logs.LogGroup(this, 'ApiGatewayAccessLogs')),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
    });

    // API Gateway作成時にアカウント設定への依存関係を追加
    api.node.addDependency(cfnAccount);

    // Lambda関数のURLを追加
    fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
  }
}
