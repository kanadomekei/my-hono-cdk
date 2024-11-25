import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

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

    // DynamoDB アクセス権限を Lambda に付与
    table.grantReadWriteData(fn);

    fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE
    });

    new apigw.LambdaRestApi(this, 'myapi', {
      handler: fn,
    });
  }
}
