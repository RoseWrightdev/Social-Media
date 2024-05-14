export interface GET_Sever_TYPE {
  status: string,
  port: number
}

export interface GET_Database_TYPE {
  id: string,
  username: string,
  email: string,
  password: string
}

export interface POST_Register_TYPE { 
  username: string,
  email: string,
  password: string,
}
export interface User_TYPE {
  id: string, 
  username: string, 
  email: string, 
  password: string
}