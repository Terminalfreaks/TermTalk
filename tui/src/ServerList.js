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

const http = require("http")
const https = require("https")
const blessed = require("blessed")
const contrib = require("blessed-contrib")
const io = require("socket.io-client")
const Login = require("./Login")
const Utils = require("../../src/Utils")

class ServerList {
	static publicServers = []
	static names = []

	static run() {
		// launches initial screen
		const screen = blessed.screen({
			smartCSR: true,
			title: "TermTalk Servers"
		})

		const form = blessed.form({
			parent: screen,
			width: "100%",
			height: "100%",
			left: "center",
			keys: true,
			vi: true
		})

		const servers = blessed.list({
			parent: form,
			top: 0,
			left: 'center',
			width: "98%",
			height: "88%",
			items: [],
			tags: true,
			keys: true,
			scrollable: true,
			border: {
				type: "line"
			},
			style: {
				selected: {
					fg: "white",
					bg: "blue"
				},
				border: {
					fg: "blue"
				}
			}
		})

		blessed.text({
			parent: form,
			top: 0,
			left: "center",
			content: "Public Servers"
		})

		const back = blessed.button({
			parent: form,
			name: "back",
			content: "Back",
			top: "90%",
			left: "center",
			shrink: true,
			padding: {
				top: 1,
				bottom: 1,
				left: 2,
				right: 2,
			},
			style: {
				bold: true,
				fg: "white",
				bg: "blue",
				focus: {
					inverse: true
				}
			}
		})
		// fetches the public list
		this._getList().then(async list => {
			for (let i = 0; i < list.length; i++) {
				this.addOrUpdateServer(this._pingIP(list[i]), screen, servers)
			}
		})
		// every 5sec check for server status- remove from list if offline/errored
		let interval = setInterval(() => {
			this._getList().then(async list => {
				for (let i = 0; i < list.length; i++) {
					this.addOrUpdateServer(this._pingIP(list[i]), screen, servers)
				}
			})
		}, 5000)

		back.on("press", () => {
			clearInterval(interval)
			screen.destroy()
			this.names = []
			servers.setItems([])
			require("./Main").run()
		})

		screen.key(["q", "C-c"], () => {
			process.exit();
		})

		screen.render()

		servers.on("select", (data, index) => {
			if (index == -1) index = 0
			let ip = this.publicServers[index]
			let secure = this.names[index].endsWith("Secure")
			const reconnectionAttempts = 5
			let socket = secure ? io(ip.startsWith("https") ? ip : `https://${ip}`, { timeout: 5000, reconnectionAttempts, secure }) : io(ip.startsWith("http") ? ip : `http://${ip}`, { timeout: 5000, reconnectionAttempts })

			process.stdout.write("\u001b[0;0HConnecting...")

			let attempt = 0

			socket.on("connect_error", () => {
				process.stdout.write(`\u001b[0;0HUnable to establish connection to the server. Attempt ${++attempt}/${reconnectionAttempts}.`)
				if (attempt == reconnectionAttempts) {
					process.stdout.write(`\u001b[0;0H\u001b[2KUnable to establish a connection to the server after ${attempt} attempts.`)
					socket.close(true)
					socket.removeAllListeners()
				}
			})

			socket.on('connect', () => {
				// check if the connection was a success
				socket.on("methodResult", (d) => {
					// if not a success, display error
					if (!d.success) {
						error.content = `{center}${d.message}{/center}`
						if (error.hidden) {
							error.toggle()
						}
						screen.render()
					} else {
						clearInterval(interval) // stop pinging servers in the list
						Utils.addToIps(ip) // add current server ip to saved list on successful connect
						socket.removeAllListeners()
						this.names = [] // clear (displayed) server list
						servers.setItems([])
						Login.run(socket, ip) // login
						screen.destroy() // switch to login screen
					}
				})
			})
		})
	}

	static _getList() {
		// fetch public server list
		// returns list of public servers in JSON format
		return new Promise((resolve, reject) => {
			https.get("https://linkedweb.org/list", res => {
				const status = res.statusCode
				if (status === 200) {
					res.setEncoding("utf8")
					let raw = ""

					res.on("data", (d) => raw += d)

					res.on("end", () => {
						try {
							return resolve(JSON.parse(raw))
						} catch (e) {
							return reject(e)
						}
					})
				}
			})
		})
	}

	static _pingIP(ip) {
		// pings a server IP to get the returned server status data
		// data returned is correctly assumed by name
		return new Promise((resolve) => {
			https.get(`https://${ip}/ping`, res => {
				const status = res.statusCode
				if (status === 200) {
					res.setEncoding("utf8")
					let raw = ""

					res.on("data", (d) => raw += d)

					res.on("end", () => {
						try {
							return resolve(JSON.parse(raw))
						} catch (e) {
							return resolve({
								name: ip,
								ip: ip.split(":")[0],
								port: ip.split(":")[1],
								members: "unk",
								maxMembers: "unk"
							})
						}
					})
				}
			}).on("error", () => {
				// if https fails, attempt http
				http.get(`http://${ip}/ping`, res => {
					const status = res.statusCode
					if (status === 200) {
						res.setEncoding("utf8")
						let raw = ""

						res.on("data", (d) => raw += d)

						res.on("end", () => {
							try {
								return resolve(JSON.parse(raw))
							} catch (e) {
								return resolve({
									name: ip,
									ip: ip.split(":")[0],
									port: ip.split(":")[1],
									members: "unk",
									maxMembers: "unk"
								})
							}
						})
					}
				}).on("error", () => {
					// if everything fails, don't act like nothing happened,
					// show the default.
					return resolve({
						name: ip,
						ip: ip.split(":")[0],
						port: ip.split(":")[1],
						members: "unk",
						maxMembers: "unk"
					})
				})
			})
		})
	}

	static addOrUpdateServer(serverPromise, screen, servers) {
		// uses fetched public server list and adds/removes them
		serverPromise.then(server => {
			if (!server) return
			// Removes "dead" servers
			// Dead servers are identified by the non-broadcast of member count
			if (server.members == "unk") {
				let index = this.publicServers.findIndex(t => t == `${server.ip}:${server.port}`)
				if (index != -1) {
					this.publicServers.splice(index, 1)
					this.names.splice(index, 1)
				}
				servers.setItems(this.names)
				screen.render()
				return
			}
			// If the public server isn't dead, add it to the public server list
			let index = this.publicServers.findIndex(t => t == `${server.ip}:${server.port}`)
			if (index != -1) {
				// if it exists, update it
				this.names[index] = `${server.name} : ${server.members}/${server.maxMembers} ${server.secure ? "Secure" : ""}`
				this.publicServers[index] = `${server.ip}:${server.port}`
			} else {
				// if it doesn't exist, add it
				this.names.push(`${server.name} : ${server.members}/${server.maxMembers} ${server.secure ? "Secure" : ""}`)
				this.publicServers.push(`${server.ip}:${server.port}`)
			}
			// display servers in blessed
			servers.setItems(this.names)
			// render screen
			screen.render()
		}).catch(server => {
			// if for some reason the server data is incorrect, remove it from the list
			let index = this.publicServers.findIndex(t => t == `${server.ip}:${server.port}`)
			if (index != -1) {
				this.publicServers.splice(index, 1)
				this.names.splice(index, 1)
			}
			servers.setItems(this.names)
			screen.render()
		})
	}
}

module.exports = ServerList;
