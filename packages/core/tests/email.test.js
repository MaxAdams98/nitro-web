import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sendEmail } from '../server/email/index.js'

const redirect = { emailRedirectTo: 'Dev<dev@example.test>' }

test('sendEmail redirects in test mode too, keeping the intended recipient\'s variables and prefixing the subject', async () => {
  // Development test mode logs what would be sent; capture that instead of posting to Mailgun
  const info = console.info
  const logged = []
  console.info = (...args) => logged.push(args)
  try {
    const html = await sendEmail({
      config: { ...redirect, baseUrl: 'http://localhost:3000', emailFrom: 'Nitro<support@nitro.test>', name: 'nitro',
        env: 'development', emailTestMode: true, pwd: process.cwd() },
      template: '<p>%recipient.greet%, this went to %recipient.email%</p>',
      subject: 'Welcome %recipient.name%',
      to: 'Jane<jane@customer.test>',
      cc: 'cc@customer.test',
    })
    assert.equal(html, '<p>Hi Jane, this went to jane@customer.test</p>')
    const sent = logged.find((args) => args[0] === 'Test mode: sendEmail mailgunOpts')?.[1]
    assert.ok(sent, 'logged the message it would send')
    assert.equal(sent.to, 'Dev<dev@example.test>')
    assert.equal(sent.cc, undefined)
    assert.equal(sent.subject, '[redirected → jane@customer.test +1] Welcome Jane')
  } finally {
    console.info = info
  }
})
