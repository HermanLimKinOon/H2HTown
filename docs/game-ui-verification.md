# 3D interface verification — 24 November 2026

The Three.js world, camera configuration, character models, environment assets and gameplay systems were retained. The 2D game was not edited. The existing friends frontend was rebuilt in place; its Cloudflare tunnel was not restarted.

## Interface changes

- Separate HTML HUD with shared CSS tokens, Grid/Flexbox layout, safe-area insets and full viewport scene.
- Compact top player/world information, navigation, social launcher, notifications and account menu.
- Centered desktop inventory dock, corner chat, collapsible connection details and controls help.
- Touch-first tablet/phone layout, scrollable 48px item slots, two-finger joystick/jump, nearby Interact and selected-tool Action shortcuts using existing handlers.
- Consistent inventory and modal surfaces; scrollable edit panels and collapsible edit controls.
- Contextual Town labels, with scene labels below the HUD layer. All world objects retain their existing click handlers.
- Exclusive transient chat/social/navigation panels. Automatically hiding chat preserves an unsent draft; explicitly closing chat still discards it as before.
- Game-route scroll lock, touch gesture isolation, visual viewport resizing and restoration of document settings when leaving the route.

## Browser viewport checks

Chrome device/viewport emulation was used in the existing authenticated game tab, with only one WebGL game session. These are browser checks, not physical-device certification.

| Layout | Size | Bounds / target / overlap checks |
| --- | --- | --- |
| Desktop | 1920 × 1080 | Passed |
| Desktop | 1600 × 900 | Passed |
| Desktop | 1440 × 900 | Passed |
| Desktop | 1366 × 768 | Passed |
| Tablet portrait | 768 × 1024 | Passed |
| Tablet landscape | 1024 × 768 | Passed |
| Phone portrait | 390 × 844 | Passed |
| Phone landscape | 844 × 390 | Passed |
| Small phone portrait | 360 × 640 | Passed |
| Small phone landscape | 667 × 375 | Passed |

Checks covered viewport containment, player/actions separation, chat/hotbar separation, joystick/action cluster separation, targets at least 44px, absence of page horizontal overflow, and an unobstructed gameplay center with panels closed. Screenshot and measurement records: `/private/tmp/h2h-ui-layout-checks-final.json`, `/private/tmp/h2h-ui-<width>x<height>-final.png`.

## Interaction checks

- Inventory opens on a phone, retains all bag slots and hotbar assignment controls, and scrolls within the viewport.
- Friends panel opens with search, requests and invitations accessible at touch dimensions.
- Chat opens in short landscape orientation with channels, history and input visible.
- Opening Notifications hides chat; reopening chat preserves a typed unsent draft. The test draft was explicitly discarded, never sent.
- Player menu navigation remains enabled while the menu pauses gameplay; Travel opens its existing dialog.
- Simultaneous emulated joystick and jump touch points update the knob and jump state. Releasing both resets them. Browser page scroll stays zero and page scale stays one.
- Hotbar touch drag changes horizontal scroll without changing the selected item; no page scrolling or zoom occurs.
- Viewport and touch emulation overrides were reset after verification.

TypeScript, scoped ESLint, the production friends build and the existing behavior suite were checked. The behavior suite contains 308 passing tests, including touch controller ownership, input reset, chat/controller navigation, privacy boundaries, inventory and game mechanics. No commits were created.

## Joystick regression correction

A follow-up report described a sticky joystick. Browser tracing reproduced a short drag followed by zero input: the generic `.game-screen-3d button { touch-action: manipulation }` selector overrode the less-specific joystick selector. At the browser pan threshold, the pointer was cancelled. The control group and joystick/jump buttons now explicitly override this with `touch-action: none`.

Knob feedback now updates directly without a React render on every pointer move. Its input radius matches the rendered stick travel (32px portrait / 28px short landscape), with an 8% dead zone. Height-only browser resizing no longer resets a held control; real orientation/width changes, blur, cancellation and release still reset input. Unrelated pointer releases cannot interrupt the active stick.

Verified real character positions with temporary canvas diagnostics: short, full and diagonal drags continued moving the character without cancelled input. Landscape joystick + jump reported diagonal input `0.707,0.707` and jump held; releasing both returned input to `0,0` and jump false. Temporary movement diagnostics were removed after verification. The behavior suite now has 310 passing tests. The browser viewport and touch emulation were restored. The current tunnel remains unchanged.
