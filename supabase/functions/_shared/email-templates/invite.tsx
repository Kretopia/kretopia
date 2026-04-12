/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to ThriveIN</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://kwmcocsitwssrtzkdojh.supabase.co/storage/v1/object/public/email-assets/logo.png"
          width="48"
          height="48"
          alt="ThriveIN"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>You're invited</Heading>
        <Text style={text}>
          Someone on{' '}
          <Link href={siteUrl} style={link}>
            <strong>ThriveIN</strong>
          </Link>{' '}
          thinks you'd be a great addition to the professional creative network. Accept the invite to claim your credits, set up your profile, and start getting booked.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          Wasn't expecting this? No worries — just ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0a0a0f',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#606068',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const link = { color: '#4338CA', textDecoration: 'underline' }
const button = {
  backgroundColor: '#4338CA',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
