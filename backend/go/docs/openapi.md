---
title: Real-time Signaling Service API v1.0.0
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
highlight_theme: darkula
headingLevel: 2

---

<!-- Generator: Widdershins v4.0.1 -->

<h1 id="real-time-signaling-service-api">Real-time Signaling Service API v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

This API provides WebSocket endpoints for real-time communication features, including video calls, screen sharing, and text chat.

**Authentication is required for all endpoints.** A valid JWT must be provided as a `token` query parameter with each connection request.

Base URLs:

* <a href="ws://localhost:8080">ws://localhost:8080</a>

# Authentication

* API Key (bearerAuth)
    - Parameter Name: **token**, in: query. JWT token obtained from the authentication provider (e.g., Auth0) used to authenticate the WebSocket connection request.

<h1 id="real-time-signaling-service-api-websockets">WebSockets</h1>

Endpoints for establishing real-time WebSocket connections.

## get__ws_zoom_{roomId}

> Code samples

```shell
# You can also use wget
curl -X GET ws://localhost:8080/ws/zoom/{roomId}

```

```http
GET ws://localhost:8080/ws/zoom/{roomId} HTTP/1.1
Host: localhost:8080

```

```javascript

fetch('ws://localhost:8080/ws/zoom/{roomId}',
{
  method: 'GET'

})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```ruby
require 'rest-client'
require 'json'

result = RestClient.get 'ws://localhost:8080/ws/zoom/{roomId}',
  params: {
  }

p JSON.parse(result)

```

```python
import requests

r = requests.get('ws://localhost:8080/ws/zoom/{roomId}')

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','ws://localhost:8080/ws/zoom/{roomId}', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("ws://localhost:8080/ws/zoom/{roomId}");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "ws://localhost:8080/ws/zoom/{roomId}", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /ws/zoom/{roomId}`

*Establish a WebSocket connection for a video call.*

Upgrades the HTTP connection to a WebSocket to join a video call room.
Authentication via a `token` query parameter is required.
Clients can send/receive WebRTC signaling messages once connected.

<h3 id="get__ws_zoom_{roomid}-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|roomId|path|string|true|The unique identifier for the video call room to join.|

<h3 id="get__ws_zoom_{roomid}-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|101|[Switching Protocols](https://tools.ietf.org/html/rfc7231#section-6.2.2)|Switching protocols to WebSocket, indicating a successful connection.|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized. The `token` query parameter is missing, invalid, or expired.|None|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|Forbidden. The request's `Origin` header is not in the list of allowed origins.|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearerAuth
</aside>

## get__ws_screenshare_{roomId}

> Code samples

```shell
# You can also use wget
curl -X GET ws://localhost:8080/ws/screenshare/{roomId}

```

```http
GET ws://localhost:8080/ws/screenshare/{roomId} HTTP/1.1
Host: localhost:8080

```

```javascript

fetch('ws://localhost:8080/ws/screenshare/{roomId}',
{
  method: 'GET'

})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```ruby
require 'rest-client'
require 'json'

result = RestClient.get 'ws://localhost:8080/ws/screenshare/{roomId}',
  params: {
  }

p JSON.parse(result)

```

```python
import requests

r = requests.get('ws://localhost:8080/ws/screenshare/{roomId}')

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','ws://localhost:8080/ws/screenshare/{roomId}', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("ws://localhost:8080/ws/screenshare/{roomId}");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "ws://localhost:8080/ws/screenshare/{roomId}", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /ws/screenshare/{roomId}`

*Establish a WebSocket connection for screen sharing.*

Upgrades the HTTP connection to a WebSocket to join a screen share session.
Authentication via a `token` query parameter is required.

<h3 id="get__ws_screenshare_{roomid}-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|roomId|path|string|true|The unique identifier for the screen sharing room to join.|

<h3 id="get__ws_screenshare_{roomid}-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|101|[Switching Protocols](https://tools.ietf.org/html/rfc7231#section-6.2.2)|Switching protocols to WebSocket.|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized. The `token` query parameter is missing, invalid, or expired.|None|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|Forbidden. The request's `Origin` header is not in the list of allowed origins.|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearerAuth
</aside>

## get__ws_chat_{roomId}

> Code samples

```shell
# You can also use wget
curl -X GET ws://localhost:8080/ws/chat/{roomId}

```

```http
GET ws://localhost:8080/ws/chat/{roomId} HTTP/1.1
Host: localhost:8080

```

```javascript

fetch('ws://localhost:8080/ws/chat/{roomId}',
{
  method: 'GET'

})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```ruby
require 'rest-client'
require 'json'

result = RestClient.get 'ws://localhost:8080/ws/chat/{roomId}',
  params: {
  }

p JSON.parse(result)

```

```python
import requests

r = requests.get('ws://localhost:8080/ws/chat/{roomId}')

print(r.json())

```

```php
<?php

require 'vendor/autoload.php';

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('GET','ws://localhost:8080/ws/chat/{roomId}', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```

```java
URL obj = new URL("ws://localhost:8080/ws/chat/{roomId}");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("GET");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```

```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("GET", "ws://localhost:8080/ws/chat/{roomId}", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```

`GET /ws/chat/{roomId}`

*Establish a WebSocket connection for text chat.*

Upgrades the HTTP connection to a WebSocket to join a text chat room.
Authentication via a `token` query parameter is required.

<h3 id="get__ws_chat_{roomid}-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|roomId|path|string|true|The unique identifier for the chat room to join.|

<h3 id="get__ws_chat_{roomid}-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|101|[Switching Protocols](https://tools.ietf.org/html/rfc7231#section-6.2.2)|Switching protocols to WebSocket.|None|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized. The `token` query parameter is missing, invalid, or expired.|None|
|403|[Forbidden](https://tools.ietf.org/html/rfc7231#section-6.5.3)|Forbidden. The request's `Origin` header is not in the list of allowed origins.|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearerAuth
</aside>

