import * as core from '@actions/core'
import { createReadStream } from 'fs'
import walkSync from 'walk-sync'
import { WebClient } from '@slack/web-api'

export async function run(): Promise<void> {
  try {
    core.debug('INIT!')
    const token = core.getInput('token')
    const channel = core.getInput('channel')
    const screenshotsDir =
      core.getInput('screenshotsDir') || 'cypress/screenshots'
    const videosDir = core.getInput('videosDir') || 'cypress/videos'
    const messageText =
      core.getInput('message-text') ||
      "A Cypress test just finished. I've placed the screenshots and videos in this thread. Good pie!"
    const uploadType = core.getInput('uploadType') || 'both'

    core.debug(`Channel: ${channel}`)
    core.debug(`Message text: ${messageText}`)
    core.debug(`Upload type: ${uploadType}`)

    core.debug('Initializing slack SDK')
    const slack = new WebClient(token)
    core.debug('Slack SDK initialized successfully')

    core.debug('Checking for videos and/or screenshots from cypress')
    const videos =
      uploadType === 'both' || uploadType === 'videos'
        ? walkSync(videosDir, { globs: ['**/*.mp4'] })
        : []
    const screenshots =
      uploadType === 'both' || uploadType === 'screenshots'
        ? walkSync(screenshotsDir, { globs: ['**/*.png'] })
        : []

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
      channel
    })

    const threadID = result.ts
    const channelId = result.channel

    if (!threadID || !channelId) {
      core.error('No thread ID or channel ID returned from Slack. Exiting!')
      core.setFailed('No thread ID or channel ID returned from Slack!')
      return
    }

    if (
      screenshots.length > 0 &&
      (uploadType === 'both' || uploadType === 'screenshots')
    ) {
      core.debug('Uploading screenshots...')

      await Promise.all(
        screenshots.map(async screenshot => {
          core.debug(`Uploading ${screenshot}`)

          await slack.files.uploadV2({
            filename: screenshot,
            file: createReadStream(`${screenshotsDir}/${screenshot}`),
            thread_ts: threadID,
            channel_id: channelId
          })
        })
      )

      core.debug('...done!')
    }

    if (
      videos.length > 0 &&
      (uploadType === 'both' || uploadType === 'videos')
    ) {
      core.debug('Uploading videos...')

      await Promise.all(
        videos.map(async video => {
          core.debug(`Uploading ${video}`)

          await slack.files.uploadV2({
            filename: video,
            file: createReadStream(`${videosDir}/${video}`),
            thread_ts: threadID,
            channel_id: channelId
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
