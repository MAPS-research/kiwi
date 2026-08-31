# Kiwi Apps - Frontend Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing the Kiwi Apps system through the frontend UI. No backend knowledge or API calls required - everything is done through the browser interface.

**Target Audience**: QA testers, product managers, instructors, students

**Time Required**: 2-3 hours for complete walkthrough

**Prerequisites**:
- Access to Kiwi platform (dev/staging environment)
- Test accounts with different roles (admin, professor, student)
- Sample Kiwi App running (e.g., codegen app on localhost:8000)

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Admin Workflows](#2-admin-workflows---app-registration--approval)
3. [Professor Workflows](#3-professor-workflows---class-app-management)
4. [Student Workflows](#4-student-workflows---using-kiwi-apps)
5. [Security & Edge Cases](#5-security--edge-cases)
6. [Visual Regression Checklist](#6-visual-regression-checklist)
7. [Common Issues & Troubleshooting](#7-common-issues--troubleshooting)

---

## 1. Test Environment Setup

### 1.1 Test Accounts

You'll need three accounts with different roles:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | `admin@test.com` | `test123` | Approve apps and prompts |
| Professor | `prof@test.com` | `test123` | Enable apps for classes |
| Student | `student@test.com` | `test123` | Use apps in class context |

### 1.2 Test Class

Ensure there's a test class:
- **Class Name**: "CS101: Intro to Programming"
- **Class Code**: "CS101"
- **Professor**: `prof@test.com`
- **Students**: `student@test.com` enrolled

### 1.3 Test Kiwi App

A sample app should be running:
- **App Name**: "Code Exercise Helper"
- **URL**: `http://localhost:8000`
- **Features**: Hints, error explanations, code feedback

### 1.4 Browser Setup

- Use **Chrome** or **Firefox** (latest version)
- Open **Developer Tools** (F12) - keep Console tab visible
- Clear browser cache and cookies before starting
- Disable browser extensions that might interfere

---

## 2. Admin Workflows - App Registration & Approval

### Test Scenario 2.1: Whitelist a New App

**Goal**: Add a new app to the whitelist so it can register

**Steps**:

1. **Login as Admin**
   - Go to: `http://localhost:3001/login`
   - Enter: `admin@test.com` / `test123`
   - Click "Sign In"

2. **Navigate to Kiwi Apps Admin**
   - Click "Admin" in top navigation
   - Click "Kiwi Apps" in sidebar
   - You should see "Kiwi Apps Management" page

3. **View Whitelist**
   - Click "Whitelist" tab
   - You should see a table with existing whitelisted apps
   - Check that columns show: Slug, Base URL, Status, Description, Created At

4. **Add New Whitelist Entry**
   - Click "+ Add to Whitelist" button
   - A modal should appear: "Add App to Whitelist"

   **Fill in the form**:
   - **App Slug**: `test-code-helper` (must be unique, lowercase, hyphens only)
   - **Base URL**: `http://localhost:8000`
   - **Registration Secret**: `my-secret-password-123` (min 8 characters)
   - **Status**: Select "Approved" from dropdown
   - **Description**: `Test app for code exercises with AI hints`
   - **Max Scopes**: Click "Add Scope" and enter:
     - `llm:prompt:*`
     - `user:profile:read`
     - `class:info:read`

   - Click "Create Whitelist Entry"

5. **Verify Creation**
   - Modal should close
   - You should see success message: "Whitelist entry created"
   - New entry should appear in whitelist table
   - Status badge should be green "Approved"
   - **Important**: The registration secret should NOT be visible in the table (security check)

**Expected Result**: ✅ App is whitelisted and can now register

**Screenshot Checkpoints**:
- [ ] Whitelist table shows new entry
- [ ] Status is "Approved" (green badge)
- [ ] Secret is hidden/not displayed

---

### Test Scenario 2.2: Review and Approve App Prompts

**Goal**: After an app self-registers, approve its LLM prompts

**Prerequisites**: App has already registered (via API or self-registration flow)

**Steps**:

1. **Navigate to Registered Apps**
   - In "Kiwi Apps Management" page
   - Click "Registered Apps" tab
   - You should see a table of apps that have registered
   - Locate "test-code-helper" app (or your app name)

2. **View App Details**
   - Click on the app row or "View Details" button
   - App details page should open showing:
     - App name, slug, version
     - Base URL
     - Category, capabilities
     - UIs table (showing registered UI components)
     - **Prompts table** (this is what we'll approve)

3. **Review Prompts**
   - In the "Prompts" section, you should see prompts like:
     - `hint` - "Hint Generator" (Status: Inactive ⚠️)
     - `explain` - "Error Explainer" (Status: Inactive ⚠️)

   - Click "View" next to the "hint" prompt
   - A modal should open showing:
     - Prompt ID
     - Name and description
     - **System Prompt** (the full AI instructions)
     - Max tokens, temperature settings
     - Status: Inactive

4. **Approve the Prompt**
   - Read the system prompt carefully (security check - ensure it's appropriate)
   - If acceptable, click "Approve Prompt" button
   - Confirmation dialog: "Are you sure you want to approve this prompt?"
   - Click "Confirm"

5. **Verify Approval**
   - Modal should close
   - Success message: "Prompt approved successfully"
   - Prompt row should now show Status: Active ✅ (green badge)
   - "Approved By" column should show your admin email
   - "Approved At" should show current timestamp

6. **Repeat for Other Prompts**
   - Approve the "explain" prompt
   - Approve any other inactive prompts

**Expected Result**: ✅ All prompts are now active and can be used by students

**Screenshot Checkpoints**:
- [ ] Prompt details modal displays full system prompt
- [ ] Status changes from Inactive to Active
- [ ] Approved by/at information displayed

---

### Test Scenario 2.3: Revoke a Prompt (Security Test)

**Goal**: Test that admins can revoke prompts if they contain inappropriate content

**Steps**:

1. **Locate Active Prompt**
   - In app details page, find an active prompt
   - Click "Actions" dropdown next to the prompt
   - Select "Revoke Prompt"

2. **Confirm Revocation**
   - Warning dialog: "This will immediately disable the prompt for all users"
   - Click "Revoke"

3. **Verify Revocation**
   - Status changes to Inactive ⚠️
   - Prompt can no longer be used by students
   - Apps using this prompt will receive "not active" errors

**Expected Result**: ✅ Prompt immediately deactivated

---

### Test Scenario 2.4: Edit Whitelist Entry

**Goal**: Update an existing whitelist entry (e.g., change max scopes)

**Steps**:

1. **Go to Whitelist Tab**
   - Click "Whitelist" tab in Kiwi Apps Management

2. **Edit Entry**
   - Find "test-code-helper" entry
   - Click "Edit" button (pencil icon)
   - Modal opens with current values pre-filled

3. **Modify Scopes**
   - Remove scope: `class:info:read` (click X next to it)
   - Add new scope: `class:enrollments:read`
   - Update description: `Updated description after review`
   - Click "Update Whitelist Entry"

4. **Verify Update**
   - Modal closes
   - Success message displayed
   - Table shows updated description
   - Click "View Scopes" to verify scope changes

**Expected Result**: ✅ Whitelist entry updated successfully

---

## 3. Professor Workflows - Class App Management

### Test Scenario 3.1: Enable a Kiwi App for Your Class

**Goal**: Add a registered Kiwi App to your class so students can use it

**Steps**:

1. **Login as Professor**
   - Logout from admin account
   - Login with: `prof@test.com` / `test123`

2. **Navigate to Your Class**
   - Go to "My Classes" from top navigation
   - Click on "CS101: Intro to Programming"
   - You should see the class dashboard

3. **Access Kiwi Apps Settings**
   - In the class dashboard, look for "Settings" or "Apps" tab
   - Click "Kiwi Apps" in the sidebar
   - You should see "Manage Class Apps" page

4. **View Available Apps**
   - Click "+ Add App to Class" button
   - A modal opens showing available apps:
     - List of all active, registered Kiwi Apps
     - Each shows: Name, Description, Category, Icon

5. **Add App to Class**
   - Find "Code Exercise Helper" app
   - Click "Add to Class" button next to it

   **Configure the app**:
   - **Tab Label**: `Code Help` (how it appears to students)
   - **Tab Order**: `0` (position in tab bar)
   - **Enabled Scopes**: Check the scopes you want to grant:
     - ✅ `llm:prompt:hint`
     - ✅ `llm:prompt:explain`
     - ✅ `user:profile:read`
     - ⬜ `class:info:read` (leave unchecked for this test)
   - **App Configuration** (JSON):
     ```json
     {
       "difficulty": "beginner",
       "maxHintsPerDay": 5
     }
     ```

   - Click "Enable App"

6. **Verify App Added**
   - Modal closes
   - Success message: "App enabled for class"
   - App appears in "Enabled Apps" table with:
     - Tab label "Code Help"
     - Tab order 0
     - Status: Enabled ✅
     - Enabled scopes count (3 scopes)

**Expected Result**: ✅ App is now available to students in this class

**Screenshot Checkpoints**:
- [ ] Add App modal shows available apps
- [ ] Configuration form is intuitive
- [ ] Enabled apps table shows new entry

---

### Test Scenario 3.2: Reorder Class App Tabs

**Goal**: Change the order in which app tabs appear to students

**Prerequisites**: At least 2 apps enabled for the class

**Steps**:

1. **View Enabled Apps**
   - In "Manage Class Apps" page
   - You should see multiple apps in the table
   - Each has a "Tab Order" column

2. **Reorder Apps**
   - Method 1: Drag and drop (if UI supports it)
     - Click and hold the drag handle (⋮⋮) on left side
     - Drag app to new position
     - Drop it

   - Method 2: Edit tab order (if no drag-drop)
     - Click "Reorder" button
     - Modal opens with list of apps and number inputs
     - Change tab order numbers:
       - "Code Help" → Order: 1
       - "Other App" → Order: 0
     - Click "Save Order"

3. **Verify Reorder**
   - Apps in table should be sorted by tab order
   - Success message: "App order updated"
   - Changes should be visible immediately to students

**Expected Result**: ✅ Tab order changed

---

### Test Scenario 3.3: Modify App Configuration for Class

**Goal**: Update app-specific settings for this class

**Steps**:

1. **Edit App Configuration**
   - In enabled apps table, find "Code Help" app
   - Click "Edit" button (pencil icon)
   - Modal opens with current configuration

2. **Update Settings**
   - **Tab Label**: Change to `AI Code Tutor`
   - **Update Scopes**: Add `class:info:read` scope
   - **Update Config**:
     ```json
     {
       "difficulty": "intermediate",
       "maxHintsPerDay": 10
     }
     ```
   - Click "Update App"

3. **Verify Update**
   - Tab label in table shows "AI Code Tutor"
   - Scopes count increased
   - Configuration JSON updated
   - Students see new tab label immediately

**Expected Result**: ✅ App configuration updated

---

### Test Scenario 3.4: Disable an App for Class

**Goal**: Temporarily remove app access from students

**Steps**:

1. **Disable App**
   - In enabled apps table, find "Code Help" app
   - Click "Actions" dropdown
   - Select "Disable App"
   - Confirmation: "Students will lose access immediately"
   - Click "Disable"

2. **Verify Disabled**
   - App row now shows Status: Disabled ⚠️
   - Students can no longer see or access the app
   - Tab disappears from student view

3. **Re-enable App**
   - Click "Actions" → "Enable App"
   - App becomes active again immediately

**Expected Result**: ✅ App disabled and re-enabled successfully

---

## 4. Student Workflows - Using Kiwi Apps

### Test Scenario 4.1: Access Kiwi App in Class

**Goal**: As a student, find and open a Kiwi App enabled for your class

**Steps**:

1. **Login as Student**
   - Logout from professor account
   - Login with: `student@test.com` / `test123`

2. **Navigate to Class**
   - Click "My Classes" in navigation
   - Click "CS101: Intro to Programming"
   - You should see the class home page

3. **Locate Kiwi App Tab**
   - Look at the horizontal tab bar below class name
   - You should see tabs like: Home, Materials, Chat, **AI Code Tutor** (our app)
   - The app tab should have:
     - Custom label ("AI Code Tutor")
     - App icon (if provided)
     - Position based on tab order

4. **Open Kiwi App**
   - Click "AI Code Tutor" tab
   - Page should load with:
     - Loading spinner initially
     - Then iframe containing the app UI
     - App should fill the content area (below tabs)

5. **Verify App Loaded**
   - Open browser DevTools (F12) → Console tab
   - Check for messages like:
     ```
     [KiwiApp] Token received from parent
     [KiwiApp] Initializing app with scopes: ["llm:prompt:hint", "llm:prompt:explain", "user:profile:read"]
     ```
   - App UI should be functional (not showing errors)

**Expected Result**: ✅ App loads successfully in iframe

**Screenshot Checkpoints**:
- [ ] App tab visible in tab bar
- [ ] App iframe loads without errors
- [ ] App UI is responsive and interactive

---

### Test Scenario 4.2: Use App Feature (Ask for Hint)

**Goal**: Test the main functionality - using an approved LLM prompt

**Steps**:

1. **In the App UI**
   - You should see an interface for code exercises
   - Example: Text editor with starter code, "Get Hint" button

2. **Enter Code Problem**
   - Type or paste sample code:
     ```python
     for i in range(5)
         print(i)
     ```
   - (Code has an error - missing colon)

3. **Request Hint**
   - Click "Get Hint" button
   - Loading indicator should appear

4. **Receive AI Response**
   - After 2-3 seconds, hint appears:
     ```
     It looks like you're missing a colon after the for statement.
     In Python, for loops need a colon at the end of the header line.
     ```
   - Response should be helpful and appropriate (not revealing full answer)

5. **Verify in DevTools**
   - Check Console for:
     ```
     [KiwiApp] Calling MCP tool: kiwi_app_chat
     [KiwiApp] Using prompt: hint
     [KiwiApp] Response received
     ```
   - Check Network tab:
     - POST to `/mcp/rpc`
     - Status: 200 OK
     - Request body includes `kiwi_app_chat` tool call
     - Response includes AI-generated text

**Expected Result**: ✅ Hint generated successfully using approved prompt

**What to Check**:
- [ ] Response is relevant to the code
- [ ] Response follows the approved system prompt style
- [ ] No error messages or crashes
- [ ] Loading states work correctly

---

### Test Scenario 4.3: Try Multiple App Features

**Goal**: Test different prompts (hint, explain error, etc.)

**Steps**:

1. **Use "Explain Error" Feature**
   - Click "Explain This Error" button
   - Enter error message:
     ```
     SyntaxError: invalid syntax (line 1)
     ```
   - Receive explanation about Python syntax errors

2. **Use "Get Feedback" Feature**
   - Click "Get Feedback on Code"
   - Submit working code
   - Receive constructive feedback

3. **Verify Different Prompts**
   - Each feature uses a different approved prompt
   - Check DevTools for different `promptId` values:
     - `hint`
     - `explain`
     - `feedback`

**Expected Result**: ✅ All features work using their respective approved prompts

---

### Test Scenario 4.4: Access User Profile (Scope Check)

**Goal**: Verify app can access user profile with granted scope

**Steps**:

1. **In App UI**
   - Look for "My Progress" or "Settings" section
   - This feature reads your user profile

2. **View Profile Info**
   - App should display:
     - Your name
     - Your email
     - Your enrollment status
   - This data comes from the MCP `user://profile` resource

3. **Verify in DevTools**
   - Check Network tab for:
     - POST to `/mcp/rpc`
     - Method: `resources/read`
     - URI: `user://profile`
     - Response includes your user data

**Expected Result**: ✅ App can read your profile (scope: `user:profile:read`)

---

### Test Scenario 4.5: Attempt Unauthorized Action (Security Test)

**Goal**: Verify app CANNOT access data outside its scopes

**Steps**:

1. **Trigger Restricted Action**
   - In the app, try to access a feature that requires `class:enrollments:read` scope
   - (Recall: Professor only granted `user:profile:read`, NOT class enrollments)

2. **Expected Behavior**:
   - App tries to call MCP resource: `class://CS101/enrollments`
   - Request fails with 403 Forbidden
   - App shows error message: "You don't have permission to view class enrollments"

3. **Verify in DevTools**
   - Console shows:
     ```
     [KiwiApp] Error: Missing required scope: class:enrollments:read
     ```
   - Network tab shows:
     - POST to `/mcp/rpc` → Status: 403

**Expected Result**: ✅ App blocked from accessing out-of-scope data (SECURITY PASS)

---

### Test Scenario 4.6: Multi-Student Concurrent Usage

**Goal**: Verify multiple students can use the app simultaneously

**Steps**:

1. **Open Incognito Window**
   - Open a new incognito/private window
   - Login as: `student2@test.com` / `test123`
   - Navigate to CS101 class → AI Code Tutor tab

2. **Both Students Use App**
   - Student 1 (original window): Ask for hint
   - Student 2 (incognito): Ask for hint at same time

3. **Verify Isolation**
   - Each student receives their own response
   - No data leakage between students
   - Both requests process successfully
   - Each has their own app-scoped token

**Expected Result**: ✅ Concurrent usage works correctly

---

## 5. Security & Edge Cases

### Test Scenario 5.1: Unapproved Prompt Usage

**Goal**: Verify students cannot use prompts that admins haven't approved

**Prerequisites**:
- App has a prompt "cheat" that is NOT approved
- Professor enabled the app for class

**Steps**:

1. **As Student, Open App**
   - Navigate to AI Code Tutor tab

2. **Try to Use Unapproved Prompt**
   - If app has a "Get Full Solution" button (uses "cheat" prompt)
   - Click the button
   - App attempts to call `kiwi_app_chat` with `promptId: "cheat"`

3. **Expected Behavior**:
   - Request fails with error
   - Error message: "Prompt 'cheat' is not active (requires admin approval)"
   - No LLM response generated

4. **Verify in DevTools**
   - Network tab shows 403 Forbidden
   - Error payload includes "not active"

**Expected Result**: ✅ Unapproved prompt blocked (SECURITY PASS)

---

### Test Scenario 5.2: Token Expiration

**Goal**: Verify app handles expired tokens gracefully

**Steps**:

1. **Open App and Wait**
   - As student, open AI Code Tutor tab
   - App receives token (valid for 1 hour)
   - Wait for token to expire (or manually expire in backend)

2. **Try to Use Expired Token**
   - After expiration, click "Get Hint"
   - App tries to call MCP with expired token

3. **Expected Behavior**:
   - Request fails with 401 Unauthorized
   - App shows message: "Your session has expired. Please refresh the page."
   - App should have a "Refresh" button

4. **Refresh and Continue**
   - Click "Refresh" or reload page
   - App receives new token
   - Feature works again

**Expected Result**: ✅ Expired token handled gracefully

---

### Test Scenario 5.3: App Disabled Mid-Session

**Goal**: Test behavior when professor disables app while student is using it

**Setup**: Have two browser windows open:
- Window 1: Student using app
- Window 2: Professor in class settings

**Steps**:

1. **Student Actively Using App**
   - Window 1 (student): Have app open and working

2. **Professor Disables App**
   - Window 2 (professor): Disable the app for class
   - Verify disabled in settings

3. **Student Tries to Continue**
   - Window 1 (student): Click "Get Hint" again
   - App tries to make MCP call

4. **Expected Behavior**:
   - Request fails (app no longer enabled)
   - Error message: "This app has been disabled for the class"
   - Student cannot generate new tokens
   - Existing tab might show warning banner

**Expected Result**: ✅ App access revoked immediately

---

### Test Scenario 5.4: Cross-App Token Reuse (Security Test)

**Goal**: Verify tokens for App A cannot be used with App B

**Prerequisites**: Two apps enabled: "Code Helper" and "Analytics Dashboard"

**Steps**:

1. **Get Token for Code Helper**
   - Open Code Helper app tab
   - DevTools: Copy the app token from console logs
   - Note it's for `appSlug: "code-helper"`

2. **Try to Use Token in Analytics App**
   - Open Analytics Dashboard tab in another tab
   - In DevTools console, manually inject the Code Helper token
   - Try to make an MCP call with Analytics-specific prompt

3. **Expected Behavior**:
   - Request rejected with error:
     "App token is for 'code-helper' but request is for 'analytics-dashboard'"
   - No data leak between apps

**Expected Result**: ✅ Cross-app token usage prevented (SECURITY PASS)

---

## 6. Visual Regression Checklist

Check these UI elements across different screen sizes:

### Desktop (1920x1080)
- [ ] App tab displays correctly in tab bar
- [ ] Iframe scales to full content area
- [ ] No horizontal scrollbars
- [ ] All buttons and controls visible
- [ ] Modal dialogs centered

### Tablet (768x1024)
- [ ] Tab bar responsive (may become dropdown)
- [ ] App iframe adjusts width
- [ ] Touch-friendly button sizes
- [ ] Forms remain usable

### Mobile (375x667)
- [ ] App optimized for mobile view
- [ ] Tabs become hamburger menu
- [ ] No tiny text or buttons
- [ ] Gestures work (scroll, tap)

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Dark Mode
- [ ] Admin interface supports dark mode
- [ ] App iframe respects theme preference
- [ ] No contrast issues

---

## 7. Common Issues & Troubleshooting

### Issue 1: App Tab Not Appearing

**Symptoms**: Student doesn't see app tab in class

**Check**:
1. Is app enabled for this class? (Professor → Manage Apps)
2. Is student enrolled in the class?
3. Does the UI have `allowedRoles` including "student"?
4. Is app placement set to "class-tab"?
5. Is app status "Active" (not disabled)?

**Fix**:
- Professor: Re-enable app with correct settings
- Check UI placement in app registration

---

### Issue 2: "Prompt Not Active" Error

**Symptoms**: App feature returns "Prompt is not active" error

**Check**:
1. Admin → Kiwi Apps → View app → Prompts
2. Is the prompt status "Active"? (green badge)
3. Did admin approve the prompt?

**Fix**:
- Admin: Navigate to prompts and click "Approve"
- Wait a few seconds for cache to update

---

### Issue 3: "Missing Required Scope" Error

**Symptoms**: App feature fails with 403 Forbidden

**Check**:
1. Professor → Class Settings → Kiwi Apps → Edit app
2. Check "Enabled Scopes" list
3. Does it include the scope the app needs?

**Fix**:
- Professor: Edit app configuration
- Add the required scope to "Enabled Scopes"
- Save changes

---

### Issue 4: Token Not Received in Iframe

**Symptoms**: App shows "Waiting for authentication..." forever

**Check DevTools Console**:
```javascript
// Should see:
[Kiwi] Sending token to app iframe
[KiwiApp] Token received from parent
```

**If Not Receiving**:
1. Check iframe `src` matches app `baseUrl` in registry
2. Verify app has `window.addEventListener('message', ...)` listener
3. Check browser console for CORS errors
4. Ensure app origin is whitelisted

**Fix**:
- Backend: Update app baseUrl in registry
- App: Implement proper postMessage listener
- Check for browser extensions blocking postMessage

---

### Issue 5: App UI Broken/Not Loading

**Symptoms**: Iframe shows error page or blank screen

**Check**:
1. Is the app server running? (`http://localhost:8000`)
2. Network tab: Does iframe load? (200 OK)
3. Console: Any JavaScript errors in iframe?
4. CORS errors?

**Fix**:
- Start the app server
- Check app's CORS configuration
- Verify app's `baseUrl` is correct

---

## Test Report Template

Use this template to document your test session:

```markdown
# Kiwi Apps Frontend Test Report

**Date**: [YYYY-MM-DD]
**Tester**: [Your Name]
**Environment**: [dev/staging]
**Browser**: [Chrome 120.0]

## Test Summary
- Total Scenarios Tested: [XX]
- Passed: [XX]
- Failed: [XX]
- Blocked: [XX]

## Scenarios Tested

### Admin Workflows
- [✅/❌] 2.1: Whitelist new app
- [✅/❌] 2.2: Approve app prompts
- [✅/❌] 2.3: Revoke prompt
- [✅/❌] 2.4: Edit whitelist entry

### Professor Workflows
- [✅/❌] 3.1: Enable app for class
- [✅/❌] 3.2: Reorder app tabs
- [✅/❌] 3.3: Modify app config
- [✅/❌] 3.4: Disable app

### Student Workflows
- [✅/❌] 4.1: Access app in class
- [✅/❌] 4.2: Use app feature (hint)
- [✅/❌] 4.3: Try multiple features
- [✅/❌] 4.4: Access user profile
- [✅/❌] 4.5: Unauthorized action blocked
- [✅/❌] 4.6: Concurrent usage

### Security Tests
- [✅/❌] 5.1: Unapproved prompt blocked
- [✅/❌] 5.2: Token expiration handled
- [✅/❌] 5.3: App disabled mid-session
- [✅/❌] 5.4: Cross-app token reuse prevented

## Issues Found

### Issue 1: [Title]
- **Scenario**: [Which test scenario]
- **Severity**: [Critical/High/Medium/Low]
- **Steps to Reproduce**:
  1. [Step 1]
  2. [Step 2]
- **Expected**: [What should happen]
- **Actual**: [What actually happened]
- **Screenshots**: [Attach screenshots]

## Browser Compatibility
- Chrome: [✅/❌]
- Firefox: [✅/❌]
- Safari: [✅/❌]
- Edge: [✅/❌]

## Responsive Design
- Desktop: [✅/❌]
- Tablet: [✅/❌]
- Mobile: [✅/❌]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]

## Sign-off
- [ ] All critical scenarios passed
- [ ] Security tests passed
- [ ] No blocking issues
- [ ] Ready for deployment

**Tester Signature**: _______________
**Date**: _______________
```

---

## Quick Reference Card

**Admin Tasks**:
- Whitelist app: Admin → Kiwi Apps → Whitelist → Add
- Approve prompts: Admin → Kiwi Apps → View App → Prompts → Approve

**Professor Tasks**:
- Enable app: Class → Kiwi Apps → Add App
- Configure scopes: Edit App → Enabled Scopes
- Reorder tabs: Manage Apps → Reorder

**Student Tasks**:
- Use app: Class → [App Tab Name]
- Get help: Click app features (Get Hint, Explain Error, etc.)

**DevTools Checks**:
- Console: Look for `[KiwiApp]` and `[Kiwi]` logs
- Network: Check `/mcp/rpc` calls (status 200)
- Application: Check localStorage for tokens (shouldn't be there - memory only)

---

**End of Frontend Testing Guide**

For questions or issues, contact the development team.
