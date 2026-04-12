import { getAdminAuth, getAdminDb } from "../server/firebase-admin.mjs";

const DEFAULT_PASSWORD = "Tpo@1234";

const TPO_ACCOUNTS = [
  {
    email: "tpo.vnit@example.com",
    name: "VNIT TPO",
    managedCollegeName: "VNIT",
  },
  {
    email: "tpo.nitp@example.com",
    name: "NIT Patna TPO",
    managedCollegeName: "NIT Patna",
  },
  {
    email: "tpo.nitw@example.com",
    name: "NIT Warangal TPO",
    managedCollegeName: "NIT Warangal",
  },
  {
    email: "tpo.vjti@example.com",
    name: "VJTI TPO",
    managedCollegeName: "VJTI Mumbai",
  },
  {
    email: "tpo.bits@example.com",
    name: "BITS Pilani TPO",
    managedCollegeName: "BITS Pilani",
  },
];

async function upsertTpoAccount({ email, name, managedCollegeName }) {
  const auth = getAdminAuth();
  const db = getAdminDb();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (err) {
    if (String(err?.code || "") === "auth/user-not-found") {
      userRecord = await auth.createUser({
        email,
        password: DEFAULT_PASSWORD,
        displayName: name,
      });
    } else {
      throw err;
    }
  }

  await db.collection("users").doc(userRecord.uid).set(
    {
      email,
      name,
      role: "tpo",
      managedCollegeName,
      collegeName: managedCollegeName,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  return userRecord.uid;
}

async function run() {
  console.log("Creating TPO accounts...");
  for (const account of TPO_ACCOUNTS) {
    const uid = await upsertTpoAccount(account);
    console.log(`Created/updated ${account.email} -> ${uid}`);
  }
  console.log("Done. Default password:", DEFAULT_PASSWORD);
}

run().catch((err) => {
  console.error("Failed to create TPO accounts:", err);
  process.exit(1);
});
