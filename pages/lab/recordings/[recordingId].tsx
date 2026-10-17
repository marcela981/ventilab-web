/*
* Funcionalidad: Lab recording playback route
* Descripción: Thin route for /lab/recordings/[recordingId] (recordingId = reservation id): composes the student layout with the LabRecordingPage of the ventilator-lab feature, keyed by the id. The console and the player are lazy loaded by the page, so this route chunk does not statically include the shared ventilator console. Depends on next/router, @features/ventilator-lab and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { LabRecordingPage } from "@features/ventilator-lab";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LabRecordingRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const recordingId = typeof query.recordingId === "string" ? query.recordingId : null;

  return recordingId ? <LabRecordingPage key={recordingId} recordingId={recordingId} /> : null;
};

LabRecordingRoute.getLayout = withStudentLayout;

export default LabRecordingRoute;
