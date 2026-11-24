# Responsive game interface

UI-only scope: preserve all Three.js scene geometry, character models, camera settings, movement, interactions, inventory, shops, merchant approval and multiplayer systems. No commits and no 2D changes.

Use a full-viewport scene with a separate HTML HUD grid. Shared tokens: forest/ivory palette, 4px spacing scale, 44px controls (48px coarse pointer), 12/18px radii, subtle shadows, readable labels. Reuse all existing callbacks and data models.

Desktop: player/world information and navigation in a compact top bar, Friends/notifications/menu at the right, connection status in a corner, chat at lower left, inventory dock centered, help at lower right. Toasts fade and menus are collapsible.

Phone/tablet: touch-first compact top bar, navigation in a menu, safe-area padding, joystick and jump/interact/action cluster in a dedicated lower row, scrollable item slots below them, small chat launcher and accessible bag button. Landscape uses a shorter control row. Panels scroll within viewport and use 16px input text on touch devices. Lock document scrolling during game play, preserve scrolling within panels, and restore page styles on exit.

Unify world interaction labels and dialog surfaces without altering their target positions or gameplay callbacks. Touch buttons call the existing nearby interaction and farming actions; joystick controller remains unchanged.

Verify TypeScript, existing behavior tests and build. Browser-check desktop 1920×1080, 1600×900, 1440×900, 1366×768; tablet portrait/landscape; phone portrait/landscape. Record screenshots and overlap/bounds/touch-target checks, exercise menus, inventory, chat, friends and virtual controls. Reset viewport overrides afterwards. Preserve current tunnel.

Completed. Verification and screenshots are recorded in `docs/game-ui-verification.md`. All ten requested/additional viewport checks passed, as did 308 behavior tests, TypeScript, scoped lint and the friends build. Browser gesture checks verified simultaneous joystick/jump, release reset, inventory dragging and panel interactions. Temporary viewport/touch overrides were cleared. No commits or 2D edits were made.
