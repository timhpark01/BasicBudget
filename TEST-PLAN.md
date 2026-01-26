# Import CSV Test Plan

## Test File: test-import.csv

This CSV file contains 41 rows designed to test every edge case of the Import CSV feature.

## Expected Results Summary

After importing `test-import.csv`, you should see:

### Valid Transactions: ~23
- Existing categories: 15 transactions
- Unknown categories that need mapping: 8 transactions (Entertainment, Bills, UnmappedCategory1-3)

### Invalid Rows: ~12
- Invalid dates: 4 rows (lines 11-14)
- Invalid amounts: 4 rows (lines 20-23)
- Missing required fields: 4 rows (lines 24-27)

### Duplicates: 2
- Row 29 and 33 (same date, category, amount)
- Row 28 and 29 (same date, category, amount)

---

## Detailed Test Cases

### ✅ Valid Transactions with Existing Categories (Lines 2-4, 7, 14-17, 19, 25, 32, 34, 38)

**Categories:** Groceries, Dining, Transport, Drinks
- Line 2: `2026-01-15,Groceries,Weekly shopping at Whole Foods,125.50`
- Line 3: `2026-01-14,Dining,Lunch at restaurant,25.00`
- Line 4: `2026-01-13,Transport,Uber to work,15.75`
- Line 7: `2026-01-10,Groceries,Milk and bread,12.30`

**Expected:** These should map automatically to existing categories and appear in the "Valid" tab.

---

### 🆕 Unknown Categories Requiring Mapping (Lines 5-6, 9-10, 39-41)

**Categories:** Entertainment, Bills, UnmappedCategory1, UnmappedCategory2, UnmappedCategory3
- Line 5: `2026-01-12,Entertainment,Movie tickets and popcorn,45.00`
- Line 6: `2026-01-11,Bills,Electric bill payment,89.99`
- Line 9: `2026-01-08,Entertainment,Concert tickets,$120.00`
- Line 39: `2025-12-16,UnmappedCategory1,First unknown category,60.00`
- Line 40: `2025-12-15,UnmappedCategory2,Second unknown category,70.00`
- Line 41: `2025-12-14,UnmappedCategory3,Third unknown category,80.00`

**Expected:**
- Category Mapping section appears
- Each unknown category shows a card with:
  - Dropdown to select existing category OR "Create New Category"
  - When "Create New Category" selected, form expands with:
    - Name field (editable, pre-filled with CSV name)
    - Icon picker
    - Color picker
    - Live preview
- Import button disabled until all categories mapped

**Test Actions:**
1. Map "Entertainment" → Create new with custom icon/color
2. Map "Bills" → Create new with custom icon/color
3. Map "UnmappedCategory1" → Map to existing "Groceries"
4. Map "UnmappedCategory2" → Map to existing "Transport"
5. Map "UnmappedCategory3" → Create new, rename to "Utilities"

---

### ✅ Multiple Date Format Support (Lines 2-10)

**Supported formats:**
- Line 2: `2026-01-15,Groceries,...` (YYYY-MM-DD format)
- Line 5: `01/12/2026,Entertainment,...` (MM/DD/YYYY - US format)
- Line 6: `01/11/2026,Bills,...` (MM/DD/YYYY - US format)
- Line 7: `11/01/2026,Groceries,...` (DD/MM/YYYY - European format, day > 12)
- Line 8: `10-01-2026,Dining,...` (DD-MM-YYYY - dash variant)
- Line 9: `2026/01/08,Entertainment,...` (YYYY/MM/DD - slash variant)

**Expected:**
- All these dates should parse correctly
- Show in "Valid" tab with proper date display
- Dates converted to proper JavaScript Date objects

### ❌ Invalid Date Formats (Lines 12-14)

