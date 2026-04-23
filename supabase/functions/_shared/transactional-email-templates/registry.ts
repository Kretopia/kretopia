/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as applicationConfirmation } from './application-confirmation.tsx'
import { template as applicationStatusUpdate } from './application-status-update.tsx'
import { template as newApplicantNotification } from './new-applicant-notification.tsx'
import { template as eventRegistrationConfirmation } from './event-registration-confirmation.tsx'
import { template as onboardingReminder } from './onboarding-reminder.tsx'
import { template as eventReminder } from './event-reminder.tsx'
import { template as thrivefundPledgeConfirmed } from './thrivefund-pledge-confirmed.tsx'
import { template as thrivefundCampaignFunded } from './thrivefund-campaign-funded.tsx'
import { template as thrivefundCampaignFailed } from './thrivefund-campaign-failed.tsx'
import { template as eventBlast } from './event-blast.tsx'
import { template as day2Engagement } from './day2-engagement.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-confirmation': applicationConfirmation,
  'application-status-update': applicationStatusUpdate,
  'new-applicant-notification': newApplicantNotification,
  'event-registration-confirmation': eventRegistrationConfirmation,
  'onboarding-reminder': onboardingReminder,
  'event-reminder': eventReminder,
  'thrivefund-pledge-confirmed': thrivefundPledgeConfirmed,
  'thrivefund-campaign-funded': thrivefundCampaignFunded,
  'thrivefund-campaign-failed': thrivefundCampaignFailed,
  'event-blast': eventBlast,
  'day2-engagement': day2Engagement,
}
