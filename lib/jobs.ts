import PgBoss from 'pg-boss'

let boss: PgBoss | null = null

export async function getJobQueue(): Promise<PgBoss> {
  if (boss) {
    return boss
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined')
  }

  boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
  })

  await boss.start()

  // Set up job handlers
  await setupJobHandlers(boss)

  return boss
}

async function setupJobHandlers(boss: PgBoss) {
  // Check for stale nodes
  await boss.schedule('check-stale-nodes', '0 */6 * * *', {}, {
    tz: 'UTC',
  })

  await boss.work('check-stale-nodes', async () => {
    // TODO: Implement stale node detection
    console.log('Checking for stale nodes...')
  })

  // Check for approaching deadlines
  await boss.schedule('check-deadlines', '0 9 * * *', {}, {
    tz: 'UTC',
  })

  await boss.work('check-deadlines', async () => {
    // TODO: Implement deadline checking
    console.log('Checking for approaching deadlines...')
  })

  // Sync data sources
  await boss.schedule('sync-datasources', '0 */4 * * *', {}, {
    tz: 'UTC',
  })

  await boss.work('sync-datasources', async () => {
    // TODO: Implement data source sync
    console.log('Syncing data sources...')
  })
}

export async function stopJobQueue() {
  if (boss) {
    await boss.stop()
    boss = null
  }
}
