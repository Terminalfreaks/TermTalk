# The Server API

Server hosts have the option of whether they want to enable the API or not, if they do, it allows for bot user creation and connection. Bots are like user accounts, but are a lot easier to run programmatically than a user, which would involve heavy client modification.

# The library

TermTalk has an officially endorsed library created by its devs to be up to date with the current server version, it's called [Termie](https://github.com/Terminalfreaks/Termie). It will always cover the full API of an unmodified server instance when updated.

# Creating your own library

Before creating a library, you should know how socket.io works and how to properly make http/s requests to a server.

### The server always expects JSON input in POSTs, or url form encoded in GETs if parameters are required, these should always be reflected in your header's Content-Type.

# Creating a bot

First, you should cover the bot create endpoint so users of your library can use it to create a bot. The path to create a bot is `/bots/create` making a `POST` request with the JSON data of:
```js
{
  ownerUid: "AwesomeSauce",
  ownerPassword: "Saucey",
  uid: "BotUid1",
  username: "BotUsername1",
  tag: "0001"
}
```
If correctly authenticated, and no errors are gotten, you'll receive an object that looks like: 
```js
  code: 200,
  message: "Successfully created bot.",
  type: "success",
  method: "botCreate",
  token: "MTU5MjQ0NjMzMzk4OQ==.MTI3MTY4NTI4NTc4MDI3NTI=.$2b$20$YTMV.glC71TzJV6fO2vhMO"
```
The only real important thing to display the user is the token, or their bot could never be used (getting bot's tokens from clients is planned). However, there are multiple types of errors this might return, including: `ownerNotExists`, `ownerCredentialsIncorrect`, `invalidUID`, `invalidUsername`, `userExists`, or a server error.

# Connecting to the server

Connecting to the server is exactly like connecting a user through a client, once connected to the socket, emit a `login` event with the data:
```js
  bot: true,
  token: "MTU5MjQ0NjMzMzk4OQ==.MTI3MTY4NTI4NTc4MDI3NTI=.$2b$20$YTMV.glC71TzJV6fO2vhMO"
```
If the token is right, the bot will be identified and logged in automatically, no uid or username required! If this is successful, you'll get an `authResult` with this data:
```js
  success: true,
  method: "login",
  type: "success",
  message: "Logged in successfully.",
  bot: {
    id: 15476919615613,
    uid: "BotUid1",
    username: "BotUsername1",
    tag: "0001",
    sessionID: "ea5d5b3f1add30d2d930"
  }
```
Make sure to save the session id, as you need it, along with your token, to authenticate. **Bots can only access the API while they have a valid session id and are logged in.**

The rest of these docs will strictly be covering the API endpoints and how to use them. All the further endpoints require a token and a session id, `GET` requests send the id in url form encoded format as `sessionID=x` and `POST` requests send it as json data like `{"sessionID":"x"}` if your session id is invalid, you will get `invalidSessionID`. 

All of the further endpoints can return a `badInput` error type if the input is unexpected.

# Authenticating

To authenticate your bot and use the API after connecting, you must send an Authorization header with the value `Bot BOTTOKEN` or your request will always fail with an unauthorized. If an invalid token is provided, you'll get an `invalidToken` error, server errors might also happen.

# /channels endpoint

If you send a `GET` request to `/channels` the API will return the channel list in an object like
```js
{
  channels: ["General", "Best Channel"],
  code: 200,
  message: "Retrieved channel list.",
  type: "success",
  success: true,
  method: "getChannelList"
}
```

If you send a `POST` request to `/channels/channelname/messages` the bot will post a message to the channel with the name `channelname`, this has the possiblilty of erroring with a `channelNotFound` error or an `insufficientData` error if the not all the data is provided.

The data that is required, along with the session id is:
```js
{
  id: 15476919615613,
  uid: "BotUid1",
  username: "BotUsername1",
  tag: "0001",
  msg: "Funny message"
}
```
if any of these are omitted, you will get `insufficientData` on success, this returns a message that looks like:
```js
{
  id: 15476919616855,
  userID: 15476919615613,
  uid: "BotUid1",
  username: "BotUsername1",
  tag: "0001",
  msg: "Funny message"
}
```
Which is exactly what was sent, except contains `id` which is the message id and `userID` which is the id of the user (bot).

# /members endpoint

A `GET` request to `/members` will return all connected members at the time. You can choose to include a `channel` query option to get members in a specific channel, but by default it returns all connected members. If the `channel` option is present and the channel is not found this will respond with a `channelNotFound` error. If successful, the data will look like this:
```js
{
  members: [],
  code: 200,
  message: "Retrieved member list.",
  type: "success",
  success: true,
  method: "getMemberList"
}
```
`members` would be an array of objects with `username`, `tag`, `id`, `uid`, `admin`, and `bot` properties.

A `POST` to `/members/15476919615613/messages` will send a private message to the member with the id `15476919615613` this may error with `userNotFound` if the id is incorrect. **This takes and returns the same data as `POST`ing to `/channels/name/messages`**