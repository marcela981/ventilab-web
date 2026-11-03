/*
* Funcionalidad: TeachersTable
* Descripción: Table of the Profesores tab of /admin/users with the julio TeachersTab columns: Profesor, Correo, Rol, Grupos asignados (active student groups created or supervised, "Sin grupos" when none) and Estudiantes (distinct students in them). Accessible table: hidden caption, column headers with scope, the teacher name as row header and the server order announced on the Profesor column (aria-sort ascending). Presentational. Depends on @shared/lib and the admin console format and teachers entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { formatCount } from "../entities/admin-format";
import { teacherRoleLabel } from "../entities/admin-teachers.entity";
import type { AdminTeacherRow } from "../entities/admin-teachers.entity";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const TEACHERS_TABLE_COPY = {
  caption: "Profesores y administradores con sus grupos asignados, ordenados por nombre",
  teacher: "Profesor",
  email: "Correo",
  role: "Rol",
  groups: "Grupos asignados",
  students: "Estudiantes",
  noName: "Sin nombre",
  noGroups: "Sin grupos",
} as const;

export function TeachersTable({ rows }: { rows: readonly AdminTeacherRow[] }) {
  return (
    <div className={cx(styles.tableContainer)}>
      <table className={cx(styles.table)}>
        <caption className={cx(styles.visuallyHidden)}>{TEACHERS_TABLE_COPY.caption}</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort="ascending">{TEACHERS_TABLE_COPY.teacher}</th>
            <th scope="col">{TEACHERS_TABLE_COPY.email}</th>
            <th scope="col">{TEACHERS_TABLE_COPY.role}</th>
            <th scope="col">{TEACHERS_TABLE_COPY.groups}</th>
            <th scope="col" className={cx(styles.numeric)}>{TEACHERS_TABLE_COPY.students}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                <span className={cx(styles.userName)}>{row.name?.trim() || TEACHERS_TABLE_COPY.noName}</span>
              </th>
              <td>{row.email}</td>
              <td>{teacherRoleLabel(row.role)}</td>
              <td>
                {row.groups.length > 0
                  ? row.groups.map((group) => group.name).join(", ")
                  : <span className={cx(styles.secondary)}>{TEACHERS_TABLE_COPY.noGroups}</span>}
              </td>
              <td className={cx(styles.numeric)}>{formatCount(row.studentCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
