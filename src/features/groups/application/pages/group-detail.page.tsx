/*
* Funcionalidad: GroupDetailPage
* Descripción: Staff page /groups/[groupId] (teachers and admins): reads `GET /api/groups/{id}` and shows the group facts and members. When the user can manage the group (admins every group; teachers the student groups the backend lists for them, teacher groups are read-only for teachers) it offers: edit (GroupFormDialog, `PATCH /api/groups/{id}` with only the changed fields), add a member through the student search (`POST /api/groups/{id}/members`, student groups), remove a member (ConfirmDialog, `DELETE /api/groups/{id}/members/{userId}`), assign the simulator leader (ConfirmDialog that says the previous leader stays as a member, `PATCH /api/groups/{id}/lead`) and deactivate / reactivate (`PATCH /api/groups/{id}` with isActive: the contract's explicit deactivation; `DELETE` would erase a group without activity, so it is not offered). Every mutation goes through useGroupMutation (one at a time, refreshes the list, detail, members and mine keys); errors show their specific Spanish message (403 management_forbidden, 409 group_full / student_already_in_group, 422 member_role_not_allowed / leader_not_allowed / lead_not_member) in an alert toast, edit errors inline in the dialog. v1.1 (T11c): admins manage teacher groups too: the member search looks for TEACHER accounts (teacher groups admit teachers and admins; no leader, the backend rejects one with leader_not_allowed) and a "Grupos supervisados" panel (GroupSupervisions) lists, adds (`POST /api/groups/{id}/supervisions`) and removes behind a ConfirmDialog (`DELETE /api/groups/{id}/supervisions/{studentGroupId}`) the student groups it supervises; teachers never see it. The contract has no endpoint that lists the teacher groups supervising a student group for staff, so the student group view shows none (backend gap). v1.2 (T6b): results go to the global design-system toast (useToast) instead of the feature-local FeedbackToast. Depends on MUI, next/head, next/link, @shared/design-system, @shared/session, the groups hooks, components and CSS Module.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import EditIcon from "@mui/icons-material/Edit";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useId, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { toUpdateGroupRequest } from "../../api/mappers/groups.mapper";
import {
  addGroupMember,
  addGroupSupervision,
  removeGroupMember,
  removeGroupSupervision,
  setGroupLeader,
  updateGroup,
} from "../../api/services/groups.service";
import { GroupFormDialog } from "../components/group-form-dialog";
import { GroupInfo } from "../components/group-info";
import { GroupMembers } from "../components/group-members";
import { GroupSupervisions } from "../components/group-supervisions";
import { MemberSearch } from "../components/member-search";
import {
  canManageGroup,
  canManageSupervisions,
  GROUP_TYPE_LABELS,
  memberSearchRole,
  personName,
  toGroupDraft,
} from "../entities/group.entity";
import type { Group, GroupDetail, GroupDraft, GroupMember, GroupSupervision, UserOption } from "../entities/group.entity";
import { getGroupErrorMessage } from "../entities/groups-error-messages";
import { useGroupDetail } from "../hooks/use-group-detail";
import { useGroupMutation } from "../hooks/use-group-mutation";
import styles from "../../UI/group-detail.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: (name: string) => `${name} | Grupos | VentyLab`,
  loadingTitle: "Grupo | VentyLab",
  back: "Volver a grupos",
  loading: "Cargando grupo…",
  loadErrorTitle: "No se pudo cargar el grupo",
  info: "Información del grupo",
  members: "Integrantes",
  addMember: "Agregar integrante",
  edit: "Editar",
  editTitle: "Editar grupo",
  save: "Guardar cambios",
  saved: "Cambios guardados.",
  readOnly: "Solo lectura: no gestionas este grupo.",
  deactivate: "Desactivar grupo",
  deactivateTitle: "¿Desactivar el grupo?",
  deactivateDescription: (name: string) => `«${name}» quedará inactivo. Se conserva su historial y puedes reactivarlo cuando quieras.`,
  deactivateConfirm: "Desactivar",
  deactivated: "El grupo quedó inactivo.",
  reactivate: "Reactivar grupo",
  reactivated: "El grupo está activo de nuevo.",
  removeTitle: (name: string) => `¿Quitar a ${name} del grupo?`,
  removeDescription: (name: string, group: string) => `${name} dejará de pertenecer a «${group}».`,
  removeLeaderNote: " El grupo quedará sin líder del simulador.",
  removeConfirm: "Quitar",
  removed: (name: string) => `${name} ya no pertenece al grupo.`,
  leaderTitle: (name: string) => `¿Hacer líder a ${name}?`,
  leaderDescription: (name: string) => `${name} será el líder del simulador del grupo.`,
  leaderPrevious: (name: string) => ` ${name} dejará de ser líder y seguirá como integrante.`,
  leaderConfirm: "Hacer líder",
  leaderSet: (name: string) => `${name} es ahora el líder del grupo.`,
  added: (name: string) => `${name} se agregó al grupo.`,
  supervisions: "Grupos supervisados",
  supervisionAdded: (name: string) => `«${name}» ahora está supervisado por este grupo.`,
  unsuperviseTitle: (name: string) => `¿Dejar de supervisar «${name}»?`,
  unsuperviseDescription: (teacher: string, student: string) => `«${teacher}» dejará de supervisar a «${student}». Puedes volver a agregar la supervisión cuando quieras.`,
  unsuperviseConfirm: "Quitar supervisión",
  supervisionRemoved: (name: string) => `«${name}» ya no está supervisado por este grupo.`,
} as const;

type PendingConfirm =
  | { kind: "remove", member: GroupMember }
  | { kind: "leader", member: GroupMember }
  | { kind: "unsupervise", supervision: GroupSupervision }
  | { kind: "deactivate" };

type GroupManagementProps = {
  group: GroupDetail
  canManage: boolean
  canSupervise: boolean
};

function confirmCopy(confirm: PendingConfirm, group: GroupDetail) {
  if (confirm.kind === "unsupervise") {
    const student = confirm.supervision.studentGroup.name;

    return {
      title: PAGE_COPY.unsuperviseTitle(student),
      description: PAGE_COPY.unsuperviseDescription(group.name, student),
      confirmLabel: PAGE_COPY.unsuperviseConfirm,
      destructive: true,
    };
  }

  if (confirm.kind === "deactivate") {
    return {
      title: PAGE_COPY.deactivateTitle,
      description: PAGE_COPY.deactivateDescription(group.name),
      confirmLabel: PAGE_COPY.deactivateConfirm,
      destructive: true,
    };
  }

  const name = personName(confirm.member);

  if (confirm.kind === "remove") {
    const leaderNote = confirm.member.memberRole === "LEADER" ? PAGE_COPY.removeLeaderNote : "";

    return {
      title: PAGE_COPY.removeTitle(name),
      description: `${PAGE_COPY.removeDescription(name, group.name)}${leaderNote}`,
      confirmLabel: PAGE_COPY.removeConfirm,
      destructive: true,
    };
  }

  const previous = group.leader && group.leader.id !== confirm.member.userId ? PAGE_COPY.leaderPrevious(personName(group.leader)) : "";

  return {
    title: PAGE_COPY.leaderTitle(name),
    description: `${PAGE_COPY.leaderDescription(name)}${previous}`,
    confirmLabel: PAGE_COPY.leaderConfirm,
    destructive: false,
  };
}

function GroupManagement({ group, canManage, canSupervise }: GroupManagementProps) {
  const { pending, run } = useGroupMutation();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // The last confirmation stays set while the dialog closes, so its text does not vanish mid-transition.
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const infoTitleId = useId();
  const membersTitleId = useId();
  const supervisionsTitleId = useId();
  const isStudentGroup = group.type === "STUDENT";

  const runAction = async(action: () => Promise<unknown>, success: string): Promise<boolean> => {
    const outcome = await run(action);

    if (outcome.status === "busy") {
      return false;
    }

    if (outcome.status === "success") {
      toast.success(success);

      return true;
    }

    toast.error(outcome.message);

    return false;
  };

  const saveEdit = async(draft: GroupDraft) => {
    const changes = toUpdateGroupRequest(draft, group);

    if (Object.keys(changes).length === 0) {
      setEditing(false);

      return;
    }

    setEditError(null);

    const outcome = await run(() => updateGroup(group.id, changes));

    if (outcome.status === "error") {
      setEditError(outcome.message);
    } else if (outcome.status === "success") {
      setEditing(false);
      toast.success(PAGE_COPY.saved);
    }
  };

  const confirmAction = async(current: PendingConfirm) => {
    if (current.kind === "deactivate") {
      await runAction(() => updateGroup(group.id, { isActive: false }), PAGE_COPY.deactivated);
    } else if (current.kind === "unsupervise") {
      const { id, name } = current.supervision.studentGroup;

      await runAction(() => removeGroupSupervision(group.id, id), PAGE_COPY.supervisionRemoved(name));
    } else if (current.kind === "remove") {
      await runAction(() => removeGroupMember(group.id, current.member.userId), PAGE_COPY.removed(personName(current.member)));
    } else {
      await runAction(() => setGroupLeader(group.id, current.member.userId), PAGE_COPY.leaderSet(personName(current.member)));
    }

    setConfirmOpen(false);
  };

  const askConfirm = (next: PendingConfirm) => {
    setConfirm(next);
    setConfirmOpen(true);
  };

  const addMember = (user: UserOption) => {
    void runAction(() => addGroupMember(group.id, user.id), PAGE_COPY.added(personName(user)));
  };

  const addSupervision = (studentGroup: Pick<Group, "id" | "name">) => runAction(
    () => addGroupSupervision(group.id, studentGroup.id),
    PAGE_COPY.supervisionAdded(studentGroup.name),
  );

  const copy = confirm ? confirmCopy(confirm, group) : null;

  return (
    <>
      <section className={cx(styles.card)} aria-labelledby={infoTitleId}>
        <div className={cx(styles.cardHeader)}>
          <h2 id={infoTitleId} className={cx(styles.cardTitle)}>{PAGE_COPY.info}</h2>
          {canManage ? (
            <div className={cx(styles.cardActions)}>
              <Button
                startIcon={<EditIcon />}
                onClick={() => {
                  setEditError(null);
                  setEditing(true);
                }}
                disabled={pending}
              >
                {PAGE_COPY.edit}
              </Button>
              {group.isActive ? (
                <Button color="error" onClick={() => askConfirm({ kind: "deactivate" })} disabled={pending}>
                  {PAGE_COPY.deactivate}
                </Button>
              ) : (
                <Button
                  onClick={() => void runAction(() => updateGroup(group.id, { isActive: true }), PAGE_COPY.reactivated)}
                  disabled={pending}
                >
                  {PAGE_COPY.reactivate}
                </Button>
              )}
            </div>
          ) : null}
        </div>
        {canManage ? null : <Alert severity="info">{PAGE_COPY.readOnly}</Alert>}
        <GroupInfo group={group} />
      </section>
      <section className={cx(styles.card)} aria-labelledby={membersTitleId}>
        <h2 id={membersTitleId} className={cx(styles.cardTitle)}>{`${PAGE_COPY.members} (${group.members.length})`}</h2>
        <GroupMembers
          members={group.members}
          canManage={canManage}
          canLead={isStudentGroup}
          disabled={pending}
          onMakeLeader={(member) => askConfirm({ kind: "leader", member })}
          onRemove={(member) => askConfirm({ kind: "remove", member })}
        />
        {canManage ? (
          <>
            <h3 className={cx(styles.cardTitle)}>{PAGE_COPY.addMember}</h3>
            <MemberSearch members={group.members} role={memberSearchRole(group.type)} disabled={pending} onAdd={addMember} />
          </>
        ) : null}
      </section>
      {canSupervise ? (
        <section className={cx(styles.card)} aria-labelledby={supervisionsTitleId}>
          <h2 id={supervisionsTitleId} className={cx(styles.cardTitle)}>{PAGE_COPY.supervisions}</h2>
          <GroupSupervisions
            teacherGroupId={group.id}
            disabled={pending}
            onAdd={addSupervision}
            onRemove={(supervision) => askConfirm({ kind: "unsupervise", supervision })}
          />
        </section>
      ) : null}
      {editing ? (
        <GroupFormDialog
          title={PAGE_COPY.editTitle}
          submitLabel={PAGE_COPY.save}
          initialDraft={toGroupDraft(group)}
          pending={pending}
          error={editError}
          onSubmit={(draft) => void saveEdit(draft)}
          onCancel={() => setEditing(false)}
        />
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        confirmLabel={copy?.confirmLabel ?? ""}
        destructive={copy?.destructive ?? false}
        isPending={pending}
        onConfirm={() => {
          if (confirm) {
            void confirmAction(confirm);
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

export type GroupDetailPageProps = {
  groupId: string
};

export function GroupDetailPage({ groupId }: GroupDetailPageProps) {
  const { role } = useSession();
  const { group, isLoading, error, reload } = useGroupDetail(groupId);

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{group ? PAGE_COPY.documentTitle(group.name) : PAGE_COPY.loadingTitle}</title>
      </Head>
      <Link href="/groups" className={cx(styles.backLink)}>{PAGE_COPY.back}</Link>
      {group ? (
        <>
          <PageHeader title={group.name} subtitle={`Grupo de ${GROUP_TYPE_LABELS[group.type].toLowerCase()}`} />
          <GroupManagement group={group} canManage={canManageGroup(group, role)} canSupervise={canManageSupervisions(group, role)} />
        </>
      ) : null}
      {!group && isLoading ? <LoadingState label={PAGE_COPY.loading} /> : null}
      {!group && !isLoading && error ? (
        <ErrorState title={PAGE_COPY.loadErrorTitle} description={getGroupErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
