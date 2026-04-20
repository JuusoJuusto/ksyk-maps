# Test Parent Creation - Step by Step Guide

## Test Case 1: Create Student with 1 Parent

### Steps:
1. Navigate to Wilma Admin panel
2. Click "Opiskelijat" tab
3. Click "Lisää opiskelija" button
4. Fill in student information:
   - **Etunimi**: Matti
   - **Sukunimi**: Virtanen
   - **Luokka**: 9A
   - **Syntymäaika**: 2010-05-15
   - **Sähköposti**: Click "Luo automaattisesti" (should create matti.virtanen@ksyk.fi)

5. Scroll to "Huoltaja 1" section:
   - **Etunimi**: Maria
   - **Sukunimi**: Virtanen
   - **Sähköposti**: maria.virtanen@email.fi
   - **Puhelin**: +358 40 123 4567
   - **Suhde**: Äiti / Mother

6. Click "Luo opiskelija"

### Expected Results:
✅ Success message: "Opiskelija luotu onnistuneesti! Huoltajat luotu automaattisesti."
✅ Redirected to students list
✅ Matti Virtanen appears in student list
✅ Under Matti's card, you see:
   ```
   Huoltajat:
   • Maria Virtanen
   ```
✅ Click "Huoltajat" tab
✅ Maria Virtanen appears in parents list
✅ Shows "1 opiskelijaa linkitetty"

### Console Logs to Check:
```
✅ Parent 1 created: [parent-id]
💾 Saving to Firebase: [student data with parent1Id]
✅ Wilma user saved successfully with ID: [student-id]
```

---

## Test Case 2: Create Student with 2 Parents

### Steps:
1. Click "Lisää opiskelija" again
2. Fill in student information:
   - **Etunimi**: Liisa
   - **Sukunimi**: Korhonen
   - **Luokka**: 8B
   - **Syntymäaika**: 2011-08-22

3. Fill in Huoltaja 1:
   - **Etunimi**: Anna
   - **Sukunimi**: Korhonen
   - **Sähköposti**: anna.korhonen@email.fi
   - **Puhelin**: +358 50 234 5678
   - **Suhde**: Äiti / Mother

4. Check "Lisää toinen huoltaja" checkbox

5. Fill in Huoltaja 2:
   - **Etunimi**: Pekka
   - **Sukunimi**: Korhonen
   - **Sähköposti**: pekka.korhonen@email.fi
   - **Puhelin**: +358 50 345 6789
   - **Suhde**: Isä / Father

6. Click "Luo opiskelija"

### Expected Results:
✅ Success message appears
✅ Liisa Korhonen appears in student list
✅ Under Liisa's card:
   ```
   Huoltajat:
   • Anna Korhonen
   • Pekka Korhonen
   ```
✅ In "Huoltajat" tab:
   - Anna Korhonen (1 opiskelijaa linkitetty)
   - Pekka Korhonen (1 opiskelijaa linkitetty)

### Console Logs:
```
✅ Parent 1 created: [parent1-id]
✅ Parent 2 created: [parent2-id]
💾 Saving to Firebase: [student data with both parent IDs]
```

---

## Test Case 3: Reuse Existing Parent

### Steps:
1. Create another student (Mikko Virtanen)
2. Use same parent email: maria.virtanen@email.fi
3. Click "Luo opiskelija"

### Expected Results:
✅ Success message appears
✅ Mikko Virtanen appears in student list
✅ Under Mikko's card:
   ```
   Huoltajat:
   • Maria Virtanen
   ```
✅ In "Huoltajat" tab:
   - Maria Virtanen now shows "2 opiskelijaa linkitetty"
✅ NO duplicate Maria Virtanen created

### Console Logs:
```
✅ Parent 1 already exists: [existing-parent-id]
💾 Saving to Firebase: [student data with existing parent1Id]
```

---

## Test Case 4: Bulk Email Send

### Steps:
1. Go to "Opiskelijat" tab
2. Click green "Lähetä sähköpostit" button
3. Confirm in dialog
4. Wait for completion

### Expected Results:
✅ Success message: "Lähetetty X sähköpostia! Epäonnistui: 0"
✅ Check student email inbox:
   - Subject: "Your Wilma Login Credentials - KSYK Maps"
   - Contains username and password
   - Contains login URL
✅ Check parent email inbox:
   - Same email CC'd to parents
   - Contains student's credentials

### Console Logs:
```
📧 Bulk email send requested
✅ Email sent to matti.virtanen@ksyk.fi
✅ Email sent to liisa.korhonen@ksyk.fi
📊 Bulk email complete: 2 sent, 0 failed
```

---

## Test Case 5: Edit Student and Update Parent

### Steps:
1. Click "Muokkaa" on Matti Virtanen
2. Change parent phone number
3. Click "Päivitä opiskelija"

### Expected Results:
✅ Success message appears
✅ Parent phone number updated
✅ Student card shows updated info

---

## Troubleshooting

### If parents don't appear:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify Firebase connection
4. Check if parent role is set correctly

### If emails don't send:
1. Check email service configuration
2. Verify SMTP settings
3. Check if `isTemporaryPassword` is true
4. Verify email addresses are valid

### If duplicate parents are created:
1. Check if email matching logic is working
2. Verify parent query returns existing parents
3. Check console logs for "already exists" message

---

## Database Verification

### Check Firebase Console:
1. Go to Firestore
2. Navigate to `wilmaUsers/students/list`
3. Find created student
4. Verify fields:
   - `parent1Id` is set
   - `parent2Id` is set (if 2 parents)
   - `parent1FirstName` is set
   - `parent1Email` is set

5. Navigate to `wilmaUsers/parents/list`
6. Find created parents
7. Verify fields:
   - `role` = "parent"
   - `isActive` = true
   - `isTemporaryPassword` = true
   - `email` matches student's parent email

---

## Success Criteria

All tests pass if:
- ✅ Parents are created automatically
- ✅ Parents appear in "Huoltajat" tab
- ✅ Parent names show under student cards
- ✅ Existing parents are reused (no duplicates)
- ✅ Bulk emails send successfully
- ✅ Parent info updates correctly
- ✅ No console errors
- ✅ No server errors
- ✅ Mobile responsive works
- ✅ All text is in Finnish

---

**Ready to test!** 🚀
