# CORS and Authentication Fixes

## 🐛 Issues Fixed

### 1. CORS Error - Missing Header
**Error:**
```
Access to fetch at 'http://localhost:3001/progress/lessons/...' has been blocked by CORS policy: 
Request header field x-request-id is not allowed by Access-Control-Allow-Headers in preflight response.
```

**Root Cause:**
The backend CORS configuration didn't include `x-request-id` in allowed headers, but the frontend HTTP client was sending it.

**Fix:**
Updated `ventylab-server/src/index.ts`:
```typescript
allowedHeaders: [
  'Content-Type',
  'Authorization',
  'x-user-id',
  'x-auth-token',
  'x-request-id',  // ✅ ADDED
  'cache-control'
],
```

---

### 2. Authentication Token Not Found
**Error:**
```
TypeError: Failed to fetch
getLessonProgress error - Token missing
```

**Root Cause:**
`progressService.ts` was looking for the auth token with the wrong key:
- Looking for: `'ventilab_token'`
- Actual key: `'ventilab_auth_token'` (from authService)

**Fix:**
Updated `ventilab-web/src/services/progressService.ts`:

```typescript
// Before (WRONG):
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('ventilab_token') || sessionStorage.getItem('ventilab_token');
  } catch {
    return null;
  }
}

// After (CORRECT):
import { getAuthToken as getAuthTokenFromService } from './authService';

function getAuthToken(): string | null {
  return getAuthTokenFromService();
}
```

Now it properly retrieves the token from localStorage using the correct key: `'ventilab_auth_token'`.

---

### 3. Progress Bar UI Improvement
**Issue:**
Progress bar was too prominent and verbose.

**Fix:**
Updated `ventilab-web/src/components/LessonProgressBar.tsx`:

**Before:**
- Paper component with elevation
- Full text: "75% completado · Guardando..."
- Lesson title visible
- 4px bar height
- Multiple colors and sections

**After:**
- Minimal, transparent background
- Only percentage: "75%"
- No lesson title
- 3px bar height
- Subtle colors: Grey-blue → Blue → Green
- Small spinner when saving

```tsx
<Box sx={{ 
  backgroundColor: 'transparent',
  backdropFilter: 'blur(8px)' 
}}>
  <LinearProgress 
    value={75} 
    sx={{ 
      height: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      '& .MuiLinearProgress-bar': {
        backgroundColor: progressColor // Dynamic based on %
      }
    }}
  />
  <Box sx={{ 
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end' 
  }}>
    <Typography>75%</Typography>
    {isSaving && <CircularProgress size={12} />}
  </Box>
</Box>
```

---

## 📋 Testing Checklist

### Backend
- [x] CORS headers include `x-request-id`
- [x] Server restarted to apply changes
- [ ] Test endpoint: `GET http://localhost:3001/progress/lessons/:lessonId`
- [ ] Verify CORS preflight passes

### Frontend
- [x] Token retrieved correctly from localStorage
- [x] Token sent in Authorization header
- [x] Progress bar renders with minimal UI
- [ ] Progress bar updates on scroll
- [ ] Auto-save triggers correctly
- [ ] Confetti shows on completion

---

## 🔍 How to Verify

### 1. Check Backend is Running
```bash
# Terminal with ventylab-server
# Should show:
🚀 Servidor corriendo en http://localhost:3001
```

### 2. Check Token in Browser
Open DevTools Console:
```javascript
localStorage.getItem('ventilab_auth_token')
// Should return a JWT token string
```

### 3. Check Network Requests
Open DevTools Network tab, filter by "progress":
- Request should have: `Authorization: Bearer eyJ...`
- Request should have: `x-request-id: <uuid>`
- Response should be: 200 OK (not 401 or CORS error)

### 4. Check Progress Bar
- Should appear at top of lesson page
- Shows only percentage (e.g., "75%")
- Changes color: Grey-blue → Blue → Green
- Small spinner appears when saving

---

## 🚀 Next Steps

1. **Test in Browser:**
   - Navigate to any lesson
   - Verify progress bar appears
   - Scroll down and watch progress increase
   - Check Network tab for successful API calls

2. **If Still Not Working:**

   **Backend not restarted?**
   ```bash
   cd ventylab-server
   Ctrl+C
   npm run dev
   ```

   **Token not found?**
   - Make sure you're logged in
   - Check: `localStorage.getItem('ventilab_auth_token')`
   - Try logging out and back in

   **CORS still failing?**
   - Clear browser cache
   - Hard refresh: Ctrl+Shift+R
   - Check backend console for CORS errors

3. **Monitor Console:**
   - Backend: Check for incoming requests
   - Frontend: Check for errors in DevTools console

---

## 📝 Summary of Files Changed

### Backend (ventylab-server)
- ✅ `src/index.ts` - Added `x-request-id` to CORS allowed headers

### Frontend (ventilab-web)
- ✅ `src/services/progressService.ts` - Fixed token retrieval
- ✅ `src/components/LessonProgressBar.tsx` - Simplified UI
- ✅ `src/components/teaching/components/LessonViewer.jsx` - Integrated progress tracking

---

## 🎯 Expected Behavior

When everything is working correctly:

1. **On lesson load:**
   - Progress bar appears at top
   - Shows previous progress if any
   - Resume alert appears if progress > 5%

2. **While scrolling:**
   - Progress percentage updates in real-time
   - Every 10% increase triggers auto-save (debounced)
   - Spinner appears briefly during save

3. **At 90% progress:**
   - Lesson auto-completes
   - Confetti animation plays
   - Success message: "¡Lección completada! ✅"

4. **Network activity:**
   - PUT requests to `/progress/lesson/:lessonId`
   - Include auth token
   - Return 200 OK
   - Update module progress automatically

---

**Status:** ✅ Fixes applied, ready for testing

**Last Updated:** 2026-01-14
