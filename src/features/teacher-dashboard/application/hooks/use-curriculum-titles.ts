/*
* Funcionalidad: useCurriculumTitles
* Descripción: Reads the curriculum tree (`GET /api/curriculum/tree`) through useApiQuery only to label the section, level and module ids of the analytics and progress endpoints with their titles and curriculum order. While it loads or when it fails the titles are empty and every item keeps a generic title (the progress values never depend on it). Depends on React, @shared/api-client and the teacher dashboard mapper, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toCurriculumTitles } from "../../api/mappers/teacher-dashboard.mapper";
import { CURRICULUM_TREE_PATH } from "../../api/services/teacher-dashboard.service";
import { EMPTY_CURRICULUM_TITLES } from "../entities/curriculum-titles.entity";
import type { CurriculumTitles } from "../entities/curriculum-titles.entity";

export function useCurriculumTitles(): CurriculumTitles {
  const { data } = useApiQuery(CURRICULUM_TREE_PATH);

  return useMemo(() => (data ? toCurriculumTitles(data.data) : EMPTY_CURRICULUM_TITLES), [data]);
}
