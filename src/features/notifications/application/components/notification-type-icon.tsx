/*
* Funcionalidad: NotificationTypeIcon
* Descripción: Decorative icon of a notification by type (reservation preempted or cancelled, evaluation activated, grade published, feedback ready, role changed, ventilator offline); an unknown type gets the generic bell. aria-hidden: the title carries the meaning. Depends on the MUI icons.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import GradingOutlinedIcon from "@mui/icons-material/GradingOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PortableWifiOffIcon from "@mui/icons-material/PortableWifiOff";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

const TYPE_ICONS: Readonly<Record<string, SvgIconComponent>> = {
  RESERVATION_PREEMPTED: EventBusyOutlinedIcon,
  RESERVATION_CANCELLED: EventBusyOutlinedIcon,
  EVALUATION_ACTIVATED: AssignmentOutlinedIcon,
  GRADE_PUBLISHED: GradingOutlinedIcon,
  FEEDBACK_READY: RateReviewOutlinedIcon,
  ROLE_CHANGED: ManageAccountsOutlinedIcon,
  VENTILATOR_OFFLINE: PortableWifiOffIcon,
};

export type NotificationTypeIconProps = {
  type: string
};

export function NotificationTypeIcon({ type }: NotificationTypeIconProps) {
  const Icon = Object.prototype.hasOwnProperty.call(TYPE_ICONS, type) ? TYPE_ICONS[type] ?? NotificationsNoneIcon : NotificationsNoneIcon;

  return <Icon fontSize="small" aria-hidden="true" />;
}
