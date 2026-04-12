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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to ThriveIN — verify your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://kwmcocsitwssrtzkdojh.supabase.co/storage/v1/object/public/email-assets/logo.png"
          width="48"
          height="48"
          alt="ThriveIN"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Welcome to ThriveIN</Heading>
        <Text style={text}>
          You're one step away from joining the professional creative network. Verify your email to unlock verified credits, real gigs, and your creative career dashboard.
        </Text>
        <Text style={text}>
          Confirm your email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to get started:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Get Started
        </Button>
        <Text style={footer}>
          If you didn't sign up for ThriveIN, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
