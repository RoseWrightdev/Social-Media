export interface User {
  id: string, 
  username: string, 
  email: string, 
  password: string
}

export interface ProfilePicture_Username {
  profilePictureURI: string,
  alt: string
  username: string,
}

export interface PostData {
  postID: string,
  parentID: string,
  textContent: string,
} 

export interface AttachmentRes {
  encodedAttachment: string,
  fileExtension: string
}


