/*
* Funcionalidad: AI assistant conversation route
* Descripción: Thin route for /assistant/[conversationId]: composes the student layout (RequireAuth + AppShell, which waits for router.isReady; every authenticated role may use the assistant) with the AssistantPage of the ai-chat feature for the conversationId of the URL. A missing conversation or one of another user renders the not-found view of the screen. Depends on next/router, @features/ai-chat and @shared/layouts/student-layout.
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

const AssistantConversationRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const conversationId = typeof query.conversationId === "string" ? query.conversationId : null;

  return conversationId ? <AssistantPage conversationId={conversationId} /> : null;
};

AssistantConversationRoute.getLayout = withStudentLayout;

export default AssistantConversationRoute;
