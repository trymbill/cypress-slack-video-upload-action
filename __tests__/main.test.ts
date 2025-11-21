import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { run } from '../src/main'

// Hoist core fixtures for use in mocks
const coreFixtures = vi.hoisted(() => {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    getInput: vi.fn(),
    setOutput: vi.fn(),
    setFailed: vi.fn(),
    warning: vi.fn()
  }
})

// Mock all dependencies
vi.mock('@actions/core', () => ({
  debug: coreFixtures.debug,
  error: coreFixtures.error,
  info: coreFixtures.info,
  getInput: coreFixtures.getInput,
  setOutput: coreFixtures.setOutput,
  setFailed: coreFixtures.setFailed,
  warning: coreFixtures.warning
}))

const mockSlackClient = vi.hoisted(() => {
  return {
    chat: {
      postMessage: vi.fn().mockResolvedValue({
        ts: '1234567890.123456',
        channel: 'C1234567890'
      }),
      update: vi.fn().mockResolvedValue({ ok: true })
    },
    files: {
      uploadV2: vi.fn().mockResolvedValue({ ok: true })
    }
  }
})

const MockWebClient = vi.hoisted(() => {
  return vi.fn(function (this: unknown) {
    return mockSlackClient
  })
})

vi.mock('@slack/web-api', () => ({
  WebClient: MockWebClient
}))

const mockWalkSync = vi.hoisted(() => vi.fn())
const mockCreateReadStream = vi.hoisted(() => vi.fn())

vi.mock('walk-sync', () => ({
  default: mockWalkSync
}))

vi.mock('fs', () => ({
  createReadStream: mockCreateReadStream
}))

