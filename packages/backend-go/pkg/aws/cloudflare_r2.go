package aws

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/spf13/viper"
)

const (
	UploadSceneUserProfile    = 1 // 用户个人信息图片
	UploadSceneActivityBanner = 2 // 活动banner
	UploadJobConfigIcon       = 3 // 职业配置图标
)

var (
	r2Instance *CloudflareR2
	r2Once     sync.Once
)

// GetR2Instance 获取 Cloudflare R2 单例实例
// 需要先调用 InitR2 初始化后才能使用
func GetR2Instance() *CloudflareR2 {
	return r2Instance
}

// InitR2 初始化 Cloudflare R2 单例
// 注意：该初始化方法不是线程安全的，建议在程序启动时调用
func InitR2(config S3Config, accountId, fileUrl string) *CloudflareR2 {
	_init(config)
	r2Once.Do(func() {
		client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(
				fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountId))
		})
		// 预签名的客户端
		presignClient := s3.NewPresignClient(client)
		r2Instance = &CloudflareR2{
			r2Client: &S3Client{
				client: client,
				bucket: config.Bucket,
			},
			r2PresignClient: presignClient,
			bucketName:      config.Bucket,
			fileUrl:         fileUrl,
			// 这里可以初始化配置参数
		}
	})
	return r2Instance
}

func NewR2Client(v *viper.Viper) (*CloudflareR2, func(), error) {
	return InitR2(S3Config{
		Region:          v.GetString("r2_aws.region"),
		Bucket:          v.GetString("r2_aws.bucket"),
		AccessKeyId:     v.GetString("r2_aws.access_key_id"),
		SecretAccessKey: v.GetString("r2_aws.secret_access_key"),
	}, v.GetString(`r2_aws.account_id`), v.GetString(`r2_aws.file_url`)), nil, nil
}

type CloudflareR2 struct {
	r2Client        *S3Client
	r2PresignClient *s3.PresignClient
	bucketName      string
	fileUrl         string
}

// 生成上传用的预签名url
func (r *CloudflareR2) UploadPresignedUrl(fileExt string, uploadScene int) (string, string, error) {
	// 文件扩展名并转换为小写
	fileExt = strings.ToLower(fileExt)
	// 根据扩展名设置 Content-Type
	var contentType string = fileExt
	fileExt = strings.Split(fileExt, "/")[1]
	// 生成一个随机的文件名，作为 objectKey
	objectKey := fmt.Sprintf("%s.%s", uuid.New().String(), fileExt)
	switch uploadScene {
	case UploadSceneUserProfile:
		objectKey = "user_profile/" + objectKey
	case UploadSceneActivityBanner:
		objectKey = "activity_banner/" + objectKey
	case UploadJobConfigIcon:
		objectKey = "job_config_icon/" + objectKey
	default:
		return "", "", fmt.Errorf("不允许的上传场景: %d", uploadScene)
	}

	// 通过预签名客户端发起请求，获取上传文件的预签名Url的信息
	req, err := r.r2PresignClient.PresignPutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(r.bucketName),
		Key:         aws.String(objectKey),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		// 链接的有效时间设置成5分钟
		opts.Expires = 5 * time.Minute
	})
	// 如果报错了，返回错误信息
	if err != nil {
		return "", "", err
	}
	// 返回预签名url
	return req.URL, r.fileUrl + objectKey, nil
}
