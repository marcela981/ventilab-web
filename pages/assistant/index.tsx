/*
* Funcionalidad: AI assistant route
* Descripción: Thin route for /assistant: composes the student layout (RequireAuth + AppShell; every authenticated role may use the assistant) with the AssistantPage of the ai-chat feature (conversation list plus a new chat). After the first send creates a conversation, the screen replaces the URL shallowly with `/assistant/[id]` while keeping this page (`?conversationId=` in the href), so the conversationId is also read from the query. Depends on next/router, @features/ai-chat and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { AssistantPage } from "@features/ai-chat";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const AssistantRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const conversationId = typeof query.conversationId === "string" ? query.conversationId : null;

  return <AssistantPage conversationId={conversationId} />;
};

AssistantRoute.getLayout = withStudentLayout;

export default AssistantRoute;