- Line 12: `01-04-2026,Dining,Wrong date format,20.00` ❌ (ambiguous format not supported)
- Line 13: `2026-13-01,Transport,Invalid month,15.00` ❌ (month 13 doesn't exist)
- Line 14: `2026-01-32,Groceries,Invalid day,25.00` ❌ (day 32 doesn't exist in January)

**Expected:**
- These rows appear in "Invalid" tab
- Each shows error: "Invalid date format" or "Invalid date"

---

### ❌ Invalid Amounts (Lines 20-23)

- Line 20: `2025-12-29,InvalidAmount,Zero amount,0` ❌ (amount must be positive)
- Line 21: `2025-12-28,InvalidAmount,Negative amount,-50.00` ❌ (amount must be positive)
- Line 22: `2025-12-27,InvalidAmount,Not a number,ABC` ❌ (amount must be a number)
- Line 23: `2025-12-26,InvalidAmount,Too large,99999999999999.99` ❌ (exceeds max amount)

**Expected:**
- These rows appear in "Invalid" tab
- Errors: "Amount must be positive" or "Amount must be a number" or "Amount too large"

---

### ❌ Missing Required Fields (Lines 24-27)

- Line 24: `2025-12-25,Groceries,Christmas shopping,200.00` ✅ (actually valid)
- Line 25: `2025-12-24,,Missing category,45.00` ❌ (missing category)
- Line 26: `2025-12-23,Dining,,35.00` ✅ (empty description is allowed)
- Line 27: `,Groceries,Missing date,25.00` ❌ (missing date)
- Line 28: `2025-12-22,Transport,Missing amount,` ❌ (missing amount)

**Expected:**
- Invalid rows show in "Invalid" tab
- Errors: "Category is required", "Date is required", "Amount is required"

---

### 🔄 Duplicate Detection (Lines 28-29, 33)

- Line 28: `2025-12-21,Groceries,Duplicate test 1,50.00`
- Line 29: `2025-12-21,Groceries,Duplicate test 2,50.00` (same date, category, amount)
- Line 33: `2026-01-15,Groceries,Weekly shopping at Whole Foods,125.50` (duplicate of line 2)

**Expected:**
- If you've already imported line 28, then line 29 appears in "Duplicates" tab
- If line 2 was imported before, line 33 appears in "Duplicates" tab
- Duplicates show grayed out with same date + category + amount

---

### 💰 Amount Format Variations (Lines 8-10, 37)

- Line 8: `2026-01-09,Dining,Coffee and bagel,$5.50` ($ symbol)
- Line 9: `2026-01-08,Entertainment,Concert tickets,$120.00` ($ symbol)
- Line 10: `2026-01-07,Transport,Gas station,"$50.25"` ($ symbol in quotes)
- Line 37: `2025-12-18,Entertainment,Amount with commas,"1,234.56"` (comma separator)

**Expected:**
- Parser strips `$` and `,` symbols
- All amounts parsed correctly as positive numbers
- Shows in Valid tab (after category mapping)

---

### 📝 Special Characters in Descriptions (Lines 11, 33-36)

- Line 11: `2026-01-06,Groceries,"Groceries with comma, in description",35.75` (comma in description)
- Line 33: `2025-12-20,Dining,"Description with ""quotes""",42.00` (escaped quotes)
- Line 34: `2025-12-19,Transport,"Multi-line description test",30.00` (multiline - may not work perfectly)
- Line 38: `2025-12-17,Groceries,$Symbol in description,25.00` ($ in description)

**Expected:**
- PapaParse handles CSV escaping correctly
- Descriptions appear in preview correctly formatted
- No parsing errors

---

### 📅 Date Edge Cases (Lines 18-19, 30-31)

- Line 18: `2025-12-31,Entertainment,New Year party,150.00` (past date)
- Line 19: `2025-12-30,Dining,Dinner with friends,75.50` (past date)
- Line 30: `2027-01-15,Entertainment,Future date (1+ year),100.00` ❌ (more than 1 year in future)
- Line 31: `2026-06-15,Bills,Future date (valid),80.00` ✅ (within 1 year)

**Expected:**
- Past dates: ✅ Valid
- Future dates within 1 year: ✅ Valid
- Future dates > 1 year: ❌ Invalid ("Date too far in future")

---

## Testing Instructions

### 1. Start the App
```bash
npx expo start
```

### 2. Navigate to Import CSV
1. Open the app
2. Go to "More" tab
3. Tap "Import CSV"

### 3. Select Test File
1. Tap "Choose File"
2. Select `test-import.csv` from your device
3. Wait for parsing to complete

### 4. Review Summary Card
**Expected counts:**
- Valid: ~23 transactions
- Invalid: ~12 rows
- Duplicates: 0-2 (depending on if you've imported before)

### 5. Test Tabs
1. **Valid Tab:**
   - Shows valid transactions
   - Grouped by category
   - Unknown categories highlighted

2. **Invalid Tab:**
   - Click to view
   - Each row shows error reasons
   - Errors are clear and actionable

3. **Duplicates Tab:**
   - Shows duplicate transactions (if any exist in DB)
   - Grayed out appearance

### 6. Test Category Mapping
For each unknown category (Entertainment, Bills, UnmappedCategory1-3):

**Option A: Map to Existing**
1. Select category from dropdown
2. See transactions update with selected category
3. Verify icon and color match

**Option B: Create New**
1. Select "Create New Category"
2. Form expands
3. Edit name (try changing "UnmappedCategory1" to "Utilities")
4. Click icon picker - select different icon
5. Click color picker - select different color
6. Verify preview updates in real-time
7. Verify the category preview at bottom shows correct icon/color

### 7. Test Import Button
1. **Before mapping:** Button should be disabled with gray color
2. **After mapping all:** Button becomes enabled (green)
3. Click "Import X Transactions"
4. Watch progress indicator
5. Verify success message shows correct count

### 8. Verify Imported Data
1. Close modal
2. Go to "Expenses" tab
3. Verify transactions appear with:
   - Correct dates
   - Correct amounts
   - Correct categories (including newly created ones)
   - Correct descriptions

### 9. Test Duplicate Detection (Second Import)
1. Try importing the same file again
2. **Expected:** Most transactions now in "Duplicates" tab
3. Only new transactions (if any) in "Valid" tab

### 10. Test Error Cases

**Empty CSV:**
- Create empty file
- Try to import
- Should show "No data found" error

**Missing Columns:**
- Create CSV with only `Date,Amount`
- Try to import
- Should show "Missing required columns: Category, Description"

**Very Large File:**
- Create CSV with 10,001 rows
- Try to import
- Should show "Too many rows (10001). Maximum is 10,000."

---

## Success Criteria

✅ All valid transactions with existing categories imported successfully
✅ Unknown categories show mapping UI with full customization
✅ Icon picker works and updates preview
✅ Color picker works and updates preview
✅ Category name can be edited
✅ Preview shows real-time updates
✅ Invalid rows correctly identified with clear error messages
✅ Duplicates correctly detected and skipped
✅ Special characters in descriptions handled correctly
✅ Amount formats ($ and ,) parsed correctly
✅ Import progress shown during import
✅ Success message shows correct count
✅ Imported transactions appear in expense list
✅ Second import correctly detects duplicates
✅ Error handling for edge cases works correctly

---

## Expected Issues to Watch For

1. **Multiline descriptions:** May not parse correctly (line 34)
2. **Category name validation:** Ensure new category names don't exceed 20 chars
3. **Icon picker performance:** May be slow on older devices
4. **Duplicate detection accuracy:** Should use date + category + amount hash
5. **Memory usage:** Large files may cause performance issues

---

## Clean Up After Testing

```bash
rm /Users/tim/Documents/BasicBudget/test-import.csv
```

Or keep it for future regression testing!
