/*
* Funcionalidad: E2E sign-in setup
* Descripción: Setup project of Playwright: signs the student in once through the login form and saves the browser storage (tokens in localStorage) to e2e/.auth/student.json, which the e2e and perf projects reuse. Depends on @playwright/test and the auth helpers. v0.2 (W12, Bloque 1): also saves the group member (member.json) and the teacher (teacher.json), and skips a sign-in while its saved session is recent, so repeated runs stay under the backend limit of 5 sign-ins per minute.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { test as setup } from "@playwright/test";
import {
  type Credentials,
  isRecentStorageState,
  MEMBER_CREDENTIALS,
  MEMBER_STORAGE_STATE,
  signIn,
  STUDENT_CREDENTIALS,
  STUDENT_STORAGE_STATE,
  TEACHER_CREDENTIALS,
  TEACHER_STORAGE_STATE,
} from "./auth";

const ACCOUNTS: readonly { role: string, credentials: Credentials, path: string }[] = [
  { role: "student", credentials: STUDENT_CREDENTIALS, path: STUDENT_STORAGE_STATE },
  { role: "group member", credentials: MEMBER_CREDENTIALS, path: MEMBER_STORAGE_STATE },
  { role: "teacher", credentials: TEACHER_CREDENTIALS, path: TEACHER_STORAGE_STATE },
];

for (const account of ACCOUNTS) {
  setup(`sign in as ${account.role}`, async ({ page }) => {
    setup.skip(isRecentStorageState(account.path), `reusing ${account.path}`);
    await signIn(page, account.credentials);
    await page.context().storageState({ path: account.path });
  });
}
