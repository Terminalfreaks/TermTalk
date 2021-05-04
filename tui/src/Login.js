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

const blessed = require("blessed")
const http = require("http")
const https = require("https")

class LoginTUI {
	static run(socket, connectedIP) {
		const screen = blessed.screen({
			smartCSR: true,
			title: "TermTalk Login"
		})

		const form = blessed.form({
			parent: screen,
			width: "100%",
			left: "center",
			keys: true,
			vi: true
		})

		// Error box
		const error = blessed.box({
			parent: screen,
			left: "center",
			top: 20,
			width: "50%",
			height: "10%",
			content: " ",
			tags: true,
			hidden: true,
			border: {
				type: "line"
			},
			style: {
				fg: "red",
				border: {
					fg: "red"
				}
			}
		})

		// Textbox Labels
		const usernameLabel = blessed.text({
			parent: screen,
			top: 4,
			left: "center",
			content: "Account Name (UID): "
		})
		const passwordLabel = blessed.text({
			parent: screen,
			top: 9,
			left: "center",
			content: "Password: "
		})
		const connectedIPText = blessed.text({
			parent: screen,
			top: 0,
			content: `Connected to ${connectedIP}`
		})

		pingIP(connectedIP).then(t => {
			connectedIPText.setContent(`${t.secure ? "Securely connected" : "Connected"} to ${t.name}.`)
			screen.render()
		})


		// Textboxes
		const username = blessed.textarea({
			parent: form,
			name: "uid",
			top: 5,
			left: "center",
			height: 3,
			width: "40%",
			inputOnFocus: true,
			content: "first",
			border: {
				type: "line"
			}
		})
		const password = blessed.textbox({
			parent: form,
			name: "password",
			top: 10,
			left: "center",
			height: 3,
			width: "40%",
			inputOnFocus: true,
			content: "first",
			border: {
				type: "line"
			},
			censor: true
		})

		// Buttons
		const login = blessed.button({
			parent: form,
			name: "login",
			content: "Login",
			top: 15,
			left: getLeftOffset(form.width, 46),
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
		const register = blessed.button({
			parent: form,
			name: "register",
			content: "Register Instead",
			top: 15,
			left: getLeftOffset(form.width, 60),
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
				bg: "green",
				focus: {
					inverse: true
				}
			}
		})

		login.on('press', () => {
			form.submit();
		})

		register.on("press", () => {
			register.removeAllListeners()
			login.removeAllListeners()
			socket.removeAllListeners()
			form.removeAllListeners()
			require("./Register").run(socket, connectedIP)
			screen.destroy()
		})

		form.on("submit", (data) => {
			if (!data.uid || !data.password) {
				error.content = "{center}Please enter your username and password.{/center}"
				if (error.hidden) {
					error.toggle()
				}
				screen.render()
			} else {
				if (!error.hidden) {
					error.toggle()
					screen.render()
				}
				socket.emit("login", data) // actually login
			}
		})

		socket.on("authResult", (data) => {
			if (!data.success) {
				error.content = "{center}" + data.message + "{/center}"
				if (error.hidden) {
					error.toggle()
				}
				form.reset()
				screen.render()
			} else {
				process.stdout.write("\u001b[2J\u001b[0;0HLoading client...")
				socket.removeAllListeners()
				require("./Client").run(socket, data.user, connectedIP)
				screen.destroy()
			}
		})

		screen.key(["q", "C-c"], () => {
			process.exit();
		})

		screen.render()

		screen.on("resize", () => {
			login.left = getLeftOffset(screen.width, 46)
			register.left = getLeftOffset(screen.width, 60)
		})
	}
}

function getLeftOffset(width, originalOffset) {
	return Math.round((width * originalOffset / 120) + (originalOffset * ((width - 120) / 120) / 4.5))
}

function pingIP(ip) {
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

module.exports = LoginTUI;