describe('run', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup default mock implementations
    coreFixtures.getInput.mockImplementation((name: string) => {
      const defaults: Record<string, string> = {
        token: 'xoxb-test-token',
        channel: 'C1234567890',
        screenshotsDir: 'cypress/screenshots',
        videosDir: 'cypress/videos',
        'message-text': 'Test message',
        uploadType: 'both'
      }
      return defaults[name] || ''
    })

    // Reset Slack client mocks
    mockSlackClient.chat.postMessage.mockResolvedValue({
      ts: '1234567890.123456',
      channel: 'C1234567890'
    })
    mockSlackClient.chat.update.mockResolvedValue({ ok: true })
    mockSlackClient.files.uploadV2.mockResolvedValue({ ok: true })

    // Setup walkSync mock
    mockWalkSync.mockImplementation(
      (dir: string, options: { globs: string[] }) => {
        if (options.globs.includes('**/*.mp4')) {
          return ['test-video.mp4', 'another-video.mp4']
        }
        if (options.globs.includes('**/*.png')) {
          return ['test-screenshot.png', 'another-screenshot.png']
        }
        return []
      }
    )

    // Setup createReadStream mock
    mockCreateReadStream.mockReturnValue({} as NodeJS.ReadableStream)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('successful uploads', () => {
    it('should upload both videos and screenshots when uploadType is "both"', async () => {
      await run()

      expect(coreFixtures.getInput).toHaveBeenCalledWith('token')
      expect(coreFixtures.getInput).toHaveBeenCalledWith('channel')
      expect(coreFixtures.getInput).toHaveBeenCalledWith('screenshotsDir')
      expect(coreFixtures.getInput).toHaveBeenCalledWith('videosDir')
      expect(coreFixtures.getInput).toHaveBeenCalledWith('message-text')
      expect(coreFixtures.getInput).toHaveBeenCalledWith('uploadType')

      expect(MockWebClient).toHaveBeenCalledWith('xoxb-test-token')
      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledWith({
        text: "I've got test results coming in from Cypress. Hold tight ...",
        channel: 'C1234567890'
      })

      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledTimes(4)
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledWith({
        filename: 'test-screenshot.png',
        file: expect.any(Object),
        thread_ts: '1234567890.123456',
        channel_id: 'C1234567890'
      })
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledWith({
        filename: 'test-video.mp4',
        file: expect.any(Object),
        thread_ts: '1234567890.123456',
        channel_id: 'C1234567890'
      })

      expect(mockSlackClient.chat.update).toHaveBeenCalledWith({
        ts: '1234567890.123456',
        channel: 'C1234567890',
        text: 'Test message'
      })

      expect(coreFixtures.setOutput).toHaveBeenCalledWith(
        'result',
        'Bingo bango bongo!'
      )
    })

    it('should upload only videos when uploadType is "videos"', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'uploadType') return 'videos'
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })

      await run()

      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledTimes(2)
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test-video.mp4'
        })
      )
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'another-video.mp4'
        })
      )
    })

    it('should upload only screenshots when uploadType is "screenshots"', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'uploadType') return 'screenshots'
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })

      await run()

      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledTimes(2)
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test-screenshot.png'
        })
      )
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'another-screenshot.png'
        })
      )
    })

    it('should use default directories when not provided', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'screenshotsDir') return ''
        if (name === 'videosDir') return ''
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })

      await run()

      expect(mockWalkSync).toHaveBeenCalledWith('cypress/screenshots', {
        globs: ['**/*.png']
      })
      expect(mockWalkSync).toHaveBeenCalledWith('cypress/videos', {
        globs: ['**/*.mp4']
      })
    })

    it('should use default message text when not provided', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'message-text') return ''
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })

      await run()

      expect(mockSlackClient.chat.update).toHaveBeenCalledWith({
        ts: '1234567890.123456',
        channel: 'C1234567890',
        text: "A Cypress test just finished. I've placed the screenshots and videos in this thread. Good pie!"
      })
    })

    it('should create read streams with correct paths', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'screenshotsDir') return 'custom/screenshots'
        if (name === 'videosDir') return 'custom/videos'
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })

      await run()

      expect(mockCreateReadStream).toHaveBeenCalledWith(
        'custom/screenshots/test-screenshot.png'
      )
      expect(mockCreateReadStream).toHaveBeenCalledWith(
        'custom/videos/test-video.mp4'
      )
    })
  })

  describe('edge cases', () => {
    it('should exit early when no videos or screenshots are found', async () => {
      mockWalkSync.mockReturnValue([])

      await run()

      expect(mockSlackClient.chat.postMessage).not.toHaveBeenCalled()
      expect(mockSlackClient.files.uploadV2).not.toHaveBeenCalled()
      expect(coreFixtures.setOutput).toHaveBeenCalledWith(
        'result',
        'No videos or screenshots found!'
      )
      expect(coreFixtures.debug).toHaveBeenCalledWith(
        'No videos or screenshots found. Exiting!'
      )
    })

    it('should handle missing thread ID from Slack response', async () => {
      mockSlackClient.chat.postMessage.mockResolvedValue({
        ts: undefined,
        channel: 'C1234567890'
      })

      await run()

      expect(coreFixtures.error).toHaveBeenCalledWith(
        'No thread ID or channel ID returned from Slack. Exiting!'
      )
      expect(coreFixtures.setFailed).toHaveBeenCalledWith(
        'No thread ID or channel ID returned from Slack!'
      )
      expect(mockSlackClient.files.uploadV2).not.toHaveBeenCalled()
    })

    it('should handle missing channel ID from Slack response', async () => {
      mockSlackClient.chat.postMessage.mockResolvedValue({
        ts: '1234567890.123456',
        channel: undefined
      })

      await run()

      expect(coreFixtures.error).toHaveBeenCalledWith(
        'No thread ID or channel ID returned from Slack. Exiting!'
      )
      expect(coreFixtures.setFailed).toHaveBeenCalledWith(
        'No thread ID or channel ID returned from Slack!'
      )
      expect(mockSlackClient.files.uploadV2).not.toHaveBeenCalled()
    })

    it('should handle empty videos array when uploadType is screenshots only', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'uploadType') return 'screenshots'
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })
      mockWalkSync.mockImplementation(
        (dir: string, options: { globs: string[] }) => {
          if (options.globs.includes('**/*.png')) {
            return ['test-screenshot.png']
          }
          return []
        }
      )

      await run()

      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledTimes(1)
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test-screenshot.png'
        })
      )
    })

    it('should handle empty screenshots array when uploadType is videos only', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'uploadType') return 'videos'
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })
      mockWalkSync.mockImplementation(
        (dir: string, options: { globs: string[] }) => {
          if (options.globs.includes('**/*.mp4')) {
            return ['test-video.mp4']
          }
          return []
        }
      )

      await run()

      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledTimes(1)
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test-video.mp4'
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle errors from Slack postMessage', async () => {
      const error = new Error('Slack API error')
      mockSlackClient.chat.postMessage.mockRejectedValue(error)

      await run()

      expect(coreFixtures.setFailed).toHaveBeenCalledWith('Slack API error')
    })

    it('should handle errors from Slack file upload', async () => {
      const error = new Error('File upload failed')
      mockSlackClient.files.uploadV2.mockRejectedValue(error)

      await run()

      expect(coreFixtures.setFailed).toHaveBeenCalledWith('File upload failed')
    })

    it('should handle errors from Slack chat update', async () => {
      const error = new Error('Update failed')
      mockSlackClient.chat.update.mockRejectedValue(error)

      await run()

      expect(coreFixtures.setFailed).toHaveBeenCalledWith('Update failed')
    })

    it('should handle non-Error objects in catch block', async () => {
      mockSlackClient.chat.postMessage.mockRejectedValue('String error')

      await run()

      expect(coreFixtures.setFailed).toHaveBeenCalledWith('String error')
    })

    it('should handle errors from walkSync', async () => {
      const error = new Error('File system error')
      mockWalkSync.mockImplementation(() => {
        throw error
      })

      await run()

      expect(coreFixtures.setFailed).toHaveBeenCalledWith('File system error')
    })
  })

  describe('concurrent uploads', () => {
    it('should upload multiple files concurrently using Promise.all', async () => {
      const uploadPromises: Promise<unknown>[] = []
      mockSlackClient.files.uploadV2.mockImplementation(async () => {
        const promise = Promise.resolve({ ok: true })
        uploadPromises.push(promise)
        return promise
      })

      await run()

      // Should have called uploadV2 for all files
      expect(mockSlackClient.files.uploadV2).toHaveBeenCalledTimes(4)
    })
  })

  describe('input validation', () => {
    it('should handle custom screenshots directory', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'screenshotsDir') return 'custom/screenshots/path'
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })

      await run()

      expect(mockWalkSync).toHaveBeenCalledWith('custom/screenshots/path', {
        globs: ['**/*.png']
      })
    })

    it('should handle custom videos directory', async () => {
      coreFixtures.getInput.mockImplementation((name: string) => {
        if (name === 'videosDir') return 'custom/videos/path'
        if (name === 'token') return 'xoxb-test-token'
        if (name === 'channel') return 'C1234567890'
        return ''
      })

      await run()

      expect(mockWalkSync).toHaveBeenCalledWith('custom/videos/path', {
        globs: ['**/*.mp4']
      })
    })
  })
})
