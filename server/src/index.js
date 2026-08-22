import { app } from './app.js'
import { config } from './config.js'

app.listen(config.port, () => {
  console.log(`Senior Concierge API listening on :${config.port} (notifications provider: ${config.notificationsProvider})`)
})
