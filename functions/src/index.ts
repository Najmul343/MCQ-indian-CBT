import * as functions from 'firebase-functions/v1';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/**
 * 1. onUserCreate - Auth trigger
 * Sets default claim { role: 'student' } for new users.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const customClaims = {
    role: 'student',
    tenant_id: null
  };

  try {
    await auth.setCustomUserClaims(user.uid, customClaims);
    console.log(`Default student custom claims set for user ${user.uid}`);
  } catch (error) {
    console.error('Error setting custom claims in onUserCreate:', error);
  }
});

/**
 * 2. redeemJoinCode - Callable Function
 * Student/teacher submits a join_code -> server looks up Tenant in Firestore,
 * sets custom claims { role, tenant_id }, and updates the user document.
 */
export const redeemJoinCode = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to redeem join code.');
  }

  const join_code = data?.join_code;
  if (!join_code || typeof join_code !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Valid join_code is required.');
  }

  const uid = context.auth.uid;
  const normalizedCode = join_code.trim().toUpperCase();

  // Search tenants by student_join_code or teacher_join_code
  const tenantSnap = await db.collection('tenants').get();
  let matchedTenant: any = null;
  let assignedRole: 'student' | 'teacher' = 'student';

  tenantSnap.forEach((doc) => {
    const tData = doc.data();
    if (tData.student_join_code && tData.student_join_code.toUpperCase() === normalizedCode) {
      matchedTenant = tData;
      assignedRole = 'student';
    } else if (tData.teacher_join_code && tData.teacher_join_code.toUpperCase() === normalizedCode) {
      matchedTenant = tData;
      assignedRole = 'teacher';
    }
  });

  if (!matchedTenant) {
    throw new functions.https.HttpsError('not-found', 'Invalid join code. Please check and try again.');
  }

  const tenantId = matchedTenant.tenant_id;
  const tenantName = matchedTenant.name;

  // Set Auth Custom Claims
  await auth.setCustomUserClaims(uid, {
    role: assignedRole,
    tenant_id: tenantId
  });

  // Update Firestore user doc
  await db.collection('users').doc(uid).set({
    tenant_id: tenantId,
    tenant_name: tenantName,
    role: assignedRole,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return {
    success: true,
    tenant_id: tenantId,
    tenant_name: tenantName,
    role: assignedRole,
    message: `Successfully joined ${tenantName} as ${assignedRole}.`
  };
});

/**
 * 3. assignRole - Callable Function (principal / super_admin only)
 * Sets custom claims and updates user document server-side.
 */
export const assignRole = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const callerRole = context.auth.token.role;
  const callerTenant = context.auth.token.tenant_id;

  const targetUid = data?.targetUid;
  const role = data?.role;
  const tenantId = data?.tenantId;

  if (!targetUid || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUid and role are required.');
  }

  // Authorization checks
  if (callerRole === 'super_admin') {
    // Super admin can assign any role and tenant
  } else if (callerRole === 'principal') {
    if (callerTenant !== tenantId) {
      throw new functions.https.HttpsError('permission-denied', 'Principals can only manage users within their own tenant.');
    }
    if (role !== 'teacher' && role !== 'student') {
      throw new functions.https.HttpsError('permission-denied', 'Principals can only assign teacher or student roles.');
    }
  } else {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions to assign role.');
  }

  await auth.setCustomUserClaims(targetUid, {
    role,
    tenant_id: tenantId || null
  });

  await db.collection('users').doc(targetUid).set({
    role,
    tenant_id: tenantId || null,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return { success: true, targetUid, role, tenantId };
});

/**
 * 4. submitTestAttempt - Callable Function
 * Client sends { test_id, responses, time_taken } only.
 * Server re-fetches test and questions, calculates score/percentage, and writes attempt.
 */
