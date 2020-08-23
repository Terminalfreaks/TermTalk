<strong><p align="center">TermTalk is a simple and straightforward way of talking to your peers in the terminal.</p></strong>
Also note: **THIS PROJECT IS DISCONTINUED. I (TorchedSammy) will not be maintaining this anymore.**  
I kinda got unmotivated and decided to drop the project. Feel free to fork if you want. There is a maintained WebSocket derivative here: https://github.com/Luvella/Voyawa  

An easy CLI interface to just send and receive messages.  
To use TermTalk you can host a server of your own. The server can be located at [this repo](https://github.com/Torchedgarbage/TermTalk-Server) 

# Installation
```
git clone https://github.com/Torchedgarbage/TermTalk
cd TermTalk
npm install
npm link
```  
Now you can run `termtalk`.  
If you don't want to link, the script `termtalk` is available: 
```
npm run termtalk
```  

# Documentation
Here is a bit of the way on how it works. It's a Socket.io server that waits for a connected client to send login information or registration information.  

For a login, it asks for account name and password. Internally account name is called UID.  
For a register it asks for account name, username, tag (like a discord discriminator) and password.  

Once you do either one the server provides you with information to use for sending message and sends you to the authed room.  
The server sends session ID, your username, your tag and account name. You **need** to send session ID or the server will not accept your message and send an error.  

I'll get into more detail with what the server sends later.

Check out [creating a client](creating_a_client.md)
