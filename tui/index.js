#! /usr/bin/env node
const fs = require("fs")
const Main = require("./src/Main")
const Utils = require("../src/Utils")

if(!Utils.config) fs.appendFileSync(`${require("os").userInfo().homedir}/termtalk/.termtalkconf.json`, JSON.stringify({
	"ips": [],
	"chatColor": "#4bed53",
	"defaultUser": {
		"uid": "",
		"username": "",
		"tag": ""
	}
}))
Main.run()