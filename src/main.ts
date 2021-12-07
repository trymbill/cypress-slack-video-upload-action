import * as core from '@actions/core'
import { createReadStream } from 'fs'
import walkSync from 'walk-sync'
import { WebClient } from '@slack/web-api'
import actorMap from './actors'

async function run(): Promise<void> {
  try {
    core.debug('INIT!')
    const token = core.getInput('token')
    const channels = core.getInput('channels')
    const branch = core.getInput('branch')
    const actor = core.getInput('actor')
    const runId = core.getInput('runId')

    core.debug(`Token: ${token}`)
    core.debug(`Channels: ${channels}`)
    core.debug(`Branch: ${branch}`)
    core.debug(`Actor: ${actor}`)

    core.debug('Initializing slack SDK')
    const slack = new WebClient(token)
    core.debug('Slack SDK initialized successfully')

    core.debug('Checking for screenshots from cypress')
    const screenshots = walkSync('tests/e2e/screenshots', {
      globs: ['**/*.png']
    })

    if (screenshots.length <= 0) {
      core.debug('No screenshots found. Exiting!')
      core.setOutput('result', 'No screenshots found!')
      return
    }

    core.debug(
      `Found ${screenshots.length} screenshots`
    )

    core.debug('Sending initial slack message')
    const result = await slack.chat.postMessage({
      text: `<@${actorMap[actor]}> Web branch *${branch}* has test failures, hold tight...`,
      channel: channels
    })

    // TODO: Check why Slack doesn't have the expected results from their API
    //       calls defined as the return type. Maybe a generic is needed?
    const threadID = result.ts as string
    const channelId = result.channel as string

    if (screenshots.length > 0) {
      core.debug('Uploading screenshots...')

      await Promise.all(
        screenshots.map(async screenshot => {
          core.debug(`Uploading ${screenshot}`)

          await slack.files.upload({
            filename: screenshot,
            file: createReadStream(`tests/e2e/screenshots/${screenshot}`),
            thread_ts: threadID,
            channels: channelId
          })
        })
      )

      core.debug('...done!')
    }


    core.debug('Updating message to indicate a successful upload')

    await slack.chat.update({
      ts: threadID,
      channel: channelId,
      text: `<@${actorMap[actor]}> Web branch *${branch}* has test failures.\nScreenshots attached in thread, link to test run: https://github.com/CodaCollection/web/actions/runs/${runId}`
    })

    core.setOutput('result', 'Bingo bango bongo!')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
