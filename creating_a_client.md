# Deciding to make or modify a client

So you've decided that you want to make a client (or modify an existing one), luckily because the server is open source (and server owners should tell you if they've modify the server instance) it's quite easy. 

However, instead of reverse engineering the existing client and server, we provide easy documentation of how unmodified servers work so you know how to make a client.

# First steps

TermTalk is a socket.io chat app, so you'll need to understand how that works first. They're quite well documented and shouldn't take long to pick up.

The first thing you'll want to handle is authorization and registering/logging in. Users are able to register for servers and create unique names called `UIDs` that they log in with. They also get to choose a non-unique `username` and a `tag`. Username/tag combos are unique per user as well. They should also provide a secure `password` which is salted and hashed on the server's side to ensure good user security.

**These all assume you're connected to the server (all handled by socket.io, so make sure you know how it works).**

#### Connecting

Connecting is pretty straightforward, but can produce an error if the server is full.

When the socket connects, it should listen for a `methodResult` event from the server (regardless of if it does, if the success would have been false, the socket will close) this event will contain the data for un/successful connections.

If the connection is good and able to connect (the server isn't full), the server will emit a `methodResult` with `success: true` in the data and `method: "connect"`.

A successful connect will look like this:
```js
{
  success: true,
  method: "connect",
  type: "success",
  message: "Successfully connected."
}
```
However, in the result of an unsuccessful connection, the server will emit a `methodResult` with `success: false` and `method: "connect"` in the data.

It tends to look like this:
```js
{
  success: false,
  method: "connect",
  type: "maxSlots",
  message: "The server is currently full. Try again later."
}
```
You can choose to display the message, or make your own and check the `type`.

#### Registering

Once you connect to a server, you'll quicky realize you can't do anything until you are successfully authorized and obtain a `sessionID`. So you'll need to allow users to register with the client. In order to do this, it's really simple. First, you'll have to prompt users for 4 things: `UID` (unique account name), `Username`, `Tag`, and a `Password`. Once you obtain this information in whatever way you choose to, you need to emit a `register` event to the server with that data as a javascript object.

The data you send should look something like this:
```js
{
  uid: "AwesomeSauce",
  username: "SlickSauce",
  tag: "4560",
  password: "Saucey"
}
```

If registering is `successful`, the server will emit an event called `authResult` with data such as:
```js
{
  success: true,
  method: "register",
  type: "success",
  message: "Registered successfully.",
  user: {
    uid: "AwesomeSauce",
    username: "SlickSauce",
    tag: "4560",
    id: 10704219761807360,
    sessionID: "61890e5a66b07491504c"
  }
}
```
The main part you should focus on is the `user` property as it contains the `sessionID` you'll need to remember for this session only (**session ids are refreshed on every new connect except reconnects**), however the other data there is helpful to know if the registration was successful, such as `id`. It isn't used (currently) but will be used for server-side execution in the future.

A `failed` register will emit the same event (`authResult`) with other data. The main part you'll need to look at is the `success` property, but a standard (user caused) failed register will look like this:
```js
{
  success: false,
  method: "register",
  type: "invalidTag",
  message: "The client provided an invalid tag, or one above 4 characters."
}
```
This is the standard object for a failed register (specifially one for an invalid tag), **a failed register will always return `success: false`**. However, there are other `type`s of failures, such as `insufficientData` (the client didn't provide the necessary data), `userExists`, and `serverError`. The method will **always** be `register` and the `message` will be helpful to display to a user if you don't make your own.

To know where to go from there, check out [the after register/login](#after-register-or-login) section.

#### Logging in

If a user is already registered, they can log in. You should provide this as an option in your client when making it. Logging in is much like registering, but you send only 2 pieces of data: `UID` and `Password`.

You should ask users for their UID and Password, in whatever way you choose, and emit a `login` event with the aforementioned data.

The data that you send to the server should look like this:
```js
{
  uid: "AwesomeSauce",
  password: "Saucey"
}
```

If logging in is `successful`, the server will emit the same event as logging in (`authResult`) with the almost exact same data, but with a different method and message.

However, it should look like this:
```js
{
  success: true,
  method: "login",
  type: "success",
  message: "Logged in successfully.",
  user: {
    uid: "AwesomeSauce",
    username: "SlickSauce",
    tag: "4560",
    id: 10704219761807360,
    sessionID: "ec2b3298dc836bbebcd4"
  }
}
```
Much like registering, you'll want to save the **entire** `user` object as it's required for a lot of server-side authorization.

However, if logging in is `unsuccessful` you will receive an `authResult` with `success: false` in the data. Also like registering, the method will **always** be `login`

The most common type of failure is `userCredentialsWrong` where the password of the user does not match the saved hash. It will look like this:
```js
{
  success: false,
  method: "login",
  type: "userCredentialsWrong",
  message: "The user's credentials are wrong."
}
```
There are other `type`s of failures, such as `userAlreadyConnected`, `userBanned`, `userNotExists`, and `serverError`. They will all contain `success: false`, and a `message` along side of the `type` and `method`

To know where to go from there, check out [the after register/login](#after-register-or-login) section.


#### After Register or Login

Now that you've had a successful login, you'll want to save the `user` object the server returns when it emits `authResult`. These are important to sending messages and authorization.


##### Sending messages

The main thing the client will do is sending messages. While not as simple as sending a message to the server, it isn't hard. When your client attempts to send a message, it needs to emit a `msg` event to the server with data like:
```js
{ 
  msg: "Wacky message", 
  username: "SlickSauce", 
  tag: "4560", 
  uid: "AwesomeSauce",
  id: 10704219761807360,
  sessionID: "ec2b3298dc836bbebcd4"
}
```
Everything in the above is required data (changing all the values to the proper values, though).

If the message is successful at being sent, the server won't send a methodResult, instead (if the message isn't a server command, read more [here](#on-the-topic-of-server-commands)) the server will simply emit `msg` to all connected clients with the exact same data, but disregarding anything that isn't `msg`, `username`, `tag`, `id`, or `uid`. It is recommened to only log the client's message to the client if the server sends this back to them.

However, the message may can be unsuccessful in sending. Assuming the message isn't a command, it can fail with any one of these `type`s: `insufficientData` (missing any of the required information), `invalidSessionID`, `invalidDataTypes` (any of the required data aren't of type `string`), `userIsLurking` (for more info on lurking, check out [lurking](#lurking)), `messageTooBig`, `serverLocked`, or `noMessageContent`.

On a unsuccessful message send, you will always get `success: false` and `method: "messageSend"`, however the `message` and `type` can change. An example of a `messageTooBig` error would be:
```js
{
  success: false,
  method: "messageSend",
  type: "messageTooBig",
  message: `The message the client attempted to send was above XXXX characters.`
}
```
(`XXXX` is the server's custom character limit)

##### Emitting a method

The `method` event is widely used, and there are 2 types of data that are always required, `uid` and `sessionID`. If these aren't included, you will always get this data:
```js
{
  success: false,
  method: "XXXX",
  type: "insufficientData",
  message: "The client did not return any or enough data."
}
```
Where `XXXX` is the method you attempted.

The event requires a correct `sessionID` or you will get an `invalidSessionID` as a `methodResult` with the `method` being whatever method you attempted.

##### Getting and updating the member list

When you first connect and get the user data, you should emit a `method` event with the data:
```js
{
  type: "clientRequest",
  method: "getMemberList",
  username: "SlickSauce", 
  tag: "4560", 
  uid: "AwesomeSauce",
  id: 10704219761807360,
  sessionID: "ec2b3298dc836bbebcd4"
}
```
Substituting the user data as necessary.

If this is successful, the server will emit a `methodResult` event with the data:
```js
{
  success: true,
  method: "getMemberList",
  type: "success",
  message: "Successfully received the member list.",
  memberList: []
}
```
The `memberList` will contain all connected members (in the user's connected channel) as an object with `username`, `tag`, `id`, `uid`, `admin`, `bot` properties **lurkers are not shown, instead if there are any lurkers ([lurking](#lurking)), the key will be `lurkers` and the value will be lurkers message. However, if this fails, usually due to a server error, you will get this data instead:
```js
{
  success: false,
  method: "getMemberList",
  type: "unableToGetMemberList",
  message: "The server was unable to get the member list."
}
```

If it is successful, however, you should update your member list accordingly.

##### Getting the channel list

As of version 0.4.0, servers can set up channels. Getting the channel list is exactly like getting the member list, but some stuff is changed, the `method` should be `getChannelList` and it should look like:
```js
{
  type: "clientRequest",
  method: "getChannelList",
  username: "SlickSauce", 
  tag: "4560", 
  uid: "AwesomeSauce",
  id: 10704219761807360,
  sessionID: "ec2b3298dc836bbebcd4"
}
```
There is no coded way this can return anything other than a `success: true` method result, but it is worth noting that servers can modify their server instances.

If everything goes well, you'll get a `methodResult` that looks like this:
```js
{
  success: true,
  method: "getChannelList",
  type: "success",
  message: "Successfully received the channel list.",
  channelList: []
}
```

##### Properly reconnecting

Because of how unmodified servers work, just listening for a `reconnect` event will not be enough for the server. On any successful connect, **the server** will emit an event called `getUserData`, if your client has the data of the user (meaning the connection was actually a reconnect), your client should emit a `returnUserData` event to the server with the data returned from the login or register (that you should've saved somewhere). 

In the unmodified client, this is as simple as
```js
socket.on("getUserData", () => {
  socket.emit("returnUserData", user)
})
```
If you don't do something similar, your `sessionID` will be forgotten by the server and you will always get an `invalidSessionID` error.

###### NOTICE:

**As of version 0.4.0, this only works for up to 5 minutes after disconnect (on unmodified server instances).** Users will **always** be reconnected to the main channel usually called General.

##### Getting the message history

On connect, if history saving is enabled, the server will emit a `method` with `type: "serverRequest"` and `method: "sendChatHistory"` to your client. The chat history will be in mapped to a key called `history` and will include up to, on a non-modified server instance, 100 messages. Newer messages always come later in the array. One message in the array would look like this:
```js
{
  timestamp: 1592200641237,
  username: "SlickSauce",
  channel: "General",
  tag: "4560",
  msg: "TACOS!",
  bot: false,
  userID: 10704219761807360,
  id: 108056472374664,
  uid: "AwesomeSauce"
}
```

##### On the topic of server commands

While this is one of the things servers are likely to change, commands generally work the same (server commands, we cannot document how you decide to make client commands).

When a client does a server command, a `msg` event will **not** be emitted (on success) to all users (on non-modified server instances), instead the command that the server admins have programmed will execute. Some servers will only allow `admins` to do certain commands, if that's the case, the server will send a message privately to the client telling them they don't have permission. If the command is successful at running, the server will **most likely** privately message the client, but on modified servers, this cannot be guaranteed. 

##### Lurking

Lurking, on lurk enabled servers, allows a user to be "invisible" and does not show their name on the member list, instead shows that there are lurkers in the chat. Users that are lurking are unable to send messages to everyone, but can still use server commands (and if your client has any, most likely, client commands). On a successful lurk, the member list will be updated for all users, and the user will enter a lurking state. 

If the server does not allow lurking, the server will emit a `methodResult` with `success: false`, `method: "lurkAttempt"`, and `type: "disallowedByServer"` being the most likely data sent through the event, along with a `message`.

# The server list

As of version 0.3.0, there is now a public server list accessible to all. To know how to make a public server, check out the server repo's creating a public server file. However if you want to get the server list, it's accessible to everyone. Simply make a `GET` request to `http://servers.termtalk.app/list`. It will return a JSON array of servers that are publicly listed. You can display it to users however you want, though.

### Note: Pinging servers

Along with the server list, version 0.3.0 also includes a new way to `ping` servers that haven't manually disabled it. This returns data of the server such as their name, max slots, currently connected number of users, port, and their ip to connect to the server (which if you pinged it, you already had). To ping a server make a `GET` request to the server but with the path `/ping`. In this example, this URL would ping the Hub server: `http://hub.termtalk.app:3000/ping` it'd return data like this:
```js
{
	members: 0,
  maxMembers: 20,
  name: "TermTalk Hub Server",
  port: 3000,
  ip: "hub.termtalk.app"
}
```

##### NOTICES:

* The server list, while monitored, may contain servers with unsavory names. If you believe that it should be removed, join the [discord](https://discord.gg/GBzFGPe) and report it.

* Pinging a server may not always return correct data if the server instance is modified, although we trust users to provide accurate data, be weary of the possibility of spoofing. 