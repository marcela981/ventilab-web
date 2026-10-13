/*
* Funcionalidad: Class name joiner
* Descripción: Pure utility that joins CSS Module class names conditionally, skipping falsy values. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type ClassValue = string | false | null | undefined;

export function cx(...classes: ClassValue[]): string {
  return classes.filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}
