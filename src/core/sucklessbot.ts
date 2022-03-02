import * as Discord from "discord.js";
import { EventEmitter } from "events";
import * as fs from "fs";
import { dirname } from "path";
import { DSMod } from "./interface/DSMod";
import { CommandManager } from "./manager/commandmanager";
import { Logger } from "./utils/logger";
const path = dirname(require.main.filename);

/**
 * Discord SucklessBot instance, wooo weee
 *
 * @export
 * @class SucklessBot
 */
export class SucklessBot extends EventEmitter {
	/**
	 * Creates an instance of SucklessBot.
	 *
	 * @param {string} token Your Discord bot token, if not specified, will use one in configuration instead
	 * @paran {string} config Path to your configuration file
	 * @param {boolean} debug Enable debug mode
	 * @param {Discord.ClientOptions} clientOptions Client options, leave 'intents' empty, else if 'intents' are specified, they will override mods intents requirements
	 * @memberof SucklessBot
	 */
	constructor(options?: { token?: string; config?: string; debug?: boolean; clientOptions?: Discord.ClientOptions }) {
		super();
		this.debug = options.debug;
		this.__token = options.token || this.config.token;
		if (options.clientOptions) this.__clientOptions = options.clientOptions;
		if (options.config) this.config = JSON.parse(fs.readFileSync(options.config, "utf8"));

		// debugging
		this.on("debug", (m: string) => (this.debug ? this.logger.debug(m) : undefined));
	}

	/**
	 * SucklessBot's super secret token, DO NOT SHARE THIS !!
	 *
	 * @private
	 * @type {string}
	 * @memberof SucklessBot
	 */
	private __token: string;

	/**
	 * SucklessBot's debug mode (default off)
	 *
	 * @private
	 * @type {boolean | string}
	 * @memberof SucklessBot
	 */
	public debug: boolean | string = false;

	/**
	 * SucklessBot's Client instance, for internal uses
	 *
	 * @private
	 * @type {Discord.Client}
	 * @memberof SucklessBot
	 */
	private __client: Discord.Client;

	/**
	 * SucklessBot's Client options
	 *
	 * @private
	 * @type {Discord.ClientOptions}
	 * @memberof SucklessBot
	 */
	private __clientOptions: Discord.ClientOptions;

	/**
	 * SucklessBot's Command manager instace
	 *
	 * @type {CommandManager}
	 * @memberof SucklessBot
	 */
	public cmdMgr: CommandManager = new CommandManager();

	/**
	 * SucklessBot's Logger instance
	 *
	 * @private
	 * @memberof SucklessBot
	 */
	public logger: Logger = new Logger();

	/**
	 * SucklessBot's configuration, contains token so DO NOT SHARE THIS !!
	 *
	 * @public
	 * @memberof SucklessBot
	 */
	public readonly config = JSON.parse(fs.readFileSync(process.env.SUCKLESS_CONFIG || `${path}/config.json`, "utf-8"));

	/**
	 * SucklessBot's mods collection
	 *
	 * @memberof SucklessBot
	 */
	public readonly mods: DSMod[] = [];

	/**
	 * Get the SucklessBot's client
	 *
	 * @memberof SucklessBot
	 */
	public readonly cli = () => this.__client;

	/**
	 * SucklessBot's startup phase
	 *
	 * @private
	 * @memberof SucklessBot
	 */
	private __init = () => {
		this.logger.log(
			`Platform ${process.platform} ${process.arch} - Node ${process.version.match(/^v(\d+\.\d+)/)[1]}`
		);

		let intents: any = [];

		fs.readdirSync(`${path}/mods`).forEach((item) => {
			// ignore any that isn't javascript
			if (!item.endsWith(".js")) return;

			// temp to load any mods
			const mod: DSMod = require(`${path}/mods/${item}`);
			//if (!mod.command || mod.command.length === 0)
			//	return this.logger.warn(`File mods/${item} is not a valid mod`);

			// ignore disabled
			if (mod.disabled) return;

			// add required intents
			mod.intents.forEach((intent) => {
				if (!intents.includes(intent)) intents.push(intent);
			});

			// add aliases first, then commands
			// to prevent aliases overlapping base commands
			this.cmdMgr.register(mod);
			this.mods.push(mod);

			// mod's init phase (if any)
			if (mod.onInit)
				try {
					mod.onInit(this);
				} catch (e) {
					this.logger.error(`[${mod.name}] ${e}\n${e.stack}`);
				}

			// logger
			this.logger.log(`[LOADER] Loaded mod: ${mod.name} (${item})`);
			if (mod.aliases) this.logger.log(`- ${mod.name} registered Aliases: ${mod.aliases?.toString()}`);
			this.logger.log(`- ${mod.name} registered Commands: ${mod.command?.toString()}`);
			this.logger.log(`- ${mod.name} requested Intents: ${mod.intents}`);
		});

		// if bot is configured with intents, use those instead
		if (this.__clientOptions.intents.toString() !== "") intents = this.__clientOptions.intents;

		this.logger.log(`Requested Intents: ${intents}`);
		this.logger.log(
			`Allowed Intents: ${intents} ${
				this.__clientOptions.intents.toString() !== "" ? `(as in SucklessBot options)` : `(from mods)`
			}`
		);
		this.__client = new Discord.Client(Object.assign({}, this.__clientOptions, { intents: intents }));
	};

