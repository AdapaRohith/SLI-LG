const { app } = require('./app')
const { config } = require('./config')
const { connectDatabase } = require('./lib/database')

async function start() {
  await connectDatabase()

  app.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`)
  })
}

start()
