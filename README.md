# Features

Login
Logout
register account
email reset password link
user sessions

# next steps

build content based recommendation system

build collaborative filtering recommendation system 

build dashboard w/ feed and posts liking functionality etc


## UI

![root](https://github.com/RoseWrightdev/sm/assets/100792806/2d0ffe79-d482-4d78-816f-651adbd7dd46)
![feed](https://github.com/RoseWrightdev/sm/assets/100792806/5628c8ea-aee6-406c-abfa-683752f44edd)
![flowerlover](https://github.com/RoseWrightdev/sm/assets/100792806/d93e54d3-d8d3-4c08-ba8a-2313e0959a44)


## verify session exmaple

```
import { SERVER_PATH } from '@/lib/constants'
import { GET_Database_TYPE } from '@/lib/types'
import { verifySession } from '@/lib/dataAccessLayer'

async function getData() {
  const req = await fetch(SERVER_PATH + "/database", {cache: "no-store"})
  if(!req.ok){
    throw new Error('Failed to fetch data')
  }
  const res = await req.json()
  return res
};

export default async function GET_Database() {
  const session = await verifySession()
  if(session === null){
    throw new Error('Failed to verify session')
  }
  const res = await getData()

  return (
    res.map((data: GET_Database_TYPE) => {
    return (
      <>
        <div>id:{data.id}</div>
        <div>username:{data.username}</div>
        <div>email:{data.email}</div>
        <div>password:{data.password}</div>
        <br />
      </>
    )
   })
  );
};
```


## known issues

refactor RESTAPIS to use request body instead of url-params

refactor auth system to check database for some value to ensure auth is revokable (do this with a redis cache?)

