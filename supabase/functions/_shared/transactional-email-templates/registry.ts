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
import { template as newApplicantNotification } from './new-applicant-notification.tsx'
import { template as eventRegistrationConfirmation } from './event-registration-confirmation.tsx'
import { template as onboardingReminder } from './onboarding-reminder.tsx'
import { template as eventReminder } from './event-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-confirmation': applicationConfirmation,
  'new-applicant-notification': newApplicantNotification,
  'event-registration-confirmation': eventRegistrationConfirmation,
  'onboarding-reminder': onboardingReminder,
  'event-reminder': eventReminder,
}