	/**
	 * Start the SucklessBot instance
	 *
	 * @memberof SucklessBot
	 */
	public start() {
		this.__init();
		this.__client.login(this.__token);
		this.__client.on("ready", this.__onConnect.bind(this));
		this.__client.on("messageCreate", this.__onMessage.bind(this));
		this.__client.on("messageDelete", this.__onDelete.bind(this));
		this.__client.on("messageUpdate", this.__onUpdate.bind(this));
		if (this.debug === "full") this.__client.on("debug", (e) => this.logger.debug(e));
	}

	/**
	 * Triggers when SucklessBot successfully connects to Discord
	 *
	 * @private
	 * @memberof SucklessBot
	 */
	private __onConnect = async () => {
		this.logger.log(`SucklessBot connected as ${this.__client.user.tag}`);
	};

	/**
	 * Triggers when SucklessBot receives a message
	 *
	 * @private
	 * @param {Discord.Message} message Chat message
	 * @memberof SucklessBot
	 */
	private __onMessage = (message: Discord.Message) => {
		// if doesn't start with prefix
		if (!message.content.startsWith(this.config.prefix))
			return this.mods.forEach((mod) => {
				try {
					if (mod.onMsgCreate) mod.onMsgCreate(message, undefined, this);
				} catch (e) {
					this.logger.error(`[${mod.name}] ${e}\n${e.stack}`);
				}
			});

		const msg = message.content.replace(this.config.prefix, "").trim();
		const arg = msg.split(/ +/);
		const cmd = arg.shift().toLocaleLowerCase(); // command

		// if command not found, process it as a normal message
		if (!this.cmdMgr.getMod(cmd))
			return this.mods.forEach((mod) => {
				try {
					if (mod.onMsgCreate) mod.onMsgCreate(message, undefined, this);
				} catch (e) {
					this.logger.error(`[${mod.name}] ${e}\n${e.stack}`);
				}
			});

		const mod = this.cmdMgr.getMod(cmd);
		if (mod.onMsgCreate)
			try {
				mod.onMsgCreate(message, arg, this);
			} catch (e) {
				this.logger.error(`[${mod.name}] ${e}\n${e.stack}`);
			}
	};

	/**
	 * Triggers when SucklessBot detects a deleted message
	 *
	 * @private
	 * @param {Discord.Message} message
	 * @memberof SucklessBot
	 */
	private __onDelete = (message: Discord.Message) => {
		const mods: DSMod[] = [];
		this.mods.forEach((mod) => {
			if (!mods.includes(mod)) mods.push(mod);
		});
		mods.forEach((mod) => {
			if (mod.onMsgDelete)
				try {
					mod.onMsgDelete(message, message.content.split(/ +/), this);
				} catch (e) {
					this.logger.error(`[${mod.name}] ${e}\n${e.stack}`);
				}
		});
	};

	/**
	 * Triggers when SucklessBot detects a deleted message
	 *
	 * @private
	 * @param {Discord.Message} old message
	 * @param {Discord.Message} new message
	 * @memberof SucklessBot
	 */
	private __onUpdate = (oldMessage: Discord.Message, newMessage: Discord.Message) => {
		const mods: DSMod[] = [];
		this.mods.forEach((mod) => {
			if (!mods.includes(mod)) mods.push(mod);
		});
		mods.forEach((mod) => {
			if (mod.onMsgUpdate)
				try {
					mod.onMsgUpdate(oldMessage, newMessage, this);
				} catch (e) {
					this.logger.error(`[${mod.name}] ${e}\n${e.stack}`);
				}
		});
	};
}
