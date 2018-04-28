const Eris = require('eris')
const Influx = require('influx')

const influx = new Influx.InfluxDB({
  host: 'db',
  database: 'discord',
  schema: [
    {
      measurement: 'timestamps',
      tags: ['channel_name'],
      fields: {
        channel_name: Influx.FieldType.STRING,
        user_id: Influx.FieldType.STRING
      }
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

const channelIds = {
  'hiding-from-the-working-party': '406591537577984002',
}

bot.on('ready', () => {
  bot
    .createMessage(105708217153126400, 'Online and collecting stats :salute:')
    .catch(error => console.error('Error sending message:', error))

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
          tags: { channel_name: message.channel.name },
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

  await bot.createMessage(105708217153126400, 'My process crashed. :salute: I shall return')
    .then(resp => console.log('Crashed message sent...'))
    .catch(error => console.log('Crashed message did not send...'))

  process.exit()
}

process.on('exit', exitHandler.bind(null, { cleanup: true }))
process.on('SIGINT', exitHandler.bind(null, { exit: true }))
process.on('uncaughtException', exitHandler.bind(null, { exit: false }))

module.exports = bot