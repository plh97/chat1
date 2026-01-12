package aws

import (
	"context"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
)

var awsCfg = aws.Config{}
var once sync.Once
var configLock sync.Mutex

func _init(s3Config S3Config) {
	once.Do(func() {
		creds := aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(
			s3Config.AccessKeyId,
			s3Config.SecretAccessKey,
			"",
		))

		awsCfg, _ = config.LoadDefaultConfig(context.TODO(),
			config.WithCredentialsProvider(creds),
		)
	})

	configLock.Lock()
	defer configLock.Unlock()

	awsCfg.Region = s3Config.Region
}
