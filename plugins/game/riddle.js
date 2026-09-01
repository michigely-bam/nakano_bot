import { games } from '../../src/lib/ourin-games.js'

games.register('riddle', {
    alias: ['rd', 'tebaktebak', 'riddles'],
    emoji: '❓',
    title: 'RIDDLE',
    description: 'Riddle/tebak-tebakan'
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('riddle')
export { pluginConfig as config, handler, answerHandler }