export const submitTestAttempt = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to submit test attempt.');
  }

  const test_id = data?.test_id;
  const responses = data?.responses;
  const time_taken_seconds = data?.time_taken_seconds;

  if (!test_id || !responses) {
    throw new functions.https.HttpsError('invalid-argument', 'test_id and responses are required.');
  }

  const uid = context.auth.uid;
  const userSnap = await db.collection('users').doc(uid).get();
  const userData = userSnap.data() || {};

  // Fetch test document
  const testSnap = await db.collection('tests').doc(test_id).get();
  if (!testSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Test not found.');
  }

  const testData = testSnap.data() as any;
  const questionIds: string[] = testData.question_ids || [];

  // Fetch test questions
  let questions: any[] = [];
  if (testData.questions && testData.questions.length > 0) {
    questions = testData.questions;
  } else if (questionIds.length > 0) {
    const qRefs = questionIds.map((id) => db.collection('questions').doc(id));
    const qSnaps = await db.getAll(...qRefs);
    questions = qSnaps.filter((s) => s.exists).map((s) => ({ question_id: s.id, ...s.data() }));
  }

  // Calculate score server-side
  let score = 0;
  let totalMarks = 0;

  questions.forEach((q) => {
    const pts = q.points || 1;
    totalMarks += pts;
    const userSelected = responses[q.question_id];
    if (userSelected !== undefined && userSelected === q.correct_option) {
      score += pts;
    } else if (userSelected !== undefined && q.negative_marks) {
      score -= q.negative_marks;
    }
  });

  score = Math.max(0, score);
  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
  const status = percentage >= (testData.passing_marks || 40) ? 'PASS' : 'FAIL';

  const attemptId = `attempt_${test_id}_${uid}_${Date.now()}`;
  const attemptDoc = {
    attempt_id: attemptId,
    tenant_id: testData.tenant_id || userData.tenant_id || 'global',
    test_id,
    test_title: testData.title,
    student_id: uid,
    student_name: userData.name || context.auth.token.name || 'Student',
    student_email: userData.email || context.auth.token.email || '',
    roll_no: userData.rollNo || 'N/A',
    trade: userData.trade || 'General',
    score,
    total_marks: totalMarks,
    percentage,
    status,
    time_taken_seconds: time_taken_seconds || 0,
    submitted_at: new Date().toISOString(),
    responses
  };

  await db.collection('test_attempts').doc(attemptId).set(attemptDoc);

  return {
    success: true,
    attempt_id: attemptId,
    score,
    total_marks: totalMarks,
    percentage,
    status
  };
});

/**
 * 5. bulkImportUsers - Callable Function (principal only)
 * Creates users + sets join instructions, respecting tenant limits.
 */
export const bulkImportUsers = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const callerRole = context.auth.token.role;
  const callerTenant = context.auth.token.tenant_id;

  const tenant_id = data?.tenant_id;
  const users = data?.users;

  if (!tenant_id || !Array.isArray(users)) {
    throw new functions.https.HttpsError('invalid-argument', 'tenant_id and user array required.');
  }

  if (callerRole !== 'super_admin' && (callerRole !== 'principal' || callerTenant !== tenant_id)) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized to bulk import users for this tenant.');
  }

  // Check tenant limits
  const tenantSnap = await db.collection('tenants').doc(tenant_id).get();
  const tenantData = tenantSnap.data() || {};
  const maxStudents = tenantData.max_students || 500;

  const existingUsersSnap = await db.collection('users').where('tenant_id', '==', tenant_id).get();
  const currentCount = existingUsersSnap.size;

  if (currentCount + users.length > maxStudents) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Bulk import exceeds tenant limit (${maxStudents} max students). Current: ${currentCount}.`
    );
  }

  let createdCount = 0;
  for (const u of users) {
    const userDocId = u.uid || `imported_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('users').doc(userDocId).set({
      ...u,
      tenant_id,
      tenant_name: tenantData.name || 'Institute',
      role: u.role || 'student',
      status: 'active',
      createdAt: new Date().toISOString()
    }, { merge: true });

    createdCount++;
  }

  return { success: true, count: createdCount, message: `Successfully imported ${createdCount} users.` };
});

/**
 * 6. impersonate - Callable Function (Ghost Mode, super_admin only)
 * Mints custom token for targetUid using auth.createCustomToken(targetUid).
 */
export const impersonate = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const callerRole = context.auth.token.role;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super_admin can enter Ghost Mode.');
  }

  const targetUid = data?.targetUid;
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUid is required.');
  }

  const customToken = await auth.createCustomToken(targetUid, {
    impersonatedBy: context.auth.uid
  });

  return {
    success: true,
    targetUid,
    customToken
  };
});
