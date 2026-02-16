import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'NLUI',
  description: 'Natural Language User Interface — Turn any API into a conversational interface.',
  base: '/NLUI/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/NLUI/logo.svg' }],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'API', link: '/guide/api' },
          { text: 'SDK', link: '/sdk/overview' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Introduction',
              items: [
                { text: 'Getting Started', link: '/guide/getting-started' },
                { text: 'Architecture', link: '/guide/architecture' },
                { text: 'Configuration', link: '/guide/configuration' },
              ],
            },
            {
              text: 'Reference',
              items: [
                { text: 'API Endpoints', link: '/guide/api' },
                { text: 'SSE Events', link: '/guide/sse-events' },
              ],
            },
          ],
          '/sdk/': [
            {
              text: 'SDK',
              items: [
                { text: 'Overview', link: '/sdk/overview' },
                { text: 'TypeScript Engine', link: '/sdk/engine' },
              ],
            },
          ],
        },
      },
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: 'API', link: '/zh/guide/api' },
          { text: 'SDK', link: '/zh/sdk/overview' },
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '介绍',
              items: [
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '架构', link: '/zh/guide/architecture' },
                { text: '配置', link: '/zh/guide/configuration' },
              ],
            },
            {
              text: '参考',
              items: [
                { text: 'API 端点', link: '/zh/guide/api' },
                { text: 'SSE 事件', link: '/zh/guide/sse-events' },
              ],
            },
          ],
          '/zh/sdk/': [
            {
              text: 'SDK',
              items: [
                { text: '概览', link: '/zh/sdk/overview' },
                { text: 'TypeScript 引擎', link: '/zh/sdk/engine' },
              ],
            },
          ],
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ZacharyZcR/NLUI' },
    ],
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/ZacharyZcR/NLUI/edit/main/docs/:path',
    },
  },
})
