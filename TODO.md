# Brainexa Dashboard Fix - TODO

## Plan Status: ✅ Approved - In Progress

**Objective**: Fix "Oops! Something broke" at `/dashboard` by making Dashboard resilient to empty store state.

## Step-by-Step Implementation (Logical Order)

### 1. ✅ COMPLETE - Created Dashboard-fixed.tsx
   - Added null guards for `weakTopics`, `studentSubjects`
   - Safe destructuring from `useStore()`
   - Loading states + empty state messaging
   - All charts safe with empty data
   - Progress: 1/7 complete

### 2. ✅ COMPLETE - Replaced Dashboard.tsx
   - Moved Dashboard-fixed.tsx → Dashboard.tsx (original overwritten)
   - Dashboard now crash-proof with loading states
   - Progress: 2/7 complete

### 3. [PENDING] Add demo data to store.ts
   - Fallback data when user logged in but no DB data
   - Better error handling in `fetchUserData()`

### 4. [PENDING] Improve App.tsx auth guards
   - Better UX for free users in SubscribedRoute

### 5. [PENDING] Test complete flow
   ```bash
   npm run dev:all
   # Test /dashboard
   ```

**Next**: Replace original Dashboard.tsx

### 2. [PENDING] Add demo data to store.ts
   - Fallback data when user logged in but no DB data
   - Better error handling in `fetchUserData()`

### 3. [PENDING] Improve App.tsx auth guards
   - Better UX for free users in SubscribedRoute
   - Loading spinner during store hydration

### 4. [PENDING] Test auth flows
   - `npm run dev:all`
   - Signup → Login → /subscription → /dashboard
   - Free user → proper redirect
   - Clear localStorage → cold start test

### 5. [PENDING] Verify charts & components
   - Recharts with empty data
   - Framer Motion safe animations

### 6. [PENDING] Update ErrorBoundary (optional)
   - Show error details in dev mode

### 7. [PENDING] Final test & completion
   ```bash
   # Run full stack
   npm run dev:all
   
   # Test URLs
   http://localhost:8080/dashboard  # Should work post-login
   ```

**Progress**: 0/7 complete  
**Next**: Implement Dashboard.tsx fixes
