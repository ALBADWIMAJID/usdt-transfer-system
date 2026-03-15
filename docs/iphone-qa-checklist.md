# iPhone QA Checklist

Purpose:
- Manual validation checklist for real iPhone Safari and Add to Home Screen
  behavior
- This file is not evidence of completed device testing by itself

Status fields:
- `Pass`
- `Fail`
- `Blocked`
- `Not Run`

## Device / Environment Setup

| Scenario | Preconditions | Test Steps | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Safari online first launch | Real iPhone, HTTPS deployment, valid operator account | Open the app in Safari and sign in | Login works and main shell loads without layout breakage | Not Run |  |
| Add to Home Screen availability | Same as above | Use Safari Share -> Add to Home Screen | App can be added with branded title/icon | Not Run |  |
| Home Screen standalone launch | App already added to Home Screen | Launch from Home Screen | App opens in standalone mode without Safari chrome | Not Run |  |
| Reopen after background/lock | App previously opened from Home Screen | Put app in background, lock device, reopen | Session/app shell resumes cleanly without white screen or broken layout | Not Run |  |

## PWA / Installability

| Scenario | Preconditions | Test Steps | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Apple touch icon quality | App added to Home Screen | Inspect installed icon on Home Screen | PNG icon is used and is readable at iPhone size | Not Run |  |
| Theme/status bar presentation | Standalone launch | Open app from Home Screen and inspect top chrome/status area | Theme color and top area feel coherent and readable | Not Run |  |
| App shell offline reopen | One successful online visit and Home Screen install preferred | Turn on Airplane Mode, reopen app | Cached shell opens and offline fallback is understandable | Not Run |  |

## Connectivity and Offline Reads

| Scenario | Preconditions | Test Steps | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Offline after prior dashboard/customers/transfers/details visit | Relevant supported screens opened online previously | Go offline and reopen `DashboardPage`, `CustomersPage`, `TransfersPage`, `CustomerDetailsPage`, `TransferDetailsPage`, and `NewTransferPage` customer options where applicable | Supported snapshot-backed screens do not stay on `جار التحميل...`; they show locally saved data or an explicit offline/no-snapshot state | Not Run |  |
| TransferDetails partial snapshot restore | `TransferDetailsPage` visited online previously, then reopened later while part of the local snapshot is missing or incomplete | Go offline and open `TransferDetailsPage` for the same transfer | Saved transfer details still render, payment-history absence is explicit, and confirmed paid/remaining totals are not faked as zero | Not Run |  |
| Offline dashboard drill-down sheet | `DashboardPage` visited online previously and dashboard snapshot saved | Go offline, open the dashboard, then open key drill-down sheets such as remaining / overpaid / recent payments | Dashboard drill-down sheets open from the saved dashboard snapshot or show an explicit offline/no-snapshot state instead of hanging | Not Run |  |
| Offline unsupported surface | Go offline on a surface with no local snapshot | Open a screen without a saved snapshot | App fails safely and does not fake live data | Not Run |  |
| Network switch Wi-Fi -> cellular/offline | App open with pending or cached state | Toggle connectivity types and observe banners/notices | Connection/sync messaging stays clear and non-duplicative | Not Run |  |

## Offline Queue / Replay

| Scenario | Preconditions | Test Steps | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Offline payment capture | Visit a transfer details screen online first, then go offline | Save a payment locally | Local payment appears as pending local item and is not treated as confirmed/print-safe | Not Run |  |
| Offline customer creation | Open `CustomersPage`, then go offline | Save a new customer locally from the customer form | Local customer appears clearly as a pending local file and is not treated as confirmed server data | Not Run |  |
| Offline transfer creation | Customer options were cached online first, then go offline | Create a transfer from New Transfer | Local transfer is saved with clear pending/local-only labeling | Not Run |  |
| Customer replay after reconnect | At least one pending local customer exists | Reconnect and trigger sync or wait for reconnect replay | Customer syncs or shows clear failed state; local-only customer does not remain ambiguous | Not Run |  |
| Payment replay after reconnect | At least one pending local payment exists | Reconnect and trigger sync or wait for reconnect replay | Payment syncs or shows clear failed/blocked state | Not Run |  |
| Transfer replay before payment replay | At least one pending local transfer and dependent payment scenario exists | Reconnect and trigger combined sync | Transfer is processed before dependent payment; payment does not replay prematurely | Not Run |  |
| Failed replay remains visible | Force a replay failure safely if possible | Retry sync after failure | Item remains visible with retry/error state and is not silently dropped | Not Run |  |

## Mobile UX / Shell

| Scenario | Preconditions | Test Steps | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Top shell and banners on iPhone | App open on iPhone portrait | Review top bar, connection badge, sync banner | Shell remains compact, readable, and RTL-correct | Not Run |  |
| Bottom navigation on iPhone | Logged into app | Navigate across main sections | Bottom navigation remains tappable and not visually oversized | Not Run |  |
| Customers page section bar on iPhone | Open `CustomersPage` in portrait mode | Switch between `العملاء` / `المحفظة` / `متابعة` / `النشاط` | The mobile tab bar is readable, thumb-friendly, visually obvious, and does not hide pending local-customer visibility ambiguously | Not Run |  |
| Transfer details section bar on iPhone | Open `TransferDetailsPage` for a valid transfer in portrait mode | Switch between `الملخص` / `الدفعات` / `السجل` / `الطباعة` | The mobile tab bar is readable, thumb-friendly, and keeps payment entry, payment history, and print access easy to reach without feeling like a compressed desktop layout | Not Run |  |
| Drill-down sheet on iPhone | Open any dashboard/customer drill-down | Inspect layout in portrait mode | Sheet remains compact and operational, without excessive vertical waste | Not Run |  |

## Sign-off Notes

- Physical iPhone testing is still required.
- Record iPhone model, iOS version, browser mode, and deployment URL in the
  notes column during execution.
