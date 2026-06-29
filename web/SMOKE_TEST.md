# Smoke Test Checklist

## Pre-flight
- [ ] Start the Go backend: `./config-hub`
- [ ] Open http://localhost:1323 in a browser
- [ ] Open browser DevTools console to check for errors

## Login Page
- [ ] Split-screen layout displays correctly on desktop
- [ ] Left branding panel is visible on desktop
- [ ] Login form is accessible on mobile (stacks vertically)
- [ ] Enter invalid credentials → error message appears
- [ ] Enter valid credentials → redirects to Dashboard
- [ ] Check "Remember me" → login, close browser, reopen → still logged in
- [ ] Uncheck "Remember me" → login, close browser, reopen → logged out
- [ ] "Forgot password?" link is visible but disabled (informational only)
- [ ] Copyright footer displays "© 2026 Config Hub"

## Dashboard
- [ ] Three stat cards display: Users=1, Subscriptions count, Profiles count
- [ ] Left sidebar shows profile list
- [ ] Click a profile → center panel loads proxy groups, rules, tokens
- [ ] Right panel shows YAML preview
- [ ] Drag and drop proxy groups to reorder → order persists
- [ ] Click "Edit" on a profile → ProfileEditor modal opens
- [ ] Edit profile name → save → name updates in list
- [ ] Click "Delete" on a profile → confirmation dialog appears → confirm → profile deleted
- [ ] Click "Add Profile" → empty form appears → fill and save → new profile appears

## Subscriptions
- [ ] Table displays subscriptions with name, URL, status
- [ ] Click expand arrow on a subscription → nodes list appears
- [ ] Click "Add Subscription" → modal opens → fill form → save → subscription appears
- [ ] Toggle enable/disable switch → status updates
- [ ] Click "Edit" → modal opens with pre-filled data → save → updates
- [ ] Click "Delete" → confirmation dialog → confirm → subscription removed
- [ ] Click "Refresh" on a subscription → nodes reload

## Account/Settings
- [ ] User information card displays username, created_at (formatted date)
- [ ] Edit username inline → save → username updates
- [ ] Change password form: old password, new password, confirm password
- [ ] Submit with mismatched passwords → error message
- [ ] Submit with valid data → success message

## Token Manager (in Dashboard)
- [ ] Token table displays existing tokens
- [ ] Click "Generate New Token" → modal opens
- [ ] Enter token name → generate → token and share URL displayed
- [ ] Click copy buttons → token/URL copied to clipboard
- [ ] Click "Revoke" on a token → confirmation dialog → confirm → token removed

## Global Features
- [ ] Language toggle (top-right) → switches between English and Chinese
- [ ] Theme toggle (top-right) → switches between light and dark mode
- [ ] Theme preference persists after page reload
- [ ] Sidebar navigation: Dashboard, Subscriptions, Settings → all work
- [ ] Logout button → returns to login page
- [ ] Mobile layout: sidebar collapses, hamburger menu appears
- [ ] Mobile: click hamburger → sidebar slides in
- [ ] Mobile: click outside sidebar → sidebar closes
- [ ] Keyboard navigation: Tab through nav items, Enter to activate
- [ ] All modals: focus trapping works, Escape closes modal
- [ ] All forms: validation errors display correctly
- [ ] All delete/revoke actions: confirmation dialogs appear

## Browser Console
- [ ] No JavaScript errors in console
- [ ] No "Missing translation" warnings (or minimal)
- [ ] No 404 errors for assets

## Performance
- [ ] Page load time < 3 seconds
- [ ] No layout shifts during navigation
- [ ] Smooth transitions on hover/click

## Cross-browser (if time permits)
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
