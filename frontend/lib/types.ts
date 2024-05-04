export interface GET_SeverTest_TYPE {
  status: string,
  port: number
}

export interface GET_Database_TYPE {
  id: number,
  username: string,
  email: string
}

export interface POST_Register_TYPE { 
  username: string,
  email: string,
  password: string,
  confirmPassword: string
}
