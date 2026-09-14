export const SCALYFT_WEBSITE = 'https://www.scalyft.tech'

// Where "Contact Scalyft" sends a lab that wants to buy the full version.
export function contactScalyft(): void {
  window.api.shell.openExternal(SCALYFT_WEBSITE)
}
