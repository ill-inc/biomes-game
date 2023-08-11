import admin from "firebase-admin";

export function getFirebaseAdminApp(): admin.app.App {
  if (!(global as any).firebaseAdminApp) {
    const appInstance =
      admin.apps.length === 0
        ? admin.initializeApp({
            serviceAccountId:
              "zones-backend@zones-cloud.iam.gserviceaccount.com",
            projectId: "zones-cloud",
          })
        : admin.apps[0];
    (global as any).firebaseAdminApp = appInstance;
  }
  return (global as any).firebaseAdminApp as admin.app.App;
}
