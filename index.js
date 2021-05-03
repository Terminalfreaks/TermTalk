#! /usr/bin/env node
/*
    TermTalk - A simple and straightforward way of talking to your peers in the terminal.
    Copyright (C) 2020 Terminalfreaks

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
	THIS PART OF THE CODE, OR THE CLI CLIENT IS DEPRECATED. REFER TO tui/index.js
	WE WILL NOT PROVIDE SUPPORT FOR THIS.
*/

const io = require('socket.io-client')
const fs = require("fs")
const { Input, prompt } = require('enquirer')
const Utils = require("./src/Utils")

const args = process.argv.slice(2).join(" ")
let loggedIn = false

if(!Utils.config) fs.appendFileSync(`${require("os").userInfo().homedir}/termtalk/.termtalkconf.json`, JSON.stringify({
	"ips": [],
	"chatColor": "#4bed53",
	"defaultUser": {
		"uid": "",
		"username": "",
		"tag": ""
	}
}))
if(args.includes("--tui")) return require("./tui/index.js")

process.title = "TermTalk"

new Input({
	name: "ip",
	message: "IP to connect to (with port)."
}).run().then(ip => {
	socket = io(ip.startsWith("http") ? ip : `http://${ip}`)
	run()
})

function run() {
	let user;
	socket.on('connect', async () => {
		if (!loggedIn) {
			console.log(`Connected to the server.`)
			try {
				const ans = await prompt({
					type: "select",
					name: "checkpoint",
					message: "What would you like to do?",
					choices: ["Register", "Login"]
				})

				if (ans.checkpoint === "Register") {
					_register()
				} else {
					_login()
				}
			} catch (err) {
				console.error(err)
				process.exit(0)
			}

			socket.on("authResult", (data) => {
				if (!data.success) {
					console.log("\u001b[31;1m" + data.message + "\u001b[0m")
					if (data.method === "login") {
						_login()
					} else {
						_register()
					}
				} else {
					loggedIn = true
					console.log("\u001b[32m" + data.message + "\u001b[0m")
					user = data.user
					_awaitMessage()
				}
			})

			socket.on("methodResult", (data) => {
				if (!data.success) {
					console.log("\u001b[31;1m" + data.message + "\u001b[0m")
				}
			})
		} else {
			_logPromptPrefix()
		}

		socket.on("disconnect", () => {
			console.log(`Client > You have been disconnected.`)
		})

		socket.on("reconnect", (attempt) => {
			console.log(`Client > Reconnected after ${attempt} attempt(s).`)
		})

		socket.on("reconnect_attempt", (attempt) => {
			console.log(`Client > Attempting reconnect. #${attempt}`)
		})

		socket.on('msg', (data) => {
			console.log(`\u001b[1A\u001b[${process.stdout.columns}D\u001b[2K${data.username}#${data.tag} > ${data.msg}`)
			_logPromptPrefix()
		})

		socket.on("getUserData", () => {
			socket.emit("returnUserData", user)
		})

		process.on("beforeExit", () => {
			socket.close(true)
		})
	})

	async function _awaitMessage() {
		try {
			let { msg } = await prompt({ type: "input", name: "msg", message: `\u001b[${process.stdout.columns}D\u001b[2K` })
			socket.emit("msg", { msg, uid: user.uid, username: user.username, tag: user.tag, sessionID: user.sessionID })
			_awaitMessage()
		} catch (e) {
			console.error(e)
			process.exit(0)
		}
	}

	async function _login() {
		try {
			const login = await prompt([
				{
					type: "input",
					name: "uid",
					message: "UID (Account Name)?"
				},
				{
					type: "password",
					name: "password",
					message: "Password?"
				}
			])
			socket.emit("login", login)
		} catch (e) {
			console.error(e)
			process.exit(0)
		}
	}
	async function _register() {
		try {
			const reg = await prompt([
				{
					type: "input",
					name: "uid",
					message: "What do you want your Account Name (UID) to be? (This is used to login.)"
				},
				{
					type: "input",
					name: "username",
					message: "Username?"
				},
				{
					type: "input",
					name: "tag",
					message: "Tag? (This will appear after your name. 4 characters.)"
				},
				{
					type: "password",
					name: "password",
					message: "Password?"
				}
			])
			socket.emit("register", reg)
		} catch (e) {
			console.error(e)
			process.exit(0)
		}
	}

	function _logPromptPrefix() {
		console.log(`»`)
	}
}