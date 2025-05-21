package models

import (
	"appstore/server/i18n"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"time"
)

type DooTaskResponse struct {
	Ret  int         `json:"ret"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
}

type DooTaskUser struct {
	UserID   int      `json:"userid"`
	Identity []string `json:"identity"`
	Email    string   `json:"email"`
	Nickname string   `json:"nickname"`
	UserImg  string   `json:"userimg"`
}

type DooTaskUserResponse struct {
	DooTaskResponse
	Data DooTaskUser `json:"data"`
}

type DooTaskUserCache struct {
	User      DooTaskUser
	ExpiresAt time.Time
}

var (
	DooTaskServer     = "http://nginx"
	DooTaskTokenCache = make(map[string]DooTaskUserCache)
	DooTaskCacheTime  = 10 * time.Minute
)

// DooTaskCheckUser 检查用户
func DooTaskCheckUser(token string) (*DooTaskUser, error) {
	// 检查缓存
	if cache, ok := DooTaskTokenCache[token]; ok {
		if time.Now().Before(cache.ExpiresAt) {
			return &cache.User, nil
		}
		delete(DooTaskTokenCache, token)
	}

	// 验证 token
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	req, err := http.NewRequest("GET", DooTaskServer+"/api/users/info", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Token", token)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var response DooTaskUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	if response.Ret != 1 {
		return nil, errors.New(response.Msg)
	}

	// 更新缓存
	DooTaskTokenCache[token] = DooTaskUserCache{
		User:      response.Data,
		ExpiresAt: time.Now().Add(DooTaskCacheTime),
	}

	// 返回用户信息
	return &response.Data, nil
}

// DooTaskCheckUserIdentity 检查用户是否具有指定身份
func DooTaskCheckUserIdentity(token string, identity string) (*DooTaskUser, error) {
	user, err := DooTaskCheckUser(token)
	if err != nil {
		return nil, err
	}

	if !slices.Contains(user.Identity, identity) {
		return nil, errors.New(i18n.T("权限不足"))
	}

	return user, nil
}
