const Eris = require('eris')
const Influx = require('influx')

const {
  USMC_SERVER_ID,
  ROLE_MODERATOR_ID,
} = require('./helpers/constants')

const influx = new Influx.InfluxDB({
  host: 'db',
  database: 'discord',
  schema: [
    {
      measurement: 'timestamps',
      tags: ['channel_name', 'user_id'],
      fields: {
        channel_name: Influx.FieldType.STRING,
        user_id: Influx.FieldType.STRING
      }
    },
    {
      measurement: 'mods_onliine',
      tags: [],
      fields: { count: Influx.FieldType.INTEGER }
    },
    {
      measure: 'members_online',
      tags: [],
      fields: { count: Influx.FieldType.INTEGER }
    }
  ]
})

influx.getDatabaseNames()
  .then(async (names) => {
    if (!names.includes('discord')) {
      await influx.createDatabase('discord')
    }
  })

const BOT_ID = '439843672478056448'

const bot = new Eris(process.env.DISCORD_TOKEN)

let modUpdateTimer, memberCountTimer

const countOnlineModerators = async () => {
  try {
    const modsOnline = bot
      .guilds
      .find(guild => guild.id === USMC_SERVER_ID)
      .members
      .filter(member => member.status === 'online' && member.roles.includes(ROLE_MODERATOR_ID))
      .length

    influx.writePoints([{ measurement: 'mods_online', fields: { count: modsOnline } }])
  } catch (error) {
    console.error('Error updating the number of mods online:', error)
  }
}

const countOnlineMembers = async () => {
  try {
    const memberCount = bot
      .guilds
      .find(guild => guild.id === USMC_SERVER_ID)
      .members
      .filter(member => member.status === 'online')
      .length

    influx.writePoints([{ measurement: 'members_online', fields: { count: memberCount } }])
  } catch (error) {
    console.error('Error updating the number of members:', error)
  }
}

bot.on('ready', () => {
  clearInterval(modUpdateTimer)
  clearInterval(memberCountTimer)

  modUpdateTimer = setInterval(() => countOnlineModerators(), 1000 * 60)
  memberCountTimer = setInterval(() => countOnlineMembers(), 1000 * 60)

  console.log('Connected and collecting stats.')
})

bot.on('messageCreate', async (message) => {
  // Ignore self
  if (message.author.id === BOT_ID) return

  try {
    await influx
      .writePoints([
        {
          measurement: 'timestamps',
          tags: { channel_name: message.channel.name, user_id: message.author.id },
          fields: { user_id: message.author.id }
        }
      ])
  } catch (error) {
    console.error('Error writing message stat to influx:', error, message)
  }
})

const exitHandler = async (opts, err) => {
  if (opts.cleanup) console.log('clean')
  if (err) console.log(err.stack)
  if (opts.exit) process.exit()

  process.exit()
}

process.on('exit', exitHandler.bind(null, { cleanup: true }))
process.on('SIGINT', exitHandler.bind(null, { exit: true }))
process.on('uncaughtException', exitHandler.bind(null, { exit: false }))

module.exports = bot