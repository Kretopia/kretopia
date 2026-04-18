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
  Section,
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
        <Section style={logoSection}>
          <Img
            src="https://kwmcocsitwssrtzkdojh.supabase.co/storage/v1/object/public/email-assets/logo.png"
            width="56"
            height="56"
            alt="ThriveIN"
            style={{ borderRadius: '14px' }}
          />
        </Section>

        <Heading style={h1}>Welcome to ThriveIN</Heading>
        <Text style={subtitle}>The Creative OS</Text>

        <Text style={text}>
          You're one step away from joining the professional creative network.
          Verify your email to unlock verified credits, real gigs, and your creative career dashboard.
        </Text>

        <Text style={text}>
          Confirm your email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to get started:
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Verify & Get Started
          </Button>
        </Section>

        <Section style={divider} />

        <Text style={footer}>
          If you didn't sign up for ThriveIN, you can safely ignore this email.
        </Text>
        <Text style={footerBrand}>
          © {new Date().getFullYear()} ThriveIN · thrivein.io
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const brandPrimary = '#7B61FF'
const brandLime = '#C6FF00'
const brandDark = '#0F0F14'

const main = {
  backgroundColor: '#f4f4f7',
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  padding: '24px 0',
}
const container = {
  padding: '40px 32px',
  maxWidth: '480px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e5e5ea',
  borderTop: `4px solid ${brandLime}`,
}
const logoSection = {
  marginBottom: '28px',
}
const h1 = {
  fontSize: '28px',
  fontWeight: '900' as const,
  color: brandDark,
  margin: '0 0 4px',
  letterSpacing: '-0.03em',
}
const subtitle = {
  fontSize: '11px',
  fontWeight: '900' as const,
  color: brandPrimary,
  margin: '0 0 24px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
}
const text = {
  fontSize: '15px',
  color: '#606068',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: brandPrimary, textDecoration: 'underline' }
const buttonSection = {
  textAlign: 'center' as const,
  margin: '8px 0 32px',
}
const button = {
  backgroundColor: brandPrimary,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700' as const,
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  boxShadow: `0 4px 14px ${brandPrimary}55`,
}
const divider = {
  borderTop: '1px solid #e5e5ea',
  margin: '0 0 20px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 8px' }
const footerBrand = { fontSize: '11px', color: '#bbbbbb', margin: '0' }
