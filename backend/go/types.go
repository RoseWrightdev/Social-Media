package main

import "database/sql"

type UsersJSON struct {
	Id        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	ResetToken sql.NullString `json:"resttoken"`
}

type IdJSON struct { 
	Id string `json:"id"`
}

type EmailJSON struct { 
	Email string `json:"email"`
}

type IdPasswordJSON struct { 
	Id       string `json:"id"`
	Password string `json:"password"`
}

type GetLoginJSON struct {
	Email string `json:"email"`
	Password string `json:"password"`
}

type PostRegisterJSON struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

type RestPasswordJSON struct {
	Token     string `json:"token"`
	Password  string `json:"password"`
}

type PostPostsJSON struct {
	ParentId     string `json:"id"`
	TextContent  string `json:"text"`
	ContentType  string `json:"type"`
	File         string `json:"file"`
}

type PostUpdatePasswordJSON struct {
	Token     string `json:"token"`
	Password  string `json:"password"`
}

type PostsJSON struct {
	Id     string `json:"id"`
	Parent_id  string `json:"parent_id"`
	Text_content  string `json:"text_content"`
}

type PostsRes struct {
	Id     string `json:"postID"`
	Parent_id  string `json:"parentID"`
	Text_content  string `json:"textContent"`
	Endcoded_attatchment  string `json:"encodedAttachment"`
	Extension string `json:"fileExtension"`
}