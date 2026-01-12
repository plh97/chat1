package v1

type UploadPresignedUrlRequest struct {
	FileExt     string `json:"file_ext" example:"alan"`
	UploadScene int    `json:"upload_scene" binding:"required" example:"1"`
}

type UploadPresignedUrlResponseData struct {
	PreSignedUrl string `json:"pre_signed_url" example:"alan"`
	EndpointUrl  string `json:"endpoint_url" binding:"required" example:"1"`
}
type UploadPresignedUrlResponse struct {
	Response
	Data UploadPresignedUrlResponseData
}
