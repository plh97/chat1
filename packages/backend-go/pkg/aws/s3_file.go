package aws

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type S3Client struct {
	client *s3.Client
	bucket string
}

type S3Config struct {
	Region          string
	Bucket          string
	AccessKeyId     string
	SecretAccessKey string
}

func NewS3Client(s3Config S3Config) *S3Client {
	_init(s3Config)

	bucket := s3Config.Bucket
	client := s3.NewFromConfig(awsCfg)

	return &S3Client{
		client: client,
		bucket: bucket,
	}
}

// CheckFileExists 检查 S3 中的单个文件是否存在
func (s *S3Client) CheckFileExists(key string) (bool, error) {
	_, err := s.client.HeadObject(context.TODO(), &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})

	if err != nil {
		var notFound *types.NotFound
		if errors.As(err, &notFound) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

// UploadFile 上传文件到S3
func (s *S3Client) UploadFile(key string, filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = s.client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
		Body:   file,
	})
	if err != nil {
		return err
	}

	return nil
}

// GetFileHead 获取文件头信息
func (s *S3Client) GetFileHead(key string) (*s3.HeadObjectOutput, error) {
	output, err := s.client.HeadObject(context.TODO(), &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}

	return output, nil
}

// GetFileByte 获取文件字节
func (s *S3Client) GetFileByte(key string) ([]byte, error) {
	fileData, err := s.GetFileBody(key)
	if err != nil {
		return nil, err
	}
	defer fileData.Close()

	// 将数据流读入内存
	data, err := io.ReadAll(fileData)
	if err != nil {
		return nil, err
	}

	return data, nil
}

// GetFileBody 获取文件
func (s *S3Client) GetFileBody(key string) (io.ReadCloser, error) {
	output, err := s.client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}

	return output.Body, nil
}

// DownloadFile 从S3下载文件
func (s *S3Client) DownloadFile(key string, savePath string) error {
	fileData, err := s.GetFileBody(key)
	if err != nil {
		return err
	}
	defer fileData.Close()

	// 获取目录路径
	dir := filepath.Dir(savePath)

	// 创建目录（如果不存在）
	err = os.MkdirAll(dir, os.ModePerm)
	if err != nil {
		return err
	}

	file, err := os.Create(savePath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(file, fileData)
	if err != nil {
		return err
	}

	return nil
}

// CopyFile 复制S3中的文件到新位置
func (s *S3Client) CopyFile(sourceKey string, destinationKey string) error {
	copySource := fmt.Sprintf("%s/%s", s.bucket, sourceKey)

	_, err := s.client.CopyObject(context.TODO(), &s3.CopyObjectInput{
		CopySource: aws.String(copySource),
		Bucket:     aws.String(s.bucket),
		Key:        aws.String(destinationKey),
	})
	if err != nil {
		return err
	}

	return nil
}

// ListFiles 列出指定目录下的文件
func (s *S3Client) ListFiles(prefix, delimiter string) ([]string, error) {
	var files []string

	paginator := s3.NewListObjectsV2Paginator(s.client, &s3.ListObjectsV2Input{
		Bucket:    aws.String(s.bucket),
		Prefix:    aws.String(prefix),
		Delimiter: aws.String(delimiter),
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(context.TODO())
		if err != nil {
			return nil, err
		}

		if delimiter != "" {
			for _, obj := range page.CommonPrefixes {
				files = append(files, *obj.Prefix)
			}
		}

		for _, obj := range page.Contents {
			files = append(files, *obj.Key)
		}
	}

	return files, nil
}

// MoveAndRenameFiles 移动指定目录下的文件到新目录并重命名
func (s *S3Client) MoveAndRenameFiles(sourcePrefix string, destinationPrefix string, delOldFile bool) error {
	files, err := s.ListFiles(sourcePrefix, "")
	if err != nil {
		return err
	}

	for index, file := range files {
		newKey := fmt.Sprintf("%s/file_%d", destinationPrefix, index)

		// Copy file to new location with new name
		err := s.CopyFile(file, newKey)
		if err != nil {
			return err
		}

		// Delete the old file
		if delOldFile == true {
			_, err = s.client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
				Bucket: aws.String(s.bucket),
				Key:    aws.String(file),
			})
			if err != nil {
				return err
			}
		}
	}

	return nil
}
