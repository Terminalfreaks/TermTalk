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

class RegisterTUI {
	static run(socket) {
		const screen = blessed.screen({
			smartCSR: true,
			title: "TermTalk Register"
		})

		const form = blessed.form({
			parent: screen,
			width: "100%",
			left: "center",
			keys: true,
			vi: true
		})

		// Textbox Labels
		const uidLabel = blessed.text({
			parent: screen,
			top: 4,
			left: "center",
			content: "Account Name (UID): "
		})

		const usernameLabel = blessed.text({
			parent: screen,
			top: 9,
			left: "center",
			content: "Username: "
		})

		const tagLabel = blessed.text({
			parent: screen,
			top: 14,
			left: "center",
			content: "Tag (4 or less characters that appear after your name): "
		})

		const passwordLabel = blessed.text({
			parent: screen,
			top: 19,
			left: "center",
			content: "Password: "
		})

		// Textboxes
		const uid = blessed.textarea({
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

		const username = blessed.textarea({
			parent: form,
			name: "username",
			top: 10,
			left: "center",
			height: 3,
			width: "40%",
			inputOnFocus: true,
			content: "first",
			border: {
				type: "line"
			}
		})

		const tag = blessed.textarea({
			parent: form,
			name: "tag",
			top: 15,
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
			top: 20,
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
		const register = blessed.button({
			parent: form,
			name: "register",
			content: "Register",
			top: 25,
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
				bg: "green",
				focus: {
					inverse: true
				}
			}
		})

		// Error box
		const error = blessed.box({
			parent: screen,
			left: "center",
			top: 30,
			width: "18%",
			height: 4,
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

		register.on('press', () => {
			form.submit();
		})

		form.on("submit", (data) => {
			if (!data.uid || !data.password || !data.tag || !data.username) {
				error.content = "{center}Please enter all the information.{/center}"
				error.height = 4
				if (error.hidden) {
					error.toggle()
				}
				form.reset()
				screen.render()
			} else {
				if (!error.hidden) {
					error.toggle()
					screen.render()
				}
				socket.emit("register", data)
			}
		})

		socket.on("auth_result", (data) => {
			if (!data.success) {
				error.content = "{center}" + data.message + "{/center}"
				error.height = 5
				if (error.hidden) error.toggle()
				form.reset()
				screen.render()
			} else {
				register.removeAllListeners()
				form.removeAllListeners()
				socket.removeAllListeners()
				process.stdout.write("\u001b[2J\u001b[0;0HLoading client...")
				require("./Client").run(socket, data.user)
				screen.destroy()
			}
		})

		screen.key(["q", "C-c"], () => {
			process.exit();
		})

		screen.render()
	}
}

module.exports = RegisterTUI;