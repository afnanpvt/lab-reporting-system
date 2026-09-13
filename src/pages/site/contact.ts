import type { LicenseStatus } from '../../types/license'

export const SCALYFT_PHONE = '8610866049'
export const SCALYFT_PHONE_DISPLAY = '86108 66049'

export function messageScalyftOnWhatsApp(license: LicenseStatus | null): void {
  const lab = license?.labName ? ` for ${license.labName}` : ''
  const id = license?.licenseId ? ` (License ID: ${license.licenseId})` : ''
  window.api.shell.openWhatsApp(SCALYFT_PHONE, `Hi, I'd like to buy the full version of LumaLabs${lab}${id}.`)
}
