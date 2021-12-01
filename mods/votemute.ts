import { Intents } from "discord.js"
import { VM } from "./vote"

export = {
    name: "Vote mute",
    author: "acayrin",
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
    command: "votemute",
    aliases: [ "vm" ],
    description: "Vote somebody cuz democracy is kul",
    usage: "%prefix% %command% <Username>[/<Tag>/<User ID>]]",
    onMsgCreate: VM
}