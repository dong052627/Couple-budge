import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  addDoc,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ExpenseItem, CategoryType } from './types';

// Symmetrical, safe initializations
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Strict Error Handling based on the Firestore Integration guidelines
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection for diagnostics
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}

// 1. Google Authentication with Popups
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  // Request profile and email scopes
  provider.addScope('profile');
  provider.addScope('email');
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Core Auth Error:', error);
    throw error;
  }
}

// 2. Sign Out
export async function logoutUser() {
  await signOut(auth);
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  myCode: string;
  partnerCode: string;
  partnerUid: string;
  partnerName: string;
  status: 'unbound' | 'binding' | 'bound';
  spaceId: string;
  transferredAmount?: number;
}

// Helper: generate 6 chars code of structure LOVE-XXXX
function generateInviteCode(): string {
  const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // human-readable, no confusing O/0, I/1
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += pool.charAt(Math.floor(Math.random() * pool.length));
  }
  return `LOVE-${code}`;
}

// Sync logged-in auth user setup
export async function ensureUserProfileExists(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  try {
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      return existingSnap.data() as UserProfile;
    }

    // Create fresh profile
    const name = user.displayName || user.email?.split('@')[0] || '共同成員';
    const profileData: UserProfile = {
      uid: user.uid,
      displayName: name,
      photoURL: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      email: user.email || '',
      myCode: generateInviteCode(),
      partnerCode: '',
      partnerUid: '',
      partnerName: '',
      status: 'unbound',
      spaceId: '',
      transferredAmount: 0,
    };

    await setDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });

    return profileData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Bind with partner code
export async function submitPartnerInviteCode(
  currentUserProfile: UserProfile,
  inputCode: string
): Promise<{ success: boolean; message: string; codeMatchedProfile?: any }> {
  const cleanCode = inputCode.trim().toUpperCase();
  if (cleanCode === currentUserProfile.myCode) {
    return { success: false, message: '不能輸入您自己的邀請碼喔！請輸入另一半的。' };
  }

  try {
    // 1. Check if ANY user matches this direct code
    const usersColl = collection(db, 'users');
    const q = query(usersColl, where('myCode', '==', cleanCode));
    const snap = await getDoc(doc(db, 'users', 'dummy')); // trigger read constraint test but query is standard
    
    // Perform standard search query
    const searchRef = await onSnapshotQueryToPromise(q);
    if (searchRef.empty) {
      return { success: false, message: '找不到此邀請金鑰，請確認對方的金鑰。' };
    }

    const partnerDoc = searchRef.docs[0];
    const partnerData = partnerDoc.data() as UserProfile;

    // 2. Check if mutual pairing is already successful
    const myRef = doc(db, 'users', currentUserProfile.uid);
    const symmetricSpaceId = [currentUserProfile.uid, partnerData.uid].sort().join('_');

    if (partnerData.partnerCode === currentUserProfile.myCode) {
      // Mutual alignment successfully triggered! Both are bound!
      await updateDoc(myRef, {
        partnerCode: cleanCode,
        partnerUid: partnerData.uid,
        partnerName: partnerData.displayName,
        status: 'bound',
        spaceId: symmetricSpaceId,
        updatedAt: serverTimestamp(),
      });

      // Symmetric auto-sync: we can also update partner document directly to bound
      const partnerRef = doc(db, 'users', partnerData.uid);
      await updateDoc(partnerRef, {
        partnerCode: currentUserProfile.myCode,
        partnerUid: currentUserProfile.uid,
        partnerName: currentUserProfile.displayName,
        status: 'bound',
        spaceId: symmetricSpaceId,
        updatedAt: serverTimestamp(),
      });

      return { success: true, message: '🎉 恭喜！雙方互相配對成功，已同步開通記帳空間！' };
    } else {
      // Half-bind: We register entering their code, but we must await their entry
      await updateDoc(myRef, {
        partnerCode: cleanCode,
        partnerUid: partnerData.uid,
        partnerName: partnerData.displayName,
        status: 'binding',
        updatedAt: serverTimestamp(),
      });

      return { success: true, message: '⏳ 已送出綁定申請！正等候另一半貼上您的金鑰進行對齊。' };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${currentUserProfile.uid}`);
    return { success: false, message: '綁定過程發生錯誤：' + (error instanceof Error ? error.message : String(error)) };
  }
}

// Internal query resolver to promise
function onSnapshotQueryToPromise(q: any): Promise<any> {
  return new Promise((resolve) => {
    const unsubscribe = onSnapshot(q, (snapshot) => {
      resolve(snapshot);
      unsubscribe();
    }, () => {
      resolve({ empty: true, docs: [] });
      unsubscribe();
    });
  });
}

// 4. Expense Live Subscriptions
export function listenToExpenses(
  spaceId: string,
  onUpdate: (items: ExpenseItem[]) => void,
  onError: (err: Error) => void
) {
  const expenseColl = collection(db, 'expenses');
  const uid = auth.currentUser?.uid || '';
  const q = query(
    expenseColl,
    where('participants', 'array-contains', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ExpenseItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.spaceId === spaceId) {
          items.push({
            id: d.id,
            category: d.category as CategoryType,
            amount: d.amount,
            payer: d.payerName,
            date: d.date,
            note: d.note,
            split: {
              type: d.splitType,
              fullBearer: d.fullBearerName,
              customShares: d.customShares,
            },
          });
        }
      });

      // Sort in-memory: date descending, then id descending
      items.sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (b.id || '').localeCompare(a.id || '');
      });

      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'expenses');
      onError(error);
    }
  );
}

// 5. Create Expense Item in Firestore
export async function createFirestoreExpense(
  spaceId: string,
  partnerUid: string,
  item: Omit<ExpenseItem, 'id'>
) {
  const expenseColl = collection(db, 'expenses');
  const path = 'expenses';
  const newRef = doc(expenseColl); // auto-generate document ID path
  const authUid = auth.currentUser?.uid;

  if (!authUid) throw new Error('Auth state is null when adding records.');

  const payload = {
    id: newRef.id,
    spaceId,
    category: item.category,
    amount: item.amount,
    payerId: authUid, // Default current auth as payer
    payerName: item.payer, // mapped directly
    date: item.date,
    note: item.note,
    splitType: item.split.type,
    fullBearerId: item.split.fullBearer === item.payer ? authUid : (partnerUid || null),
    fullBearerName: item.split.fullBearer || '',
    customShares: item.split.customShares || null,
    participants: partnerUid ? [authUid, partnerUid].sort() : [authUid], // Important for list query protection: size 1 if unbound, size 2 if bound.
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(newRef, payload);
    return newRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// 6. Delete Expense Item from Firestore
export async function deleteFirestoreExpense(id: string) {
  const path = `expenses/${id}`;
  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// 7. Merge prior unbound individual expenses into the joint space
export async function mergeUnboundExpenses(myUid: string, jointSpaceId: string, partnerUid: string): Promise<number> {
  const expenseColl = collection(db, 'expenses');
  const q = query(
    expenseColl,
    where('participants', 'array-contains', myUid)
  );
  const participants = [myUid, partnerUid].sort();

  try {
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    let mergedCount = 0;
    for (const d of snap.docs) {
      const data = d.data();
      if (data.spaceId === myUid) {
        const docRef = doc(db, 'expenses', d.id);
        await updateDoc(docRef, {
          spaceId: jointSpaceId,
          participants: participants,
          updatedAt: serverTimestamp()
        });
        mergedCount++;
      }
    }
    return mergedCount;
  } catch (error) {
    console.error("Failed to merge unbound expenses:", error);
    throw error;
  }
}

// 8. Unbind partner relationship
export async function unbindPartner(currentUserProfile: UserProfile): Promise<{ success: boolean; message: string }> {
  const myUid = currentUserProfile.uid;
  const partnerUid = currentUserProfile.partnerUid;

  try {
    // 1. Reset my own profile relationship status
    const myRef = doc(db, 'users', myUid);
    await updateDoc(myRef, {
      partnerCode: '',
      partnerUid: '',
      partnerName: '',
      status: 'unbound',
      spaceId: '',
      updatedAt: serverTimestamp(),
    });

    // 2. Clear partner profile relationship symmetrically if it exists
    if (partnerUid) {
      const partnerRef = doc(db, 'users', partnerUid);
      try {
        await updateDoc(partnerRef, {
          partnerCode: '',
          partnerUid: '',
          partnerName: '',
          status: 'unbound',
          spaceId: '',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        // If partner update fails (e.g. permission or they already unbound), log and continue
        console.warn('Partner document reset skipped or failed: ', err);
      }
    }

    return { success: true, message: '💔 伴侶關係已成功解除！' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${myUid}`);
    return { success: false, message: '解除綁定時發生錯誤：' + (error instanceof Error ? error.message : String(error)) };
  }
}

