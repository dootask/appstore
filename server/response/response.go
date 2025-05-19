package response

import (
	"appstore/server/global"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// ErrorWithDetail 错误响应
func ErrorWithDetail(ctx *gin.Context, code int, message string, err error) {
	resp := &Response{
		Code:    code,
		Message: message,
		Data:    nil,
	}
	if err != nil {
		resp.Data = gin.H{
			"error": err.Error(),
		}
	}
	ctx.JSON(http.StatusOK, resp)
	ctx.Abort()
}

// SuccessWithData 成功响应
func SuccessWithData(ctx *gin.Context, data interface{}) {
	if data == nil {
		data = gin.H{}
	}
	ctx.JSON(http.StatusOK, Response{
		Code:    global.CodeSuccess,
		Message: "success",
		Data:    data,
	})
	ctx.Abort()
}

// SuccessWithOutData 成功响应
func SuccessWithOutData(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, Response{
		Code:    global.CodeSuccess,
		Message: "success",
	})
	ctx.Abort()
}

// SuccessWithMsg 成功响应
func SuccessWithMsg(ctx *gin.Context, message string) {
	ctx.JSON(http.StatusOK, Response{
		Code:    global.CodeSuccess,
		Message: message,
	})
	ctx.Abort()
}

// CheckBindAndValidate 检查绑定和验证
func CheckBindAndValidate(req interface{}, c *gin.Context) error {
	if err := c.ShouldBindJSON(req); err != nil {
		ErrorWithDetail(c, global.CodeError, "Parameter error", err)
		return err
	}
	if err := global.Validator.Struct(req); err != nil {
		ErrorWithDetail(c, global.CodeError, "Parameter error", err)
		return err
	}
	return nil
}
