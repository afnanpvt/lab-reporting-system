import { Phone, Mail, MapPin, QrCode } from 'lucide-react'
import type { LabSettingsForm } from './api'
import logo from '../../assets/superlab-logo.png'
import badge from '../../assets/superlab-25years-badge.png'

/**
 * The report is pre-paginated in JS (see pagination.ts) into discrete page boxes, each of which
 * renders its own copy of this header/footer in normal document flow — so what the on-screen
 * preview shows page-by-page is exactly what prints, no reliance on the browser's print engine
 * to repeat fixed-position chrome across pages.
 */
export function LetterheadHeader({ labName }: { labName: string }) {
  return (
    <div className="flex items-center justify-between bg-white">
      <img src={logo} alt={labName} className="h-[92px] w-auto" />
      <img src={badge} alt="Celebrating 25 years of service" className="h-[92px] w-auto" />
    </div>
  )
}

/** Faint centered security watermark behind the page content. */
export function LetterheadWatermark() {
  return (
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '65%', opacity: 0.045, zIndex: 0 }}
    />
  )
}

const CERTIFICATIONS = ['BMQR', 'ISO 9001', 'ISO 9001', 'ISAC\nAccreditation']

/**
 * `variant` controls the left-hand notice block: 'report' carries the patient-report disclaimer
 * and the CMC Hospital quality-check line — neither of which belongs on a billing or accounts
 * document. 'incentive' and 'billing' each get their own genuinely relevant note instead of a
 * single generic line borrowed from the patient report.
 */
export function LetterheadFooter({ variant = 'report', settings }: { variant?: 'report' | 'incentive' | 'billing'; settings: Pick<LabSettingsForm, 'labPhone' | 'labEmail' | 'labAddress'> }) {
  return (
    <div className="bg-white">
      <div className="flex items-start justify-between gap-4 pt-4" style={{ borderTop: '1px solid #dde3ea' }}>
        <div className="flex-1 min-w-0">
          {variant === 'report' && (
            <>
              <p className="text-[10px] text-[#555] leading-snug">
                The report is based on the specimen received / submitted to the laboratory. Laboratory results are
                dependent on multiple factors. Results need to be correlated clinically. This result is not valid for
                medico-legal purpose.
              </p>
              <p className="text-[10.5px] font-semibold text-[#1a2430] mt-1.5">
                Test done here have quality - control check with <span style={{ color: '#c2185b' }}>CMC Hospital, Vellore.</span>
              </p>
            </>
          )}
          {variant === 'billing' && (
            <>
              <p className="text-[10px] text-[#555] leading-snug">
                This is a computer-generated bill and does not require a signature. Amounts reflect what was charged
                for the investigations listed above, correct as of the date printed.
              </p>
              <p className="text-[10.5px] font-semibold text-[#1a2430] mt-1.5">
                Thank you for choosing <span style={{ color: '#1b6fae' }}>Super Lab Service.</span> For any billing
                query, please contact us using the details below.
              </p>
            </>
          )}
          {variant === 'incentive' && (
            <p className="text-[10.5px] font-semibold text-[#1a2430] leading-snug">
              Please verify this statement against <span style={{ color: '#1b6fae' }}>billing records</span> before
              processing any payment to the referring doctor.
            </p>
          )}
        </div>
        {variant !== 'incentive' && (
          <div
            className="flex-shrink-0 text-center px-3.5 py-2 rounded-md"
            style={{ background: '#1b6fae', color: 'white' }}
          >
            <div className="text-[10px] font-semibold leading-tight">Fast and comprehensive tests.</div>
            <div className="text-[9.5px] leading-tight">Get your samples collected from your doorstep.</div>
            <div className="text-[11px] font-bold mt-1" style={{ color: '#ff4fa0' }}>Home Visit Available</div>
          </div>
        )}
      </div>

      <div className="h-[3px] my-3 rounded-full" style={{ background: 'linear-gradient(to right, #1b6fae, #ff4fa0)' }} />

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5 text-[11px] text-[#1a2430]">
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-[#1b6fae]" />
            <span className="tracking-wider font-medium">{settings.labPhone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-[#1b6fae]" />
            {settings.labEmail}
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-[#1b6fae] flex-shrink-0 mt-0.5" />
            <span className="max-w-[320px]">{settings.labAddress}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="flex flex-col items-center justify-center rounded border border-dashed"
            style={{ width: 52, height: 52, borderColor: '#c7cfd9', color: '#8593a3' }}
            title="Real QR code goes here once a scan target is defined"
          >
            <QrCode size={20} />
          </div>
          {CERTIFICATIONS.map((label, i) => (
            <div
              key={label + i}
              className="flex items-center justify-center rounded-full border text-center px-1"
              style={{ width: 52, height: 52, borderColor: '#c7cfd9' }}
              title="Placeholder — swap in the real certification artwork"
            >
              <span className="text-[7.5px] font-semibold text-[#57677a] leading-[1.15] whitespace-pre-line">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative closing wave — purely cosmetic brand flourish */}
      <svg viewBox="0 0 780 22" preserveAspectRatio="none" className="w-full h-6 mt-3" aria-hidden="true">
        <path d="M0,14 C150,0 300,22 480,8 C600,0 700,14 780,6 L780,22 L0,22 Z" fill="#1b6fae" />
        <path d="M0,18 C200,8 450,22 780,14 L780,22 L0,22 Z" fill="#125483" />
      </svg>
    </div>
  )
}