// 9. Setup Mock Partner for sandbox testing
export async function setupMockPartner(currentUserProfile: UserProfile): Promise<{ success: boolean; message: string }> {
  const myUid = currentUserProfile.uid;
  const mockUid = `mock-partner-${myUid}`;
  const symmetricSpaceId = [myUid, mockUid].sort().join('_');
  const mockCode = 'LOVE-MOCK';

  try {
    // 1. Create mock partner profile document in users collection
    const mockRef = doc(db, 'users', mockUid);
    const mockData: UserProfile = {
      uid: mockUid,
      displayName: '小可 (測試伴侶)',
      photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
      email: 'mock.partner@example.com',
      myCode: mockCode,
      partnerCode: currentUserProfile.myCode,
      partnerUid: myUid,
      partnerName: currentUserProfile.displayName,
      status: 'bound',
      spaceId: symmetricSpaceId,
      transferredAmount: 0,
    };

    await setDoc(mockRef, {
      ...mockData,
      updatedAt: serverTimestamp(),
    });

    // 2. Symmetrically update current user profile
    const myRef = doc(db, 'users', myUid);
    await updateDoc(myRef, {
      partnerCode: mockCode,
      partnerUid: mockUid,
      partnerName: '小可 (測試伴侶)',
      status: 'bound',
      spaceId: symmetricSpaceId,
      transferredAmount: 0,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: '🎉 成功建立模擬伴侶「小可」，已自動完成雙向綁定！' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${mockUid}`);
    return { success: false, message: '建立模擬伴侶時發生錯誤：' + (error instanceof Error ? error.message : String(error)) };
  }
}

// 10. Update transferred/handed over amount for active space
export async function updateTransferredAmount(
  currentUserProfile: UserProfile,
  amount: number
): Promise<void> {
  const myUid = currentUserProfile.uid;
  const partnerUid = currentUserProfile.partnerUid;

  try {
    // 1. Update my own profile
    const myRef = doc(db, 'users', myUid);
    await updateDoc(myRef, {
      transferredAmount: amount,
      updatedAt: serverTimestamp(),
    });

    // 2. Symmetrically update partner profile if bound
    if (partnerUid) {
      const partnerRef = doc(db, 'users', partnerUid);
      try {
        await updateDoc(partnerRef, {
          transferredAmount: amount,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Partner document transfer amount update skipped or failed: ', err);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${myUid}`);
    throw error;
  }
}

