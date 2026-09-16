import { Phone, Mail, MapPin } from 'lucide-react'
import type { LabSettingsForm } from './api'

/**
 * The report is pre-paginated in JS (see pagination.ts) into discrete page boxes, each of which
 * renders its own copy of this header/footer in normal document flow — so what the on-screen
 * preview shows page-by-page is exactly what prints, no reliance on the browser's print engine
 * to repeat fixed-position chrome across pages.
 *
 * No logo image by default — the lab name (fully editable in Settings, unless locked to a
 * license) renders as a plain text wordmark. A profile that stages a logo.png (see
 * profiles/README.md) swaps this for that image instead. `badgeDataUrl` is a separate, optional
 * profile asset (e.g. Super Lab's "25 years of service" seal) shown opposite the logo — most
 * profiles don't have one, so it's simply absent rather than leaving a gap.
 */
export function LetterheadHeader({ labName, logoDataUrl, badgeDataUrl }: { labName: string; logoDataUrl?: string | null; badgeDataUrl?: string | null }) {
  return (
    <div className="flex items-center justify-between bg-[var(--surface)] pb-3" style={{ borderBottom: '2px solid var(--accent)' }}>
      {logoDataUrl ? (
        <img src={logoDataUrl} alt={labName} style={{ height: 92 }} />
      ) : (
        <div className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--accent)' }}>{labName}</div>
      )}
      {badgeDataUrl && <img src={badgeDataUrl} alt="" style={{ height: 92 }} />}
    </div>
  )
}

/** Faint centered security watermark behind the page content. */
export function LetterheadWatermark({ labName }: { labName: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none text-center font-bold uppercase"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', opacity: 0.045, zIndex: 0, fontSize: '56px', lineHeight: 1.15, color: 'var(--ink)' }}
    >
      {labName}
    </div>
  )
}

/**
 * `variant` controls the left-hand notice block: 'report' carries the patient-report disclaimer
 * (plus a quality-control-check line, for a profile that names one — see `labQualityCheck`),
 * 'incentive' and 'billing' each get their own genuinely relevant note instead of a single
 * generic line borrowed from the patient report. `certificationDataUrls` is an optional row of
 * accreditation logos (e.g. ISO 9001) shown next to the contact details — most profiles have
 * none, so the row is simply absent rather than leaving a gap.
 */
export function LetterheadFooter({ variant = 'report', settings, certificationDataUrls, bleedMm }: {
  variant?: 'report' | 'incentive' | 'billing'
  settings: Pick<LabSettingsForm, 'labName' | 'labPhone' | 'labEmail' | 'labAddress' | 'labQualityCheck'>
  certificationDataUrls?: string[]
  /**
   * Horizontal padding (in mm) of the container this footer sits in. Only the closing wave uses
   * it — cancelling that padding out with negative margins so it runs the full width of the
   * sheet, while the text and logos above stay aligned with the rest of the page. Without it the
   * wave stops short of both paper edges and reads as a truncated bar rather than a bottom band.
   */
  bleedMm?: number
}) {
  return (
    <div className="bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-4 pt-4" style={{ borderTop: '1px solid #dde3ea' }}>
        <div className="flex-1 min-w-0">
          {variant === 'report' && (
            <>
              <p className="text-[10px] text-[#555] leading-snug">
                The report is based on the specimen received / submitted to the laboratory. Laboratory results are
                dependent on multiple factors. Results need to be correlated clinically. This result is not valid for
                medico-legal purpose.
              </p>
              {settings.labQualityCheck && (
                <p className="text-[10.5px] font-semibold text-[var(--ink)] mt-1.5">
                  Test done here have quality-control check with <span style={{ color: 'var(--accent)' }}>{settings.labQualityCheck}</span>
                </p>
              )}
            </>
          )}
          {variant === 'billing' && (
            <>
              <p className="text-[10px] text-[#555] leading-snug">
                This is a computer-generated bill and does not require a signature. Amounts reflect what was charged
                for the investigations listed above, correct as of the date printed.
              </p>
              <p className="text-[10.5px] font-semibold text-[var(--ink)] mt-1.5">
                Thank you for choosing <span style={{ color: 'var(--accent)' }}>{settings.labName}.</span> For any billing
                query, please contact us using the details below.
              </p>
            </>
          )}
          {variant === 'incentive' && (
            <p className="text-[10.5px] font-semibold text-[var(--ink)] leading-snug">
              Please verify this statement against <span style={{ color: 'var(--accent)' }}>billing records</span> before
              processing any payment to the referring doctor.
            </p>
          )}
        </div>
        {variant !== 'incentive' && (
          <div
            className="flex-shrink-0 text-center px-3.5 py-2 rounded-md"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <div className="text-[10px] font-semibold leading-tight">Fast and comprehensive tests.</div>
            <div className="text-[9.5px] leading-tight">Get your samples collected from your doorstep.</div>
            <div className="text-[11px] font-bold mt-1" style={{ color: '#ff4fa0' }}>Home Visit Available</div>
          </div>
        )}
      </div>

      <div className="h-[3px] my-3 rounded-full" style={{ background: 'linear-gradient(to right, var(--accent), #ff4fa0)' }} />

      <div className="flex items-end justify-between gap-6">
        <div className="space-y-1.5 text-[11px] text-[var(--ink)]">
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-[var(--accent)]" />
            <span className="tracking-wider font-medium">{settings.labPhone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-[var(--accent)]" />
            {settings.labEmail}
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
            <span className="max-w-[380px]">{settings.labAddress}</span>
          </div>
        </div>

        {certificationDataUrls && certificationDataUrls.length > 0 && (
          <div className="flex items-center gap-3.5 flex-shrink-0">
            {certificationDataUrls.map((src, i) => (
              <img key={i} src={src} alt="" className="h-[46px] w-auto object-contain" />
            ))}
          </div>
        )}
      </div>

      {/* Decorative closing wave — purely cosmetic brand flourish, bled to both paper edges when
          the caller says how much padding to cancel out (see bleedMm). */}
      <svg
        viewBox="0 0 780 22"
        preserveAspectRatio="none"
        className="w-full h-6 mt-3"
        style={bleedMm ? { marginLeft: `-${bleedMm}mm`, marginRight: `-${bleedMm}mm`, width: `calc(100% + ${bleedMm * 2}mm)` } : undefined}
        aria-hidden="true"
      >
        <path d="M0,14 C150,0 300,22 480,8 C600,0 700,14 780,6 L780,22 L0,22 Z" fill="var(--accent)" />
        <path d="M0,18 C200,8 450,22 780,14 L780,22 L0,22 Z" fill="var(--accent-ink)" />
      </svg>
    </div>
  )
}
