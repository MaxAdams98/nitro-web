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

test('sendEmail passes extra headers to Mailgun as h: fields, which the transport keeps', async () => {
  const info = console.info
  const logged = []
  console.info = (...args) => logged.push(args)
  try {
    await sendEmail({
      config: { baseUrl: 'http://localhost:3000', emailFrom: 'Nitro<support@nitro.test>', name: 'nitro',
        env: 'development', emailTestMode: true, pwd: process.cwd() },
      template: '<p>Notice</p>',
      subject: 'Notice',
      to: 'jane@customer.test',
      headers: {
        'List-Unsubscribe': '<https://nitro.test/api/unsubscribe/abc>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Empty': '',
      },
    })
    const sent = logged.find((args) => args[0] === 'Test mode: sendEmail mailgunOpts')?.[1]
    assert.equal(sent['h:List-Unsubscribe'], '<https://nitro.test/api/unsubscribe/abc>')
    assert.equal(sent['h:List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
    assert.ok(!('h:X-Empty' in sent))
    // nodemailer-mailgun-transport forwards only whitelisted keys; h: headers are among them
    const { default: transport } = await import('nodemailer-mailgun-transport')
    const kept = transport._applyKeyWhitelist(sent)
    assert.equal(kept['h:List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  } finally {
    console.info = info
  }
})
