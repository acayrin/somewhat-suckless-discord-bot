"use strict";
var discord_js_1 = require("discord.js");
var vote_1 = require("./vote");
module.exports = {
    name: "Vote mute",
    author: "acayrin",
    intents: [
        discord_js_1.Intents.FLAGS.GUILDS,
        discord_js_1.Intents.FLAGS.GUILD_MEMBERS,
        discord_js_1.Intents.FLAGS.GUILD_MESSAGES,
        discord_js_1.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
    command: "votemute",
    aliases: ["vm"],
    description: "Vote somebody cuz democracy is kul",
    usage: "%prefix% %command% <Username>[/<Tag>/<User ID>]]",
    onMsgCreate: vote_1.VM
};
