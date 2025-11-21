import * as core from '@actions/core'
import { createReadStream } from 'fs'
import walkSync from 'walk-sync'
import { WebClient } from '@slack/web-api'

async function run(): Promise<void> {
  try {
    core.debug('INIT!')
    const token = core.getInput('token')
    const channels = core.getInput('channels')
    const workdir = core.getInput('workdir') || 'cypress'
    const messageText =
      core.getInput('message-text') ||
      "A Cypress test just finished. I've placed the screenshots and videos in this thread. Good pie!"

    core.debug(`Token: ${token}`)
    core.debug(`Channels: ${channels}`)
    core.debug(`Message text: ${messageText}`)

    core.debug('Initializing slack SDK')
    const slack = new WebClient(core.getInput('token'))
    core.debug('Slack SDK initialized successfully')

    core.debug('Checking for videos and/or screenshots from cypress')
    const videos = walkSync(workdir, { globs: ['**/*.mp4'] })
    const screenshots = walkSync(workdir, { globs: ['**/*.png'] })

    if (videos.length <= 0 && screenshots.length <= 0) {
      core.debug('No videos or screenshots found. Exiting!')
      core.setOutput('result', 'No videos or screenshots found!')
      return
    }

    core.debug(
      `Found ${videos.length} videos and ${screenshots.length} screenshots`
    )

    core.debug('Sending initial slack message')
    const result = await slack.chat.postMessage({
      text: "I've got test results coming in from Cypress. Hold tight ...",
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
            file: createReadStream(`${workdir}/${screenshot}`),
            thread_ts: threadID,
            channels: channelId
          })
        })
      )

      core.debug('...done!')
    }

    if (videos.length > 0) {
      core.debug('Uploading videos...')

      await Promise.all(
        videos.map(async video => {
          core.debug(`Uploading ${video}`)

          await slack.files.upload({
            filename: video,
            file: createReadStream(`${workdir}/${video}`),
            thread_ts: threadID,
            channels: channelId
          })
        })
      )

      core.debug('...done!!')
    }

    core.debug('Updating message to indicate a successful upload')
    await slack.chat.update({
      ts: threadID,
      channel: channelId,
      text: messageText
    })

    core.setOutput('result', 'Bingo bango bongo!')
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
